"""Camera provider abstraction.

A provider answers one question: "which cameras should I be streaming right now,
and for each, which use-cases + ROIs apply?". Providers are polled periodically
by the manager so cameras can be added/removed/reconfigured without a restart.
"""

from __future__ import annotations

import abc

from src.models import CameraStreamConfig


class CameraProvider(abc.ABC):
    @abc.abstractmethod
    def load(self) -> list[CameraStreamConfig]:
        """Return the current desired set of camera stream configs.

        Implementations should return only cameras that are active and have a
        usable RTSP URL and at least one bound use-case (a camera with no
        use-case has nowhere to publish to).
        """


def parse_roi(raw: dict | None) -> "ROI | None":
    """Parse an ROI dict (rect or polygon) from config. Returns None for a
    missing / full-frame ROI (the whole frame is then analysed)."""
    from src.models import ROI, ROIType

    if not raw:
        return None
    rtype = str(raw.get("type", "")).lower()
    points = [[float(x) for x in pt] for pt in raw.get("points", [])]
    normalized = bool(raw.get("normalized", True))
    if rtype == "rect":
        return ROI(type=ROIType.RECT, points=points, normalized=normalized)
    if rtype == "polygon":
        return ROI(type=ROIType.POLYGON, points=points, normalized=normalized)
    return None
