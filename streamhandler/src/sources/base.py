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


def parse_roi(raw: dict | None) -> "ROI":
    """Parse an ROI dict from config into an ROI model. Defaults to full-frame."""
    from src.models import ROI, ROIType

    if not raw:
        return ROI.full()
    rtype = ROIType(str(raw.get("type", "full")).lower())
    points = [[float(x) for x in pt] for pt in raw.get("points", [])]
    normalized = bool(raw.get("normalized", True))
    if rtype == ROIType.FULL:
        return ROI.full()
    return ROI(type=rtype, points=points, normalized=normalized)
