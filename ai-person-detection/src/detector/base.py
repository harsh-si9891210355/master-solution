"""Person-detector abstraction.

A detector takes a BGR frame and returns the people it found as Detection
objects (pixel coords, no ROI applied yet — the pipeline does the zone test).
Implementations are not required to be thread-safe; the service runs one
detector instance on a single worker.
"""

from __future__ import annotations

import abc

import numpy as np

from src.models import Detection


class PersonDetector(abc.ABC):
    name: str = "base"

    @abc.abstractmethod
    def detect(self, image_bgr: np.ndarray) -> list[Detection]:
        """Return detected persons in the frame."""

    def describe(self) -> dict:
        """Model metadata embedded in the output event for traceability."""
        return {"backend": self.name}
