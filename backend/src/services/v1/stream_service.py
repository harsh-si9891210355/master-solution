import asyncio
import logging
from datetime import datetime, timedelta
from urllib.parse import urlencode

import httpx
from sqlalchemy.orm import Session

from src.core.config import settings
from src.crud.camera import get_all_cameras

logger = logging.getLogger(__name__)


class StreamService:
    def _stream_config(self) -> dict:
        return {
            "recording_poll_interval_ms": settings.stream_recording_poll_interval_ms,
            "live_edge_threshold_s": settings.stream_live_edge_threshold_s,
            "playback_format": settings.stream_playback_format,
            "playback_padding_before_s": settings.stream_playback_padding_before_s,
            "playback_padding_after_s": settings.stream_playback_padding_after_s,
            "playback_min_duration_s": settings.stream_playback_min_duration_s,
            "playback_max_duration_s": settings.stream_playback_max_duration_s,
        }

    def _join_public_url(self, base_url: str, path: str) -> str:
        return f"{base_url.rstrip('/')}/{path.lstrip('/')}"

    def _path_name(self, camera_id: int) -> str:
        """Live path — full-quality source, served over WebRTC."""
        return f"camera-{camera_id}"

    def _rec_path_name(self, camera_id: int) -> str:
        """Reduced-quality sibling path that FFmpeg publishes to and MediaMTX records."""
        return f"camera-{camera_id}-rec"

    def _rec_mode(self, substream_url: str | None) -> str:
        """How recordings are produced for a camera:
        - "off":       live-only — nothing is recorded or stored
        - "substream": record the camera's low-quality substream directly (no FFmpeg)
        - "transcode": FFmpeg downscales the main stream into the -rec sibling
        - "direct":    record the main stream as-is at full quality
        """
        if not settings.rec_store_enabled:
            return "off"
        if substream_url and settings.rec_prefer_substream:
            return "substream"
        if settings.rec_transcode_enabled:
            return "transcode"
        return "direct"

    def _recording_path_name(self, camera_id: int, substream_url: str | None = None) -> str:
        """Path that actually holds recordings used for playback."""
        if self._rec_mode(substream_url) in ("substream", "transcode"):
            return self._rec_path_name(camera_id)
        return self._path_name(camera_id)

    # -- FFmpeg transcode command ---------------------------------------------
    def _build_record_command(self, path_name: str) -> str:
        """FFmpeg command (run via the live path's runOnReady) that reads the
        full-quality live path, downscales / re-encodes it per the REC_* config,
        and republishes it to the recorded sibling path."""
        src = f"rtsp://localhost:8554/{path_name}"
        dst = f"rtsp://localhost:8554/{path_name}-rec"

        filters = [f"scale=-2:{settings.rec_height}"]
        if settings.rec_fps and settings.rec_fps > 0:
            filters.append(f"fps={settings.rec_fps}")

        if settings.rec_encoder.lower() == "nvenc":
            video_enc = ["-c:v", "h264_nvenc", "-preset", "p4", "-tune", "ll"]
        else:
            video_enc = ["-c:v", "libx264", "-preset", "veryfast", "-tune", "zerolatency"]

        cmd = [
            "ffmpeg", "-nostdin", "-loglevel", "warning",
            # Stamp incoming frames with the system wall-clock so the republished
            # stream's timestamps track absolute time. Without this the re-encoder's
            # startup PTS drift from real time, and MediaMTX's recorder detects
            # "drift between recording duration and absolute time" and resets ~5s in,
            # producing a throwaway 5s first segment before the real one.
            "-use_wallclock_as_timestamps", "1",
            "-rtsp_transport", "tcp", "-i", src,
            "-an",                              # drop audio
            "-vf", ",".join(filters),
            *video_enc,
            "-g", "50",
            "-pix_fmt", "yuv420p",
        ]
        if settings.rec_video_bitrate:
            br = settings.rec_video_bitrate
            cmd += ["-b:v", br, "-maxrate", br, "-bufsize", br]
        if settings.rec_extra_ffmpeg_flags:
            cmd += settings.rec_extra_ffmpeg_flags.split()
        cmd += ["-f", "rtsp", "-rtsp_transport", "tcp", dst]
        return " ".join(cmd)

    # -- MediaMTX path payloads -----------------------------------------------
    def _record_settings(self) -> dict:
        return {
            "record": True,
            "recordPath": settings.rec_record_path,
            "recordFormat": settings.rec_record_format,
            "recordPartDuration": settings.rec_part_duration,
            "recordSegmentDuration": settings.rec_segment_duration,
            "recordDeleteAfter": f"{settings.rec_retention_hours}h",
        }

    def _live_payload(self, camera_id: int, rtsp_url: str, mode: str) -> dict:
        # Keep the upstream RTSP source connected so MediaMTX can serve live
        # WebRTC immediately and any transcode can start without warm-up.
        payload = {
            "source": rtsp_url,
            "sourceOnDemand": False,
        }
        if mode == "direct":
            # Record the live stream directly at full source quality.
            payload.update(self._record_settings())
            return payload

        # substream / transcode: the live path is not recorded itself; a sibling
        # path holds the recordings. recordPath/Format are still set (with
        # record: False) so the playback server can locate legacy full-quality
        # recordings made before the switch and surface them on the timeline.
        payload["record"] = False
        payload["recordPath"] = settings.rec_record_path
        payload["recordFormat"] = settings.rec_record_format
        if mode == "transcode":
            payload["runOnReady"] = self._build_record_command(self._path_name(camera_id))
            payload["runOnReadyRestart"] = True
        return payload

    def _rec_payload(self, source: str, on_demand: bool = False) -> dict:
        # The recorded sibling path. `source` is either "publisher" (FFmpeg pushes
        # the downscaled stream) or the camera's substream RTSP URL (recorded
        # directly with no transcode).
        payload = {"source": source, "sourceOnDemand": on_demand}
        payload.update(self._record_settings())
        return payload

    # -- MediaMTX API ---------------------------------------------------------
    def _is_mediamtx_ready(self) -> bool:
        try:
            resp = httpx.get(
                f"{settings.mediamtx_api_url}/v3/config/global/get",
                timeout=3.0,
            )
            return resp.status_code == 200
        except Exception:
            return False

    def _path_exists(self, path_name: str) -> bool:
        try:
            resp = httpx.get(
                f"{settings.mediamtx_api_url}/v3/config/paths/get/{path_name}",
                timeout=5.0,
            )
            return resp.status_code == 200
        except Exception:
            return False

    def _api_upsert(self, path_name: str, payload: dict) -> bool:
        try:
            if self._path_exists(path_name):
                resp = httpx.patch(
                    f"{settings.mediamtx_api_url}/v3/config/paths/patch/{path_name}",
                    json=payload,
                    timeout=5.0,
                )
            else:
                resp = httpx.post(
                    f"{settings.mediamtx_api_url}/v3/config/paths/add/{path_name}",
                    json=payload,
                    timeout=5.0,
                )
            if resp.status_code not in (200, 201):
                logger.warning(
                    "MediaMTX returned %s for path %s: %s",
                    resp.status_code, path_name, resp.text,
                )
                return False
            return True
        except Exception as exc:
            logger.error("Failed to upsert MediaMTX path %s: %s", path_name, exc)
            return False

    def _upsert_path(
        self, camera_id: int, rtsp_url: str, substream_url: str | None = None
    ) -> bool:
        """Register the live path plus, for substream/transcode modes, the
        recorded sibling. The recorded path is created first so it is configured
        with record=yes before a publisher/source starts feeding it."""
        mode = self._rec_mode(substream_url)
        ok = True
        if mode == "substream":
            # Record the camera's low-quality substream directly — no FFmpeg.
            ok = self._api_upsert(
                self._rec_path_name(camera_id), self._rec_payload(substream_url)
            ) and ok
        elif mode == "transcode":
            # FFmpeg (launched by the live path) publishes the downscaled stream.
            ok = self._api_upsert(
                self._rec_path_name(camera_id), self._rec_payload("publisher")
            ) and ok
        ok = self._api_upsert(
            self._path_name(camera_id), self._live_payload(camera_id, rtsp_url, mode)
        ) and ok
        if ok:
            logger.info(
                "Registered MediaMTX path: %s → %s (mode=%s, encoder=%s, %sp)",
                self._path_name(camera_id), rtsp_url, mode,
                settings.rec_encoder, settings.rec_height,
            )
        return ok

    async def wait_and_sync(
        self,
        db: Session,
        max_retries: int = 30,
        retry_delay: float = 2.0,
    ) -> dict:
        """Wait for MediaMTX to come up, then register all camera RTSP paths."""
        for attempt in range(1, max_retries + 1):
            if self._is_mediamtx_ready():
                logger.info("MediaMTX ready — syncing camera paths (attempt %d)", attempt)
                return self.sync_all_cameras(db)
            logger.info(
                "MediaMTX not reachable yet, retrying in %.0fs (attempt %d/%d)…",
                retry_delay, attempt, max_retries,
            )
            await asyncio.sleep(retry_delay)

        logger.warning("MediaMTX never became ready; camera paths not synced at startup.")
        return {"synced": 0, "skipped": 0}

    def get_stream_info(
        self, camera_id: int, rtsp_url: str, substream_url: str | None = None
    ) -> dict:
        path_name = self._path_name(camera_id)
        rec_path = self._recording_path_name(camera_id, substream_url)
        ok = self._upsert_path(camera_id, rtsp_url, substream_url)
        return {
            "camera_id": camera_id,
            "stream_path": path_name,
            "live_webrtc_url": self._join_public_url(
                settings.mediamtx_webrtc_public_url,
                f"{path_name}/",
            ),
            "playback_get_base_url": self._playback_base_url(rec_path),
            "mediamtx_ready": ok,
            "stream_config": self._stream_config(),
        }

    def _playback_base_url(self, path_name: str) -> str:
        return (
            f"{self._join_public_url(settings.mediamtx_playback_public_url, 'get')}"
            f"?{urlencode({'path': path_name, 'format': settings.stream_playback_format})}"
        )

    def _list_spans_for_path(self, path_name: str) -> list[dict]:
        spans: list[dict] = []
        try:
            resp = httpx.get(
                f"{settings.mediamtx_playback_api_url}/list",
                params={"path": path_name},
                timeout=10.0,
            )
            resp.raise_for_status()

            base_url = self._playback_base_url(path_name)
            for item in resp.json():
                start_raw = item["start"]
                duration = float(item["duration"])
                start_dt = datetime.fromisoformat(start_raw.replace("Z", "+00:00"))
                end_dt = start_dt + timedelta(seconds=duration)
                spans.append(
                    {
                        "start": start_dt.isoformat(),
                        "end": end_dt.isoformat(),
                        "duration": duration,
                        # Each span carries the path it lives on so the player can
                        # request playback from the correct recording.
                        "path": path_name,
                        "playback_get_base_url": base_url,
                    }
                )
        except Exception as exc:
            logger.error("Failed to list MediaMTX recordings for %s: %s", path_name, exc)
        return spans

    def get_recording_spans(
        self, camera_id: int, rtsp_url: str, substream_url: str | None = None
    ) -> dict:
        self._upsert_path(camera_id, rtsp_url, substream_url)
        rec_path = self._recording_path_name(camera_id, substream_url)

        # Merge recordings from the active recording path and, when it differs
        # from the live path, the legacy full-quality path — so footage recorded
        # before the switch still appears on the rewind timeline.
        paths = [rec_path]
        if self._path_name(camera_id) != rec_path:
            paths.append(self._path_name(camera_id))

        spans: list[dict] = []
        for path_name in paths:
            spans.extend(self._list_spans_for_path(path_name))
        spans.sort(key=lambda s: s["start"])

        return {
            "camera_id": camera_id,
            "stream_path": rec_path,
            "playback_get_base_url": self._playback_base_url(rec_path),
            "spans": spans,
            "stream_config": self._stream_config(),
        }

    def sync_all_cameras(self, db: Session) -> dict:
        cameras = get_all_cameras(db)
        synced, skipped = 0, 0
        for camera in cameras:
            if camera.rtsp_url and camera.status:
                if self._upsert_path(camera.id, camera.rtsp_url, camera.substream_rtsp_url):
                    synced += 1
                else:
                    skipped += 1
            else:
                skipped += 1
        logger.info("Camera sync complete — synced: %d, skipped: %d", synced, skipped)
        return {"synced": synced, "skipped": skipped}
