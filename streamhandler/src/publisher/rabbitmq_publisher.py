"""RabbitMQ producer — the per-use-case queue transport.

Each batch is published to a durable **direct exchange** with the use-case id as
the routing key. The producer also declares and binds one **durable queue per
use-case** (named after the use-case slug); because the queue exists and is durable,
messages accumulate in it even while that use-case's AI service is offline, and
are delivered once it (re)connects.

Threading: pika connections/channels are **not** thread-safe, and each camera
runs in its own worker thread. So this publisher keeps a **thread-local**
connection + channel — every worker thread gets its own — which sidesteps
sharing entirely. Declarations are idempotent and cached per channel.

Reliability: with publish-confirms enabled, ``basic_publish`` blocks until the
broker confirms the message is safely enqueued (or raises), so a publish that
returns has been durably accepted. A dropped connection is transparently
re-established and the publish retried once.
"""

from __future__ import annotations

import logging
import threading

import pika
from pika.exceptions import AMQPError

from src.config import settings

logger = logging.getLogger(__name__)


class RabbitMQPublisher:
    def __init__(self) -> None:
        self._params = pika.URLParameters(settings.rabbitmq_url)
        self._exchange = settings.rabbitmq_exchange
        self._confirms = settings.rabbitmq_publish_confirms
        self._local = threading.local()
        # Track every connection we open so shutdown can best-effort close them.
        self._connections: list[pika.BlockingConnection] = []
        self._lock = threading.Lock()

    def queue_for(self, usecase_id: int, usecase_slug: str) -> str:
        return settings.rabbitmq_queue_template.format(
            usecase_id=usecase_id, usecase_slug=usecase_slug
        )

    # -- thread-local channel -------------------------------------------------
    def _channel(self):
        ch = getattr(self._local, "channel", None)
        conn = getattr(self._local, "connection", None)
        if ch is not None and conn is not None and conn.is_open and ch.is_open:
            return ch

        conn = pika.BlockingConnection(self._params)
        ch = conn.channel()
        ch.exchange_declare(self._exchange, exchange_type="direct", durable=True)
        if self._confirms:
            ch.confirm_delivery()
        self._local.connection = conn
        self._local.channel = ch
        self._local.declared = set()
        with self._lock:
            self._connections.append(conn)
        return ch

    def _reset_channel(self) -> None:
        conn = getattr(self._local, "connection", None)
        if conn is not None:
            try:
                conn.close()
            except Exception:
                pass
        self._local.connection = None
        self._local.channel = None
        self._local.declared = set()

    def _ensure_queue(self, ch, usecase_id: int, usecase_slug: str) -> str:
        queue = self.queue_for(usecase_id, usecase_slug)
        declared = getattr(self._local, "declared", None)
        if declared is None:
            declared = set()
            self._local.declared = declared
        if usecase_id not in declared:
            ch.queue_declare(queue=queue, durable=True)
            ch.queue_bind(queue, self._exchange, routing_key=usecase_slug)
            declared.add(usecase_id)
        return queue

    # -- publish --------------------------------------------------------------
    def publish(self, usecase_id: int, usecase_slug: str, *, camera_id: int, value: bytes) -> None:
        """Publish one batch envelope to a use-case's queue. Raises on failure
        after one reconnect attempt so the caller can count/log it."""
        props = pika.BasicProperties(
            delivery_mode=2,  # persistent: survives a broker restart
            content_type="application/json",
            headers={"camera_id": camera_id},
        )
        try:
            ch = self._channel()
            self._ensure_queue(ch, usecase_id, usecase_slug)
            ch.basic_publish(
                exchange=self._exchange,
                routing_key=usecase_slug,
                body=value,
                properties=props,
                mandatory=self._confirms,
            )
        except (AMQPError, OSError) as exc:
            # Connection likely dropped — rebuild it once and retry.
            logger.warning("RabbitMQ publish failed (%s); reconnecting and retrying", exc)
            self._reset_channel()
            ch = self._channel()
            self._ensure_queue(ch, usecase_id, usecase_slug)
            ch.basic_publish(
                exchange=self._exchange,
                routing_key=usecase_slug,
                body=value,
                properties=props,
                mandatory=self._confirms,
            )

    def close(self) -> None:
        # Best-effort: connections are owned by worker threads (which have
        # already stopped by shutdown time); closing sockets here is harmless.
        with self._lock:
            conns = list(self._connections)
            self._connections.clear()
        for conn in conns:
            try:
                if conn.is_open:
                    conn.close()
            except Exception:  # pragma: no cover - best effort
                pass
