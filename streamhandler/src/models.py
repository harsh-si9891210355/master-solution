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
    FULL = "full"        # whole frame
    RECT = "rect"        # [x, y, w, h]
    POLYGON = "polygon"  # list of [x, y] vertices


@dataclass(frozen=True)
class ROI:
    """Region of interest for a (camera, use-case) pairing.

    Coordinates are normalised to [0, 1] by default so they survive the
    resolution change between the source stream and the downsized output frame.
    AI services scale these against the frame dimensions in the envelope.
    """

    type: ROIType = ROIType.FULL
    points: list[list[float]] = field(default_factory=list)
    normalized: bool = True

    def to_dict(self) -> dict[str, Any]:
        return {"type": self.type.value, "points": self.points, "normalized": self.normalized}

    @classmethod
    def full(cls) -> "ROI":
        return cls(type=ROIType.FULL, points=[], normalized=True)


@dataclass(frozen=True)
class UsecaseBinding:
    """A use-case attached to a camera, with its ROI and target queue topic."""

    usecase_id: int
    name: str
    slug: str
    roi: ROI = field(default_factory=ROI.full)

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
                (u.usecase_id, u.slug, u.roi.type.value, tuple(map(tuple, u.roi.points)))
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
