import asyncio
import logging

import httpx
from sqlalchemy.orm import Session

from src.core.config import settings
from src.crud.camera import get_all_cameras

logger = logging.getLogger(__name__)


class StreamService:

    def _path_name(self, camera_id: int) -> str:
        return f"camera-{camera_id}"

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

    def _upsert_path(self, path_name: str, rtsp_url: str) -> bool:
        # sourceOnDemand: False — MediaMTX keeps the RTSP connection open at all
        # times so recording is continuous. WebRTC sessions are still on-demand
        # by nature (the browser initiates them when a viewer opens the modal).
        payload = {
            "source": rtsp_url,
            "sourceOnDemand": False,
            "record": True,
            "recordPath": "/recordings/%path/%Y-%m-%d_%H-%M-%S",
            "recordFormat": "fmp4",
            "recordSegmentDuration": "1h",
            "recordDeleteAfter": "168h",
        }
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
            logger.info("Registered MediaMTX path: %s → %s", path_name, rtsp_url)
            return True
        except Exception as exc:
            logger.error("Failed to upsert MediaMTX path %s: %s", path_name, exc)
            return False

    async def wait_and_sync(
        self,
        db: Session,
        max_retries: int = 30,
        retry_delay: float = 2.0,
    ) -> dict:
        """Wait for MediaMTX to come up, then register all cameras as on-demand paths."""
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

    def get_stream_info(self, camera_id: int, rtsp_url: str) -> dict:
        path_name = self._path_name(camera_id)
        ok = self._upsert_path(path_name, rtsp_url)
        return {
            "camera_id": camera_id,
            "stream_path": path_name,
            "webrtc_url": f"{settings.mediamtx_webrtc_url}/{path_name}/whep",
            "hls_url": f"{settings.mediamtx_hls_url}/{path_name}/index.m3u8",
            "mediamtx_ready": ok,
        }

    def sync_all_cameras(self, db: Session) -> dict:
        cameras = get_all_cameras(db)
        synced, skipped = 0, 0
        for camera in cameras:
            if camera.rtsp_url and camera.status:
                if self._upsert_path(self._path_name(camera.id), camera.rtsp_url):
                    synced += 1
                else:
                    skipped += 1
            else:
                skipped += 1
        logger.info("Camera sync complete — synced: %d, skipped: %d", synced, skipped)
        return {"synced": synced, "skipped": skipped}
