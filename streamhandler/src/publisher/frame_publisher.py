"""Frame publisher — builds the queue envelope and fans a batch out to every
use-case bound to the camera.

Envelope schema (JSON, one message per use-case per batch):

    {
      "schema_version": "1.0",
      "producer": "streamhandler",
      "batch_id": "<hex>",
      "produced_at_ms": 1718524800000,
      "camera":  { "id", "name", "location", "codec", "source_resolution" },
      "usecase": { "id", "name", "slug" },
      "roi":     { "type", "points", "normalized" },
      "frames": {
        "count": 10,
        "encoding": "jpeg",
        "width": 1280, "height": 720,
        "transport": "claim_check" | "inline",
        "redis_key": "sh:frames:7:<batch_id>",   # claim_check only
        "fields":    ["frame:0", ...],            # claim_check only — Redis hash fields
        "items":     ["<base64>", ...],           # inline only
        "meta": [ { "seq", "capture_epoch_ms", "width", "height" }, ... ]
      }
    }

Consumers in claim-check mode read the envelope from the queue, then HMGET the
`fields` from `redis_key` to pull the JPEG bytes. The same Redis copy is shared
by every use-case, so storage is O(batch) not O(batch × use-cases).
"""

from __future__ import annotations

import base64
import json
import logging
import time

from src.config import FrameTransport, RedisCleanup, settings
from src.metrics import (
    BATCHES_PUBLISHED,
    FRAMES_PUBLISHED,
    PUBLISH_ERRORS,
    PUBLISH_LATENCY,
)
from src.models import FrameBatch
from src.publisher.rabbitmq_publisher import RabbitMQPublisher
from src.publisher.redis_store import RedisFrameStore

logger = logging.getLogger(__name__)

SCHEMA_VERSION = "1.0"


class FramePublisher:
    def __init__(self, broker: RabbitMQPublisher, redis_store: RedisFrameStore | None) -> None:
        self._broker = broker
        self._redis = redis_store
        self._transport = settings.frame_transport
        if self._transport == FrameTransport.CLAIM_CHECK and self._redis is None:
            raise ValueError("claim_check transport requires a Redis store")
        # Reference-counted cleanup only applies to the claim-check transport
        # (inline frames live and die with the queue message, not Redis).
        self._refcount = (
            self._transport == FrameTransport.CLAIM_CHECK
            and settings.redis_cleanup == RedisCleanup.REFCOUNT
        )

    def _frames_section(self, batch: FrameBatch, redis_key: str | None) -> dict:
        first = batch.frames[0]
        section: dict = {
            "count": len(batch.frames),
            "encoding": "jpeg",
            "width": first.width,
            "height": first.height,
            "transport": self._transport.value,
            "meta": [f.meta() for f in batch.frames],
        }
        if self._transport == FrameTransport.CLAIM_CHECK:
            section["redis_key"] = redis_key
            section["fields"] = [RedisFrameStore.frame_field(i) for i in range(len(batch.frames))]
            # Tell consumers how this batch is cleaned up and, under refcount,
            # which key to ack against. The use-case id to ack with is in the
            # per-use-case `usecase.id` field of the envelope.
            if self._refcount:
                section["cleanup"] = RedisCleanup.REFCOUNT.value
                section["ack_required"] = True
            else:
                section["cleanup"] = RedisCleanup.TTL.value
                section["ack_required"] = False
        else:  # inline
            section["items"] = [base64.b64encode(f.data).decode("ascii") for f in batch.frames]
        return section

    def publish(self, batch: FrameBatch) -> None:
        """Store frames (claim-check) and enqueue one envelope per use-case.

        Failures are logged + counted per stage and never raised, so one bad
        batch or use-case cannot stall the camera's worker loop.
        """
        if not batch.frames:
            return
        camera = batch.camera
        camera_id = camera.camera_id
        started = time.monotonic()

        redis_key: str | None = None
        if self._transport == FrameTransport.CLAIM_CHECK:
            # Under refcount cleanup, seed the in-batch ack counter with the
            # number of use-cases times the downstream stages per use-case (AI
            # service + Event Manager = 2 by default), so the batch is deleted
            # only once every stage has acked every use-case.
            ack_count = (
                len(camera.usecases) * settings.frame_consumers_per_usecase
                if self._refcount else None
            )
            try:
                redis_key = self._redis.store_batch(batch, ack_count=ack_count)
            except Exception:
                PUBLISH_ERRORS.labels(camera_id=str(camera_id), stage="redis").inc()
                logger.exception("Failed to store batch %s in Redis", batch.batch_id)
                return  # cannot publish references to frames that were not stored

        frames_section = self._frames_section(batch, redis_key)
        base_envelope = {
            "schema_version": SCHEMA_VERSION,
            "producer": settings.service_name,
            "batch_id": batch.batch_id,
            "produced_at_ms": batch.created_epoch_ms,
            "camera": camera.metadata(),
            "frames": frames_section,
        }

        published_any = False
        for binding in camera.usecases:
            envelope = dict(base_envelope)
            envelope["usecase"] = binding.metadata()
            envelope["roi"] = binding.roi.to_dict() if binding.roi else None
            try:
                payload = json.dumps(envelope, separators=(",", ":")).encode("utf-8")
                self._broker.publish(
                    binding.usecase_id, binding.slug, camera_id=camera_id, value=payload
                )
                BATCHES_PUBLISHED.labels(
                    camera_id=str(camera_id), usecase_id=str(binding.usecase_id)
                ).inc()
                published_any = True
            except Exception:
                PUBLISH_ERRORS.labels(camera_id=str(camera_id), stage="rabbitmq").inc()
                logger.exception(
                    "Failed to publish batch %s to use-case %s",
                    batch.batch_id, binding.usecase_id,
                )

        if published_any:
            FRAMES_PUBLISHED.labels(camera_id=str(camera_id)).inc(len(batch.frames))
        PUBLISH_LATENCY.labels(camera_id=str(camera_id)).observe(time.monotonic() - started)
