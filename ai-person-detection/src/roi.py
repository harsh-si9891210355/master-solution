"""ROI (no-walking zone) geometry.

Turns the ROI metadata carried in the frame envelope into a pixel-space polygon
for the given frame size, and tests whether a person's reference point lies
inside it. Coordinates may be normalised ([0,1]) — the StreamHandler default —
or absolute pixels.
"""

from __future__ import annotations

import logging

import cv2
import numpy as np

from src.config import settings
from src.models import Detection

logger = logging.getLogger(__name__)


class RoiZone:
    """A polygon zone for one (camera, use-case) ROI at a specific frame size."""

    def __init__(self, polygon: np.ndarray | None) -> None:
        # polygon is an Nx2 int32 array, or None for a full-frame ROI (always inside).
        self._polygon = polygon

    @property
    def is_full_frame(self) -> bool:
        return self._polygon is None

    @classmethod
    def from_envelope(cls, roi: dict, width: int, height: int) -> "RoiZone":
        rtype = (roi or {}).get("type", "full")
        if rtype == "full" or not roi:
            return cls(None)

        normalized = roi.get("normalized", True)
        pts = roi.get("points", []) or []

        def scale(x: float, y: float) -> list[int]:
            if normalized:
                return [int(round(x * width)), int(round(y * height))]
            return [int(round(x)), int(round(y))]

        coords: list[list[int]] = []
        try:
            if rtype == "rect":
                # points = [[x, y, w, h]]
                x, y, w, h = pts[0]
                coords = [scale(x, y), scale(x + w, y), scale(x + w, y + h), scale(x, y + h)]
            elif rtype == "polygon":
                coords = [scale(px, py) for px, py in pts]
            else:
                logger.warning("Unknown ROI type '%s' — treating as full frame", rtype)
                return cls(None)
        except (ValueError, TypeError, IndexError):
            logger.warning("Malformed ROI %r — treating as full frame", roi)
            return cls(None)

        if len(coords) < 3:
            return cls(None)
        return cls(np.array(coords, dtype=np.int32))

    def reference_point(self, det: Detection) -> tuple[int, int]:
        if settings.roi_reference_point == "center":
            return ((det.x1 + det.x2) // 2, (det.y1 + det.y2) // 2)
        # "foot": bottom-centre of the bbox — best for floor/zone violations.
        return ((det.x1 + det.x2) // 2, det.y2)

    def contains(self, point: tuple[int, int]) -> bool:
        if self._polygon is None:
            return True
        return cv2.pointPolygonTest(self._polygon, (float(point[0]), float(point[1])), False) >= 0

    def annotate(self, det: Detection) -> Detection:
        """Set det.in_roi and det.reference_point for the zone test."""
        ref = self.reference_point(det)
        det.reference_point = ref
        det.in_roi = self.contains(ref)
        return det
