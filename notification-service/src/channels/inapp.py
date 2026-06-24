"""In-app channel: publish the alert to the user's Redis channel. The backend
WebSocket relays it to the browser in real time."""

from __future__ import annotations

import json
import logging

from src.config import settings
from src.metrics import WS_PUBLISHED
from src.redis_client import get_redis

logger = logging.getLogger(__name__)


class InAppChannel:
    name = "IN_APP"
    available = True  # always — only needs Redis, which the service requires

    def send(self, alert: dict, user: dict) -> tuple[str, str | None]:
        channel = f"{settings.ws_user_channel_prefix}{user['id']}"
        payload = json.dumps({"type": "alert.new", "alert": alert}, default=str)
        try:
            get_redis().publish(channel, payload)
            WS_PUBLISHED.inc()
            return "SENT", None
        except Exception as exc:  # noqa: BLE001
            logger.exception("In-app publish failed for user %s", user["id"])
            return "FAILED", str(exc)
