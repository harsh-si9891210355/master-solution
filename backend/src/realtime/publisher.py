"""Publish alert events onto Redis so connected WebSocket clients receive them."""

from __future__ import annotations

import json
import logging

from src.core.config import settings
from src.realtime.redis_client import get_sync_redis

logger = logging.getLogger(__name__)


def _publish(channel: str, payload: dict) -> None:
    try:
        get_sync_redis().publish(channel, json.dumps(payload, default=str))
    except Exception:  # best-effort — never break the request on a Redis hiccup
        logger.exception("Failed to publish to Redis channel %s", channel)


def publish_alert_update(alert_payload: dict) -> None:
    """Broadcast a lifecycle change (ack / status / incident) to all operators."""
    _publish(settings.ws_broadcast_channel, {"type": "alert.update", "alert": alert_payload})


def publish_alert_new(user_id: int, alert_payload: dict) -> None:
    """Deliver a new alert to a specific user's channel."""
    _publish(f"{settings.ws_user_channel_prefix}{user_id}", {"type": "alert.new", "alert": alert_payload})
