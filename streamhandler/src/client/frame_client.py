"""Consumer-side client for AI services.

Encapsulates the full consume contract so downstream services don't have to
re-implement it (and can't get the cleanup wrong):

  1. consume the use-case's RabbitMQ queue (named after the use-case slug),
  2. resolve the JPEG frames from Redis (claim-check) or decode inline frames,
  3. **acknowledge** the batch, which does two things:
       * Redis: decrements the batch's ack counter so the StreamHandler can
         delete the frames once every use-case has consumed them;
       * RabbitMQ: ``basic_ack`` removes the message from the durable queue.
     Until a message is RabbitMQ-acked it stays in the queue, so a consumer that
     crashes mid-batch gets it redelivered, and messages accumulate while the
     service is offline.

Typical use::

    client = FrameBatchClient(usecase_slug="intrusion",
                              rabbitmq_url="amqp://guest:guest@localhost:5672/%2F",
                              redis_url="redis://localhost:6379/0")
    for batch in client.consume():
        run_inference(batch.frames, batch.roi)   # frames: list[bytes] (JPEG)
        client.ack(batch)                         # release for cleanup
    client.close()

Ack *after* you've successfully processed a batch.
"""

from __future__ import annotations

import base64
import json
import logging
from dataclasses import dataclass
from typing import Iterator

import pika

from src.config import settings
from src.publisher.redis_store import RedisFrameStore

logger = logging.getLogger(__name__)


@dataclass
class FrameBatch:
    """A consumed batch: decoded metadata plus the JPEG-encoded frames."""

    envelope: dict
    frames: list[bytes | None]  # JPEG bytes per frame (None if a frame expired)
    delivery_tag: int | None = None  # RabbitMQ delivery tag, for basic_ack

    @property
    def camera(self) -> dict:
        return self.envelope.get("camera", {})

    @property
    def usecase(self) -> dict:
        return self.envelope.get("usecase", {})

    @property
    def roi(self) -> dict:
        return self.envelope.get("roi", {})

    @property
    def batch_id(self) -> str:
        return self.envelope.get("batch_id", "")


class FrameBatchClient:
    def __init__(
        self,
        usecase_slug: str,
        *,
        rabbitmq_url: str | None = None,
        redis_url: str | None = None,
        queue: str | None = None,
        prefetch: int | None = None,
    ) -> None:
        # The use-case slug identifies the queue (and the routing key). An AI
        # service is configured for a specific use-case, so it knows its slug
        # (e.g. "intrusion"); it matches the producer's slug-based naming.
        self.usecase_slug = usecase_slug
        self._queue = queue or settings.rabbitmq_queue_template.format(
            usecase_id="", usecase_slug=usecase_slug
        )
        self._exchange = settings.rabbitmq_exchange

        self._connection = pika.BlockingConnection(
            pika.URLParameters(rabbitmq_url or settings.rabbitmq_url)
        )
        self._channel = self._connection.channel()
        # Declare the same durable topology the producer uses (idempotent), so a
        # consumer can start first and still have its queue ready.
        self._channel.exchange_declare(self._exchange, exchange_type="direct", durable=True)
        self._channel.queue_declare(queue=self._queue, durable=True)
        self._channel.queue_bind(self._queue, self._exchange, routing_key=usecase_slug)
        self._channel.basic_qos(prefetch_count=prefetch or settings.rabbitmq_prefetch)

        self._store = RedisFrameStore(redis_url=redis_url)
        logger.info("FrameBatchClient consuming queue %s", self._queue)

    # -- consuming ------------------------------------------------------------
    def poll(self, timeout: float = 1.0) -> FrameBatch | None:
        """Return the next batch, or None if the queue is empty (pull-based)."""
        method, _props, body = self._channel.basic_get(self._queue, auto_ack=False)
        if method is None:
            return None
        return self._to_batch(body, method.delivery_tag)

    def consume(self, timeout: float = 1.0) -> Iterator[FrameBatch]:
        """Yield batches as they arrive (push-based, blocking with idle ticks)."""
        for method, _props, body in self._channel.consume(
            self._queue, inactivity_timeout=timeout
        ):
            if method is None:
                continue  # idle tick — lets callers break/handle signals
            yield self._to_batch(body, method.delivery_tag)

    def _to_batch(self, body: bytes, delivery_tag: int) -> FrameBatch:
        envelope = json.loads(body)
        frames = self._resolve_frames(envelope)
        return FrameBatch(envelope=envelope, frames=frames, delivery_tag=delivery_tag)

    def _resolve_frames(self, envelope: dict) -> list[bytes | None]:
        frames = envelope["frames"]
        if frames.get("transport") == "inline":
            return [base64.b64decode(item) for item in frames["items"]]
        # claim_check: one HMGET round-trip for the whole batch.
        return self._store.fetch_frames(frames["redis_key"], frames["fields"])

    # -- acknowledging --------------------------------------------------------
    def ack(self, batch: FrameBatch) -> int:
        """Acknowledge a batch: release the Redis frames (refcount) and remove
        the message from the RabbitMQ queue. Returns the number of Redis acks
        still outstanding (0 => frames just deleted, -1 => not ack-tracked)."""
        remaining = -1
        frames = batch.envelope["frames"]
        if frames.get("ack_required"):
            remaining = self._store.ack(frames["redis_key"])
        if batch.delivery_tag is not None:
            self._channel.basic_ack(batch.delivery_tag)
        return remaining

    def nack(self, batch: FrameBatch, requeue: bool = True) -> None:
        """Reject a batch (processing failed). Requeues it for redelivery by
        default; does not touch the Redis refcount."""
        if batch.delivery_tag is not None:
            self._channel.basic_nack(batch.delivery_tag, requeue=requeue)

    def close(self) -> None:
        try:
            self._connection.close()
        finally:
            self._store.close()
