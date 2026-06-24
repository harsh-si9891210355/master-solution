"""Delivers an alert to a user over a set of channels, recording an audit row
per (alert × channel × user). Idempotent: RabbitMQ redeliveries are no-ops."""

from __future__ import annotations

import logging

from src.channels.email import EmailChannel
from src.channels.inapp import InAppChannel
from src.channels.webpush import WebPushChannel
from src.metrics import DELIVERIES

logger = logging.getLogger(__name__)


class Dispatcher:
    def __init__(self, db) -> None:
        self._db = db
        self._channels = {
            "IN_APP": InAppChannel(),
            "EMAIL": EmailChannel(),
            "WEB_PUSH": WebPushChannel(db),
        }

    def record_suppression(self, alert_id: int, user_id: int, channel: str, reason: str) -> None:
        self._db.record_delivery(
            alert_id=alert_id, user_id=user_id, channel=channel,
            status="SUPPRESSED", suppressed_reason=reason,
        )
        DELIVERIES.labels(channel=channel, status="SUPPRESSED").inc()

    def deliver(self, alert: dict, user: dict, channels: list[str]) -> None:
        alert_id = alert["id"]
        for channel_name in channels:
            channel = self._channels.get(channel_name)
            if not channel:
                continue
            # Channel enabled in prefs but not configured yet (e.g. no VAPID/SMTP
            # keys): record a clean SUPPRESSED row instead of a noisy FAILED, and
            # it starts working automatically once keys are added.
            if not getattr(channel, "available", True):
                self.record_suppression(alert_id, user["id"], channel_name, "channel_not_configured")
                continue
            # Claim the (alert, channel, user) slot first; a duplicate means another
            # delivery already happened for this redelivered message.
            fresh = self._db.record_delivery(
                alert_id=alert_id, user_id=user["id"], channel=channel_name, status="QUEUED"
            )
            if not fresh:
                logger.debug("Skipping duplicate delivery %s:%s:%s", alert_id, channel_name, user["id"])
                continue
            status, error = channel.send(alert, user)
            self._db.update_delivery_status(alert_id, user["id"], channel_name, status, error)
            DELIVERIES.labels(channel=channel_name, status=status).inc()
