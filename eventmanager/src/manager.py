"""Event Manager — multi-threaded consumer / aggregator.

Topology (per the design):

  RabbitMQ event queues ──(receiver thread each)──▶ in-memory Queue(maxsize) ──▶ worker pool
                                                     (backpressure buffer)        (analyse)

  * Receiver threads (recv_from_event_queue): one per input queue. Each pulls a
    message (one batch), put()s it as a single item onto the bounded in-memory
    queue, then acks RabbitMQ. The blocking put() applies backpressure — when
    the buffer is full the receiver stops acking, so RabbitMQ stops delivering.
    No logic runs while a batch waits in the buffer.

  * Analysis worker threads (analyse_queue_msgs): each get()s one whole batch and
    runs the aggregator (gap-vs-threshold decide → extend or build evidence).

The two stages are decoupled so fast ingestion isn't blocked by slow video
building.
"""

from __future__ import annotations

import json
import logging
import queue
import threading

import pika
from pika.exceptions import AMQPConnectionError, AMQPChannelError

from src.aggregator import EventAggregator
from src.config import settings
from src.db import EventStore
from src.frame_codec import FrameResolver
from src.metrics import (
    ACTIVE_WORKERS,
    BATCHES_FAILED,
    BATCHES_PROCESSED,
    BATCHES_RECEIVED,
    INMEM_QUEUE_DEPTH,
)
from src.models import EventBatch
from src.notifier import Notifier
from src.redis_frames import RedisFrameReader
from src.storage import EvidenceStore

logger = logging.getLogger(__name__)


class EventManager:
    def __init__(self) -> None:
        self._stop = threading.Event()
        self._queue: queue.Queue = queue.Queue(maxsize=settings.queue_maxsize)

        self._redis = RedisFrameReader()
        self._redis.ping()
        self._evidence = EvidenceStore()
        self._evidence.ensure_bucket()
        self._db = EventStore()
        self._notifier = Notifier()
        self._aggregator = EventAggregator(
            FrameResolver(self._redis), self._db, self._evidence, self._notifier
        )

        self._threads: list[threading.Thread] = []

    # -- lifecycle ------------------------------------------------------------
    def run(self) -> None:
        for q in settings.input_queue_list:
            t = threading.Thread(target=self._recv_from_event_queue, args=(q,),
                                 name=f"recv-{q}", daemon=True)
            t.start()
            self._threads.append(t)

        for i in range(settings.analysis_workers):
            t = threading.Thread(target=self._analyse_queue_msgs, name=f"worker-{i}", daemon=True)
            t.start()
            self._threads.append(t)
        ACTIVE_WORKERS.set(settings.analysis_workers)

        logger.info(
            "EventManager running: %d receiver(s) %s, %d worker(s), buffer=%d",
            len(settings.input_queue_list), settings.input_queue_list,
            settings.analysis_workers, settings.queue_maxsize,
        )
        # Block the main thread until stopped.
        while not self._stop.wait(1.0):
            INMEM_QUEUE_DEPTH.set(self._queue.qsize())

    def shutdown(self) -> None:
        logger.info("EventManager shutting down…")
        self._stop.set()
        for t in self._threads:
            t.join(timeout=10.0)
        self._redis.close()
        logger.info("EventManager stopped")

    # -- receiver -------------------------------------------------------------
    def _recv_from_event_queue(self, queue_name: str) -> None:
        backoff = 2.0
        while not self._stop.is_set():
            try:
                self._recv_session(queue_name)
                backoff = 2.0
            except (AMQPConnectionError, AMQPChannelError, OSError) as exc:
                if self._stop.is_set():
                    break
                logger.warning("[%s] broker error (%s); reconnecting in %.0fs",
                               queue_name, exc, backoff)
                self._stop.wait(backoff)
                backoff = min(backoff * 2, 30.0)

    def _recv_session(self, queue_name: str) -> None:
        conn = pika.BlockingConnection(pika.URLParameters(settings.rabbitmq_url))
        channel = conn.channel()
        channel.queue_declare(queue=queue_name, durable=True)
        channel.basic_qos(prefetch_count=settings.prefetch)
        logger.info("[%s] receiver consuming", queue_name)
        try:
            for method, _props, body in channel.consume(queue_name, inactivity_timeout=1.0):
                if self._stop.is_set():
                    break
                if method is None:
                    continue
                if self._enqueue(body):
                    channel.basic_ack(method.delivery_tag)
                    BATCHES_RECEIVED.labels(queue=queue_name).inc()
                else:
                    # Stopped while applying backpressure — requeue for next run.
                    channel.basic_nack(method.delivery_tag, requeue=True)
                    break
        finally:
            try:
                channel.cancel()
                conn.close()
            except Exception:
                pass

    def _enqueue(self, body: bytes) -> bool:
        """Put one batch onto the bounded buffer, blocking (backpressure) until
        there's room. Returns False if we stopped before it could be enqueued."""
        try:
            item = json.loads(body)
        except (ValueError, TypeError):
            logger.warning("Dropping non-JSON message (%d bytes)", len(body))
            return True  # malformed → ack and move on, don't requeue forever
        while not self._stop.is_set():
            try:
                self._queue.put(item, timeout=1.0)
                INMEM_QUEUE_DEPTH.set(self._queue.qsize())
                return True
            except queue.Full:
                continue
        return False

    # -- worker ---------------------------------------------------------------
    def _analyse_queue_msgs(self) -> None:
        while not self._stop.is_set():
            try:
                item = self._queue.get(timeout=1.0)
            except queue.Empty:
                continue
            try:
                batch = EventBatch.from_message(item)
                self._aggregator.analyse(batch)
                BATCHES_PROCESSED.inc()
                # The EM is the second consumer of the shared batch: ack the
                # StreamHandler's reference count once per batch (new OR extend),
                # so the frames are released once every stage has acked. Only on
                # success — a failed batch leaves the count for the TTL backstop.
                self._ack_frames(batch)
            except Exception:
                BATCHES_FAILED.inc()
                logger.exception("Failed to process batch")
            finally:
                self._queue.task_done()
                INMEM_QUEUE_DEPTH.set(self._queue.qsize())

    def _ack_frames(self, batch: EventBatch) -> None:
        if not batch.ack_required or not batch.redis_key:
            return
        try:
            self._redis.ack(batch.redis_key)
        except Exception:
            logger.warning("Redis ack failed for %s (TTL will reclaim)", batch.redis_key)
