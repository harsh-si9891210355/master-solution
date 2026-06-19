"""Data structures for detections and the analysis event."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


@dataclass
class Detection:
    """A single detected person in a frame (pixel coordinates)."""

    x1: int
    y1: int
    x2: int
    y2: int
    confidence: float
    label: str = "person"
    in_roi: bool = False
    reference_point: tuple[int, int] | None = None  # foot/center used for the zone test

    def to_dict(self) -> dict[str, Any]:
        return {
            "bbox": [self.x1, self.y1, self.x2, self.y2],
            "confidence": round(self.confidence, 4),
            "label": self.label,
            "in_roi": self.in_roi,
            "reference_point": list(self.reference_point) if self.reference_point else None,
        }


@dataclass
class FrameAnalysis:
    """Per-frame analysis result."""

    index: int
    seq: int | None
    capture_epoch_ms: int | None
    width: int
    height: int
    detections: list[Detection] = field(default_factory=list)
    error: str | None = None
    # Claim-check reference forwarded to the Event Manager so it can fetch this
    # same raw frame from Redis (and the batch survives until the EM acks too).
    redis_key: str | None = None
    redis_field: str | None = None

    @property
    def person_count(self) -> int:
        return len(self.detections)

    @property
    def persons_in_roi(self) -> int:
        return sum(1 for d in self.detections if d.in_roi)

    @property
    def violation(self) -> bool:
        # Use-case "walking-in-no-walking-zone": a person inside the ROI is a breach.
        return self.persons_in_roi > 0

    def to_dict(self) -> dict[str, Any]:
        return {
            "index": self.index,
            "seq": self.seq,
            "capture_epoch_ms": self.capture_epoch_ms,
            "width": self.width,
            "height": self.height,
            "person_count": self.person_count,
            "persons_in_roi": self.persons_in_roi,
            "violation": self.violation,
            "detections": [d.to_dict() for d in self.detections],
            "error": self.error,
            # Forwarded so the Event Manager can fetch this raw frame from Redis.
            "redis_key": self.redis_key,
            "field": self.redis_field,
        }
