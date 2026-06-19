"""Notification publisher.

Pushes each built/extended event onto the notification queue (consumed by the
notification service). Uses a thread-local RabbitMQ channel so analysis worker
threads can publish concurrently without sharing a pika channel.
"""

from __future__ import annotations

import json
import logging
import threading

import pika
from pika.exceptions import AMQPError

from src.config import settings

logger = logging.getLogger(__name__)


class Notifier:
    def __init__(self) -> None:
        self._params = pika.URLParameters(settings.rabbitmq_url)
        self._queue = settings.notification_queue
        self._local = threading.local()

    def _channel(self):
        ch = getattr(self._local, "channel", None)
        conn = getattr(self._local, "conn", None)
        if ch is not None and conn is not None and conn.is_open and ch.is_open:
            return ch
        conn = pika.BlockingConnection(self._params)
        ch = conn.channel()
        ch.queue_declare(queue=self._queue, durable=True)
        self._local.conn = conn
        self._local.channel = ch
        return ch

    def publish(self, event: dict) -> None:
        body = json.dumps(event, separators=(",", ":")).encode("utf-8")
        props = pika.BasicProperties(delivery_mode=2, content_type="application/json")
        try:
            ch = self._channel()
            ch.basic_publish(exchange="", routing_key=self._queue, body=body, properties=props)
        except (AMQPError, OSError):
            # Rebuild the thread-local channel once and retry.
            self._local.channel = None
            self._local.conn = None
            ch = self._channel()
            ch.basic_publish(exchange="", routing_key=self._queue, body=body, properties=props)
