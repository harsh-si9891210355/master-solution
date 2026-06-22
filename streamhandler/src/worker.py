"""Per-camera stream worker.

One worker runs in its own thread and owns the full pipeline for a single
camera: decode → throttle to target FPS → resize + JPEG encode → batch →
publish to every bound use-case queue. It supervises its own decoder, tearing
it down and reconnecting with exponential backoff on disconnect or stall, and
exits promptly when its stop event is set.
"""

from __future__ import annotations

import logging
import threading
import time

from src.config import settings
from src.decoder.base import DecoderError
from src.decoder.factory import create_decoder
from src.metrics import (
    ENCODE_LATENCY,
    FRAMES_DECODED,
    FRAMES_DROPPED,
    STREAM_RECONNECTS,
    STREAM_UP,
)
from src.models import CameraStreamConfig, DecodedFrame
from src.processing.batcher import FrameBatcher
from src.processing.encoder import JpegEncoder, now_epoch_ms
from src.processing.throttle import FrameRateThrottle
from src.publisher.frame_publisher import FramePublisher

logger = logging.getLogger(__name__)


class StreamWorker:
    def __init__(self, camera: CameraStreamConfig, publisher: FramePublisher) -> None:
        self.camera = camera
        self._publisher = publisher
        self._stop = threading.Event()
        self._thread = threading.Thread(
            target=self._run, name=f"stream-{camera.camera_id}", daemon=True
        )

        ov = camera.overrides
        self._target_fps = ov.target_fps if ov.target_fps is not None else settings.target_fps
        self._width = ov.frame_width if ov.frame_width is not None else settings.frame_width
        self._height = ov.frame_height if ov.frame_height is not None else settings.frame_height
        self._quality = ov.jpeg_quality if ov.jpeg_quality is not None else settings.jpeg_quality

    # -- lifecycle ------------------------------------------------------------
    def start(self) -> None:
        self._thread.start()

    def stop(self) -> None:
        self._stop.set()

    def join(self, timeout: float | None = None) -> None:
        self._thread.join(timeout)

    @property
    def is_alive(self) -> bool:
        return self._thread.is_alive()

    # -- main loop ------------------------------------------------------------
    def _run(self) -> None:
        cid = str(self.camera.camera_id)
        backoff = settings.reconnect_backoff_base_s
        logger.info(
            "Worker starting for camera %s (%s) — %d use-case(s), %.1f fps, %dx%d",
            self.camera.camera_id, self.camera.name, len(self.camera.usecases),
            self._target_fps, self._width, self._height,
        )

        while not self._stop.is_set():
            try:
                self._stream_session()
                # Clean return means stop requested.
                backoff = settings.reconnect_backoff_base_s
            except DecoderError as exc:
                STREAM_UP.labels(camera_id=cid).set(0)
                if self._stop.is_set():
                    break
                STREAM_RECONNECTS.labels(camera_id=cid).inc()
                logger.warning(
                    "Camera %s stream error: %s — reconnecting in %.1fs",
                    self.camera.camera_id, exc, backoff,
                )
                self._stop.wait(backoff)
                backoff = min(backoff * 2, settings.reconnect_backoff_max_s)
            except Exception:
                STREAM_UP.labels(camera_id=cid).set(0)
                logger.exception("Unexpected error in worker for camera %s", self.camera.camera_id)
                self._stop.wait(backoff)
                backoff = min(backoff * 2, settings.reconnect_backoff_max_s)

        STREAM_UP.labels(camera_id=cid).set(0)
        logger.info("Worker stopped for camera %s", self.camera.camera_id)

    def _stream_session(self) -> None:
        """One connected session: decode + process until stop or failure."""
        cid = str(self.camera.camera_id)
        throttle = FrameRateThrottle(self._target_fps)
        encoder = JpegEncoder(
            width=self._width,
            height=self._height,
            keep_aspect=settings.frame_keep_aspect,
            quality=self._quality,
        )
        batcher = FrameBatcher(
            self.camera, batch_size=settings.batch_size, max_age_s=settings.batch_max_age_s
        )
        seq = 0
        last_frame_at = time.monotonic()

        decoder = create_decoder(self.camera.rtsp_url, width=self._width, height=self._height)
        decoder.open()
        STREAM_UP.labels(camera_id=cid).set(1)
        logger.info("Camera %s connected", self.camera.camera_id)

        try:
            while not self._stop.is_set():
                frame = decoder.read()
                now = time.monotonic()

                if frame is None:
                    # Transient read miss (e.g. GStreamer pull timeout). Treat a
                    # long dry spell as a stall and force a reconnect.
                    if now - last_frame_at > settings.stream_stale_timeout_s:
                        raise DecoderError(
                            f"no frames for {settings.stream_stale_timeout_s:.0f}s — stalled"
                        )
                    continue

                last_frame_at = now
                FRAMES_DECODED.labels(camera_id=cid).inc()

                if not throttle.should_emit():
                    FRAMES_DROPPED.labels(camera_id=cid, reason="throttle").inc()
                    continue

                seq += 1
                decoded = DecodedFrame(image=frame, seq=seq, capture_epoch_ms=now_epoch_ms())
                try:
                    t0 = time.monotonic()
                    encoded = encoder.encode(decoded)
                    ENCODE_LATENCY.labels(camera_id=cid).observe(time.monotonic() - t0)
                except Exception:
                    FRAMES_DROPPED.labels(camera_id=cid, reason="encode_error").inc()
                    logger.exception("Failed to encode frame for camera %s", self.camera.camera_id)
                    continue

                batch = batcher.add(encoded) or batcher.maybe_flush_stale()
                if batch is not None:
                    self._publisher.publish(batch)
        finally:
            decoder.close()
            STREAM_UP.labels(camera_id=cid).set(0)
