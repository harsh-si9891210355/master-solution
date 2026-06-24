"""RabbitMQ consumer for the notification-queue.

For each built event published by the eventmanager:
  * is_new=False  → extend the existing alert (bump count / end-time), no notify.
  * is_new=True   → classify, persist an Alert, fan out to recipients per their
                    preferences, and schedule escalation if a rule matches.
"""

from __future__ import annotations

import json
import logging
from datetime import datetime, timezone

import pika
from pika.exceptions import AMQPError

from src.classification import classify, title_for
from src.config import settings
from src.db import Database
from src.dispatcher import Dispatcher
from src.escalation import EscalationManager
from src.metrics import ALERTS_CREATED, ALERTS_EXTENDED, MESSAGES_RECEIVED, STAGE_ERRORS
from src.routing import decide_for_user, recipients

logger = logging.getLogger(__name__)


def _parse_dt(value) -> datetime:
    if isinstance(value, datetime):
        return value
    if value:
        try:
            return datetime.fromisoformat(str(value).replace("Z", "+00:00"))
        except ValueError:
            pass
    return datetime.now(timezone.utc)


class NotificationConsumer:
    def __init__(self) -> None:
        self._db = Database()
        self._dispatcher = Dispatcher(self._db)
        self._escalation = EscalationManager(self._db, self._dispatcher)
        self._params = pika.URLParameters(settings.rabbitmq_url)
        self._connection: pika.BlockingConnection | None = None
        self._channel = None

    def start(self) -> None:
        # Wait for the backend to create the shared schema before consuming, so a
        # cold-start race never drops the first detections.
        self._db.wait_for_schema()
        self._escalation.start()
        self._connection = pika.BlockingConnection(self._params)
        self._channel = self._connection.channel()
        self._channel.queue_declare(queue=settings.notification_queue, durable=True)
        self._channel.basic_qos(prefetch_count=settings.prefetch)
        self._channel.basic_consume(queue=settings.notification_queue, on_message_callback=self._on_message)
        logger.info("Consuming from %s", settings.notification_queue)
        self._channel.start_consuming()

    def shutdown(self) -> None:
        self._escalation.stop()
        try:
            if self._channel and self._channel.is_open:
                self._channel.stop_consuming()
            if self._connection and self._connection.is_open:
                self._connection.close()
        except AMQPError:
            pass

    # --- message handling ----------------------------------------------------
    def _on_message(self, channel, method, _properties, body) -> None:
        MESSAGES_RECEIVED.inc()
        try:
            message = json.loads(body)
            self._handle(message)
            channel.basic_ack(delivery_tag=method.delivery_tag)
        except Exception:  # noqa: BLE001
            STAGE_ERRORS.labels(stage="handle").inc()
            logger.exception("Failed to process notification message")
            # Drop poison messages rather than loop forever.
            channel.basic_nack(delivery_tag=method.delivery_tag, requeue=False)

    def _handle(self, message: dict) -> None:
        event_id = message.get("event_id")
        is_new = message.get("is_new", True)
        end_time = _parse_dt(message.get("event_end_time"))

        if not is_new:
            existing = self._db.find_alert_by_event(event_id) if event_id is not None else None
            if existing:
                self._db.extend_alert(existing["id"], end_time)
                ALERTS_EXTENDED.inc()
            return

        camera_id = message["camera_id"]
        location_id = message["location_id"]
        usecase_id = message["usecase_id"]
        usecase_slug = message.get("usecase_slug")
        start_time = _parse_dt(message.get("event_start_time"))

        severity, category = classify(usecase_slug)
        usecase_name = self._db.usecase_name(usecase_id)
        camera_name = self._db.camera_name(camera_id) or f"Camera {camera_id}"
        location_name = self._db.location_name(location_id) or f"Location {location_id}"
        title = title_for(usecase_slug, usecase_name)

        alert_id = self._db.insert_alert(
            event_id=event_id,
            camera_id=camera_id,
            location_id=location_id,
            usecase_id=usecase_id,
            title=title,
            severity=severity,
            category=category,
            evidence_url=message.get("evidence_url"),
            start=start_time,
            end=end_time,
        )
        ALERTS_CREATED.inc()

        payload = {
            "id": alert_id,
            "event_id": event_id,
            "camera_id": camera_id,
            "camera_name": camera_name,
            "location_id": location_id,
            "location_name": location_name,
            "usecase_id": usecase_id,
            "usecase_name": usecase_name or usecase_slug or str(usecase_id),
            "title": title,
            "severity": severity,
            "category": category,
            "status": "NEW",
            "evidence_url": message.get("evidence_url"),
            "occurrence_count": 1,
            "event_start_time": message.get("event_start_time"),
            "event_end_time": message.get("event_end_time"),
            "acknowledged_by": None,
            "acknowledged_at": None,
            "incident_id": None,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": None,
        }

        now_utc = datetime.now(timezone.utc)
        for user in recipients(self._db):
            pref = self._db.preference(user["id"])
            decision = decide_for_user(pref, severity, now_utc)
            for channel_name, reason in decision["suppressed"]:
                self._dispatcher.record_suppression(alert_id, user["id"], channel_name, reason)
            if decision["deliver"]:
                self._dispatcher.deliver(payload, user, decision["deliver"])

        rule = self._db.matching_escalation_rule(usecase_id, severity)
        if rule:
            self._escalation.schedule(alert_id, payload, rule)
