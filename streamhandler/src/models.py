"""Core data structures shared across the pipeline.

These model both the *configuration* of what to stream (cameras, their
use-case bindings and ROIs) and the *runtime artefacts* (decoded frames,
batches, and the envelope published to the use-case queues).
"""

from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import Any

import numpy as np


class ROIType(str, Enum):
    RECT = "rect"        # points = [[x, y, w, h]]
    POLYGON = "polygon"  # points = list of [x, y] vertices


@dataclass(frozen=True)
class ROI:
    """Region of interest for a (camera, use-case) pairing — a single rect or
    polygon zone. "No ROI" is represented by the binding's roi being None
    (the whole frame is then analysed).

    Coordinates are normalised to [0, 1] by default so they survive the
    resolution change between the source stream and the downsized output frame.
    """

    type: ROIType
    points: list[list[float]] = field(default_factory=list)
    normalized: bool = True

    def to_dict(self) -> dict[str, Any]:
        return {"type": self.type.value, "points": self.points, "normalized": self.normalized}

    @classmethod
    def from_backend(cls, raw: Any, usecase_id: int) -> "ROI | None":
        """Convert the app's per-camera `cameras.roi` JSONB into an ROI for one
        use-case, or None if no shape is assigned to it.

        That column stores a list of shapes, each assigned to zero or more
        use-cases via a ``usecases: [{usecaseId, usecaseName}, …]`` array:
          * rect    -> {type:rect, x, y, w, h, usecases:[…]}
          * polygon -> {type:polygon, points:[[x,y]…], usecases:[…]}

        Returns the first shape assigned to this use-case (a shape with an empty
        ``usecases`` list applies to none).
        """
        if not raw:
            return None
        items = raw if isinstance(raw, list) else [raw]
        for shape in items:
            if not isinstance(shape, dict) or not cls._shape_applies(shape, usecase_id):
                continue
            stype = str(shape.get("type", "")).lower()
            try:
                if stype == "rect" and all(k in shape for k in ("x", "y", "w", "h")):
                    return cls(
                        type=ROIType.RECT,
                        points=[[float(shape["x"]), float(shape["y"]),
                                 float(shape["w"]), float(shape["h"])]],
                    )
                if stype == "polygon" and shape.get("points"):
                    pts = [[float(p[0]), float(p[1])] for p in shape["points"]]
                    if len(pts) >= 3:
                        return cls(type=ROIType.POLYGON, points=pts)
            except (TypeError, ValueError, IndexError):
                continue
        return None

    @staticmethod
    def _shape_applies(shape: dict, usecase_id: int) -> bool:
        """True if this ROI shape is assigned to the given use-case."""
        for u in shape.get("usecases", []) or []:
            if isinstance(u, dict) and u.get("usecaseId") == usecase_id:
                return True
        return False


@dataclass(frozen=True)
class UsecaseBinding:
    """A use-case attached to a camera, with its ROI and target queue topic."""

    usecase_id: int
    name: str
    slug: str
    roi: ROI | None = None

    def metadata(self) -> dict[str, Any]:
        return {"id": self.usecase_id, "name": self.name, "slug": self.slug}


@dataclass
class FrameOverrides:
    """Optional per-camera overrides of the global frame settings."""

    target_fps: float | None = None
    frame_width: int | None = None
    frame_height: int | None = None
    jpeg_quality: int | None = None


@dataclass
class CameraStreamConfig:
    """Everything a worker needs to stream one camera."""

    camera_id: int
    rtsp_url: str
    name: str = ""
    location: str = ""
    codec: str = ""
    source_resolution: str = ""
    usecases: list[UsecaseBinding] = field(default_factory=list)
    overrides: FrameOverrides = field(default_factory=FrameOverrides)

    def metadata(self) -> dict[str, Any]:
        return {
            "id": self.camera_id,
            "name": self.name,
            "location": self.location,
            "codec": self.codec,
            "source_resolution": self.source_resolution,
        }

    def fingerprint(self) -> tuple:
        """Stable signature used to detect config changes on hot-reload."""
        return (
            self.rtsp_url,
            self.name,
            self.location,
            self.codec,
            self.overrides.target_fps,
            self.overrides.frame_width,
            self.overrides.frame_height,
            self.overrides.jpeg_quality,
            tuple(
                (u.usecase_id, u.slug,
                 u.roi.type.value if u.roi else None,
                 tuple(map(tuple, u.roi.points)) if u.roi else ())
                for u in self.usecases
            ),
        )


@dataclass
class DecodedFrame:
    """A single decoded frame handed from the decoder to the processor."""

    image: np.ndarray          # BGR HxWx3 uint8
    seq: int                   # monotonic per-stream sequence number
    capture_epoch_ms: int      # wall-clock capture time


@dataclass
class EncodedFrame:
    """A JPEG-encoded, downsized frame ready to be batched."""

    data: bytes
    seq: int
    capture_epoch_ms: int
    width: int
    height: int

    def meta(self) -> dict[str, Any]:
        return {
            "seq": self.seq,
            "capture_epoch_ms": self.capture_epoch_ms,
            "width": self.width,
            "height": self.height,
        }


@dataclass
class FrameBatch:
    """A flushed batch of encoded frames for one camera."""

    batch_id: str
    camera: CameraStreamConfig
    frames: list[EncodedFrame]
    created_epoch_ms: int
