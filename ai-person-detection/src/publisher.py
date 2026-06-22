"""Event publisher — emits the analysis JSON to the output queue.

Publishes to the default exchange with the output queue name as the routing key
(so messages land directly in that durable queue). The queue is declared
durable and messages persistent, so events survive a broker restart and wait
for a downstream consumer (alerting, persistence, dashboards, …).
"""

from __future__ import annotations

import logging

import pika

from src.config import settings

logger = logging.getLogger(__name__)


class EventPublisher:
    def __init__(self, channel: "pika.adapters.blocking_connection.BlockingChannel") -> None:
        # Reuses the service's channel (single-threaded consume+publish loop).
        self._channel = channel
        self._queue = settings.output_queue
        self._channel.queue_declare(queue=self._queue, durable=True)

    def publish(self, body: bytes) -> None:
        self._channel.basic_publish(
            exchange="",                 # default exchange: routing_key == queue name
            routing_key=self._queue,
            body=body,
            properties=pika.BasicProperties(
                delivery_mode=2,         # persistent
                content_type="application/json",
            ),
            mandatory=settings.publish_confirms,
        )
