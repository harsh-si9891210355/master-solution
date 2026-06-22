"""Per-camera frame batcher.

Accumulates encoded frames and emits a ``FrameBatch`` when either the batch
size is reached or the oldest buffered frame exceeds ``max_age_s`` (so low-FPS
streams are not starved waiting for a full batch). Single-camera, single-thread.
"""

from __future__ import annotations

import time
import uuid

from src.models import CameraStreamConfig, EncodedFrame, FrameBatch
from src.processing.encoder import now_epoch_ms


class FrameBatcher:
    def __init__(self, camera: CameraStreamConfig, *, batch_size: int, max_age_s: float) -> None:
        self.camera = camera
        self.batch_size = batch_size
        self.max_age_s = max_age_s
        self._frames: list[EncodedFrame] = []
        self._first_added_monotonic: float | None = None

    def add(self, frame: EncodedFrame) -> FrameBatch | None:
        """Add a frame; return a FrameBatch when one is ready, else None."""
        if not self._frames:
            self._first_added_monotonic = time.monotonic()
        self._frames.append(frame)
        if len(self._frames) >= self.batch_size:
            return self._flush()
        return None

    def maybe_flush_stale(self) -> FrameBatch | None:
        """Flush a partial batch that has aged past max_age_s. Call periodically."""
        if not self._frames or self.max_age_s <= 0 or self._first_added_monotonic is None:
            return None
        if time.monotonic() - self._first_added_monotonic >= self.max_age_s:
            return self._flush()
        return None

    def _flush(self) -> FrameBatch:
        batch = FrameBatch(
            batch_id=uuid.uuid4().hex,
            camera=self.camera,
            frames=self._frames,
            created_epoch_ms=now_epoch_ms(),
        )
        self._frames = []
        self._first_added_monotonic = None
        return batch
