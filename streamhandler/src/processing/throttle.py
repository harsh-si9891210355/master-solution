"""Frame-rate throttle.

Decimates an arbitrary-rate source down to a target FPS using a monotonic
clock. Works identically for both decoders, so the OpenCV path (which has no
in-pipeline ``videorate``) and the GStreamer path (which mostly pre-throttles)
share one source of truth for the output rate. Never interpolates above source.
"""

from __future__ import annotations

import time


class FrameRateThrottle:
    def __init__(self, target_fps: float) -> None:
        self.target_fps = target_fps
        self._interval = 1.0 / target_fps if target_fps > 0 else 0.0
        self._next_emit = 0.0

    def should_emit(self) -> bool:
        """Return True if a frame sampled *now* should be kept."""
        if self._interval <= 0.0:  # target_fps <= 0 → pass everything through
            return True
        now = time.monotonic()
        if now < self._next_emit:
            return False
        # Anchor the schedule to now (not to the previous deadline) so a stall
        # does not produce a burst of catch-up frames once the stream resumes.
        self._next_emit = now + self._interval
        return True
