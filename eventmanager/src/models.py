"""Parsed representations of an incoming event batch.

One RabbitMQ message = one batch = a JSON object carrying the camera/use-case
identity, the stream quality to store as evidence, and a list of frame dicts.
Each frame can supply its image inline (base64) or via a Redis claim-check
reference, plus the AI detections to annotate.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any


@dataclass
class FrameItem:
    capture_epoch_ms: int | None = None
    # Claim-check (raw frame in Redis):
    redis_key: str | None = None
    redis_field: str | None = None
    # Inline images (base64):
    raw_b64: str | None = None
    processed_b64: str | None = None
    # AI output to draw if no processed image is supplied:
    detections: list[dict] = field(default_factory=list)

    @classmethod
    def from_dict(cls, d: dict) -> "FrameItem":
        return cls(
            capture_epoch_ms=d.get("capture_epoch_ms") or d.get("ts_ms"),
            redis_key=d.get("redis_key"),
            redis_field=d.get("field") or d.get("redis_field"),
            raw_b64=d.get("raw") or d.get("raw_b64"),
            processed_b64=d.get("processed") or d.get("processed_b64"),
            detections=d.get("detections", []) or [],
        )


@dataclass
class EventBatch:
    camera_id: int
    usecase_id: int
    frames: list[FrameItem]
    location_id: int | None = None
    usecase_slug: str | None = None
    stream_quality: str | None = None
    batch_id: str | None = None
    # Shared claim-check key + whether this batch participates in refcount
    # cleanup — the Event Manager acks it once after consuming.
    redis_key: str | None = None
    ack_required: bool = False
    raw_message: dict = field(default_factory=dict)

    @classmethod
    def from_message(cls, msg: dict) -> "EventBatch":
        # Be liberal in what we accept: support both a flat frames list and the
        # nested {"frames": {"meta": [...]}} shapes various producers may emit.
        frames_raw = msg.get("frames", [])
        if isinstance(frames_raw, dict):  # tolerate streamhandler-style nesting
            frames_raw = frames_raw.get("items") or frames_raw.get("meta") or []
        camera = msg.get("camera", {}) if isinstance(msg.get("camera"), dict) else {}
        usecase = msg.get("usecase", {}) if isinstance(msg.get("usecase"), dict) else {}
        frames = [FrameItem.from_dict(f) for f in frames_raw]
        # Batch-level claim-check key for the EM's ack: top-level if present,
        # else inferred from the first frame's reference.
        redis_key = msg.get("redis_key") or next((f.redis_key for f in frames if f.redis_key), None)
        return cls(
            camera_id=int(msg.get("camera_id") or camera.get("id")),
            usecase_id=int(msg.get("usecase_id") or usecase.get("id")),
            location_id=msg.get("location_id") or camera.get("location_id"),
            usecase_slug=msg.get("usecase_slug") or usecase.get("slug"),
            stream_quality=msg.get("stream_quality"),
            batch_id=msg.get("batch_id"),
            redis_key=redis_key,
            ack_required=bool(msg.get("ack_required", False)),
            frames=frames,
            raw_message=msg,
        )

    def frame_times(self) -> list[datetime]:
        out = []
        for f in self.frames:
            if f.capture_epoch_ms:
                out.append(datetime.fromtimestamp(f.capture_epoch_ms / 1000, tz=timezone.utc))
        return out

    def first_frame_time(self) -> datetime:
        times = self.frame_times()
        return min(times) if times else datetime.now(timezone.utc)

    def last_frame_time(self) -> datetime:
        times = self.frame_times()
        return max(times) if times else datetime.now(timezone.utc)


@dataclass
class BuiltEvent:
    """Result of building/extending an event — what gets persisted + notified."""

    camera_id: int
    usecase_id: int
    location_id: int
    event_start_time: datetime
    event_end_time: datetime
    evidence_url: str | None
    raw_url: str | None = None
    processed_url: str | None = None
    is_new: bool = True
    event_id: int | None = None

    def to_notification(self, usecase_slug: str | None, batch_id: str | None) -> dict[str, Any]:
        return {
            "event_id": self.event_id,
            "camera_id": self.camera_id,
            "usecase_id": self.usecase_id,
            "usecase_slug": usecase_slug,
            "location_id": self.location_id,
            "batch_id": batch_id,
            "event_start_time": self.event_start_time.isoformat(),
            "event_end_time": self.event_end_time.isoformat(),
            "evidence_url": self.evidence_url,
            "raw_url": self.raw_url,
            "processed_url": self.processed_url,
            "is_new": self.is_new,
        }
