"""ROI (no-walking zone) geometry — drawing only.

The Event Manager doesn't run the in-zone test (the AI service already did and
sent `in_roi` flags); it just renders the zone onto the evidence video. It
builds a pixel-space polygon from the ROI metadata and draws it as a translucent
filled overlay with an outline + label. The envelope carries a single shape (or
null for "no ROI"):

  * {"type": "rect",    "points": [[x, y, w, h]]}
  * {"type": "polygon", "points": [[x, y], …]}
  * null / missing  -> no ROI; nothing is drawn
"""

from __future__ import annotations

import logging

import cv2
import numpy as np

logger = logging.getLogger(__name__)


class RoiZone:
    def __init__(self, polygon: np.ndarray | None) -> None:
        self._polygon = polygon  # None = no ROI (nothing to draw)

    @property
    def is_full_frame(self) -> bool:
        return self._polygon is None

    @classmethod
    def from_envelope(cls, roi: dict | None, width: int, height: int) -> "RoiZone":
        if not roi:
            return cls(None)
        rtype = str(roi.get("type", "")).lower()
        normalized = roi.get("normalized", True)
        pts = roi.get("points") or []

        def scale(x: float, y: float) -> list[int]:
            if normalized:
                return [int(round(x * width)), int(round(y * height))]
            return [int(round(x)), int(round(y))]

        coords: list[list[int]] = []
        try:
            if rtype == "rect":
                x, y, w, h = pts[0]               # [[x, y, w, h]]
                coords = [scale(x, y), scale(x + w, y), scale(x + w, y + h), scale(x, y + h)]
            elif rtype == "polygon":
                coords = [scale(px, py) for px, py in pts]
            else:
                logger.warning("Unsupported ROI type '%s' — not drawn", rtype)
                return cls(None)
        except (ValueError, TypeError, IndexError):
            logger.warning("Malformed ROI %r — not drawn", roi)
            return cls(None)

        if len(coords) < 3:
            return cls(None)
        return cls(np.array(coords, dtype=np.int32))

    def draw(self, image: np.ndarray, *, color=(0, 140, 255), alpha: float = 0.25,
             label: str | None = "ROI") -> np.ndarray:
        """Translucent filled polygon + outline + label. No-op when no ROI.
        Mutates and returns `image`."""
        if self._polygon is None:
            return image
        overlay = image.copy()
        cv2.fillPoly(overlay, [self._polygon], color)
        cv2.addWeighted(overlay, alpha, image, 1.0 - alpha, 0, image)
        cv2.polylines(image, [self._polygon], isClosed=True, color=color, thickness=2)
        if label:
            top = self._polygon[self._polygon[:, 1].argmin()]
            cv2.putText(image, label, (int(top[0]), max(14, int(top[1]) - 6)),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 2, cv2.LINE_AA)
        return image
