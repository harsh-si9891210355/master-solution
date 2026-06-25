"""ai-person-detection service.

Consumes frame-batch envelopes from the input queue, resolves the JPEG frames
from Redis (claim-check), runs person detection + ROI zone analysis, publishes
a detailed analysis event to the output queue, and only then acknowledges —
both the RabbitMQ message and the Redis reference count.

Delivery contract (at-least-once):
  1. analyze the batch and publish the event (broker-confirmed),
  2. RabbitMQ basic_ack — the input message is removed only after the event is
     safely published, so a crash mid-processing causes a redelivery, not a loss,
  3. Redis ack — release the frames last, after the message is acked.
A crash between (1) and (2) can re-emit one duplicate event (acceptable);
downstream consumers should treat batch_id as the idempotency key.
"""

from __future__ import annotations

import base64
import json
import logging
import threading
import time

import pika
from pika.exceptions import AMQPConnectionError, AMQPChannelError

from src.analyzer import BatchAnalyzer
from src.config import settings
from src.detector.factory import create_detector
from src.metrics import (
    BATCH_LATENCY,
    BATCHES_CONSUMED,
    BATCHES_FAILED,
    BROKER_UP,
    EVENTS_PUBLISHED,
    PIPELINE_TO_ANALYZED,
    PUBLISH_ERRORS,
)
from src.publisher import EventPublisher
from src.redis_frames import RedisFrameClient

logger = logging.getLogger(__name__)


def _now_ms() -> int:
    return int(time.time() * 1000)


class PersonDetectionService:
    def __init__(self) -> None:
        self._stop = threading.Event()
        self._redis = RedisFrameClient()
        self._redis.ping()
        logger.info("Connected to Redis at %s", settings.redis_url)
        # Loading the model can take a few seconds — do it once at startup.
        self._analyzer = BatchAnalyzer(create_detector())
        logger.info("Detector ready (backend=%s)", settings.detector_backend.value)

    def stop(self) -> None:
        self._stop.set()

    # -- main loop ------------------------------------------------------------
    def run(self) -> None:
        backoff = 2.0
        while not self._stop.is_set():
            try:
                self._run_session()
                backoff = 2.0
            except (AMQPConnectionError, AMQPChannelError, OSError) as exc:
                BROKER_UP.set(0)
                if self._stop.is_set():
                    break
                logger.warning("RabbitMQ connection lost (%s); reconnecting in %.0fs", exc, backoff)
                self._stop.wait(backoff)
                backoff = min(backoff * 2, 30.0)
        self._cleanup()

    def _run_session(self) -> None:
        conn = pika.BlockingConnection(pika.URLParameters(settings.rabbitmq_url))
        channel = conn.channel()
        # Declare the same durable topology the StreamHandler uses for the input
        # queue (idempotent), so this service can even start before the producer.
        channel.exchange_declare(settings.rabbitmq_exchange, exchange_type="direct", durable=True)
        channel.queue_declare(queue=settings.input_queue, durable=True)
        channel.queue_bind(settings.input_queue, settings.rabbitmq_exchange,
                           routing_key=settings.input_queue)
        channel.basic_qos(prefetch_count=settings.prefetch)
        if settings.publish_confirms:
            channel.confirm_delivery()
        publisher = EventPublisher(channel)
        BROKER_UP.set(1)
        logger.info("Consuming '%s' -> publishing '%s'", settings.input_queue, settings.output_queue)

        try:
            for method, _props, body in channel.consume(
                settings.input_queue, inactivity_timeout=1.0
            ):
                if self._stop.is_set():
                    break
                if method is None:
                    continue  # idle tick — lets us check the stop flag
                self._handle(channel, publisher, method, body)
        finally:
            try:
                channel.cancel()
                conn.close()
            except Exception:
                pass

    def _handle(self, channel, publisher: EventPublisher, method, body: bytes) -> None:
        BATCHES_CONSUMED.inc()
        t0 = time.monotonic()
        try:
            envelope = json.loads(body)
            frames = self._resolve_frames(envelope)
            event = self._analyzer.analyze(envelope, frames, _now_ms())
            # Stamp the moment of publish as analyzed_at_ms, and record the
            # capture -> analyzed latency (queue wait + redis fetch + inference).
            analyzed_at = _now_ms()
            event["analyzed_at_ms"] = analyzed_at
            captured_at = event.get("captured_at_ms")
            if captured_at:
                PIPELINE_TO_ANALYZED.observe(max(0.0, (analyzed_at - captured_at) / 1000.0))
            publisher.publish(json.dumps(event, separators=(",", ":")).encode("utf-8"))
            EVENTS_PUBLISHED.inc()
        except (AMQPConnectionError, AMQPChannelError):
            raise  # let the reconnect loop handle it; message stays unacked
        except Exception:
            BATCHES_FAILED.inc()
            PUBLISH_ERRORS.inc()
            logger.exception("Failed to process batch; dropping (nack, no requeue)")
            try:
                channel.basic_nack(method.delivery_tag, requeue=False)
            except Exception:
                pass
            return

        # Success: ack the input message first, then release the Redis frames.
        channel.basic_ack(method.delivery_tag)
        self._maybe_ack_redis(envelope)
        BATCH_LATENCY.observe(time.monotonic() - t0)
        s = event["summary"]
        logger.info(
            "batch %s camera=%s usecase=%s frames=%d persons=%d violations=%d %s",
            event.get("batch_id"), event.get("camera", {}).get("id"),
            event.get("usecase", {}).get("slug"), s["frames_analyzed"],
            s["total_detections"], s["frames_with_violation"],
            "VIOLATION" if s["violation"] else "",
        )

    def _resolve_frames(self, envelope: dict) -> list[bytes | None]:
        frames = envelope["frames"]
        if frames.get("transport") == "inline":
            return [base64.b64decode(item) for item in frames["items"]]
        return self._redis.fetch_frames(frames["redis_key"], frames["fields"])

    def _maybe_ack_redis(self, envelope: dict) -> None:
        frames = envelope.get("frames", {})
        if frames.get("transport") == "inline" or not frames.get("ack_required"):
            return
        try:
            self._redis.ack(frames["redis_key"])
        except Exception:
            logger.warning("Redis ack failed for %s (TTL will reclaim)", frames.get("redis_key"))

    def _cleanup(self) -> None:
        BROKER_UP.set(0)
        self._redis.close()
        logger.info("ai-person-detection stopped")
