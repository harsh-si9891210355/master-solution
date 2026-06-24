"""Web Push channel (VAPID). Sends to every browser subscription a user has, and
prunes endpoints the push service reports as gone (404/410)."""

from __future__ import annotations

import json
import logging

from pywebpush import WebPushException, webpush

from src.config import settings

logger = logging.getLogger(__name__)


class WebPushChannel:
    name = "WEB_PUSH"

    def __init__(self, db) -> None:
        self._db = db
        self.available = bool(settings.vapid_private_key)

    def send(self, alert: dict, user: dict) -> tuple[str, str | None]:
        if not self.available:
            return "FAILED", "VAPID keys not configured"

        subs = self._db.subscriptions(user["id"])
        if not subs:
            return "FAILED", "No push subscriptions"

        payload = json.dumps(
            {
                "title": f"{alert.get('severity', '')} — {alert.get('title', 'Security Alert')}",
                "body": f"{alert.get('camera_name')} · {alert.get('location_name')}",
                "alertId": alert.get("id"),
                "url": f"{settings.frontend_url}/dashboard?tab=notifications&alert={alert.get('id')}",
            }
        )

        any_sent = False
        last_error: str | None = None
        for sub in subs:
            subscription_info = {
                "endpoint": sub["endpoint"],
                "keys": {"p256dh": sub["p256dh_key"], "auth": sub["auth_key"]},
            }
            try:
                webpush(
                    subscription_info=subscription_info,
                    data=payload,
                    vapid_private_key=settings.vapid_private_key,
                    vapid_claims={"sub": settings.vapid_subject},
                )
                any_sent = True
            except WebPushException as exc:
                status_code = getattr(getattr(exc, "response", None), "status_code", None)
                if status_code in (404, 410):
                    logger.info("Pruning dead push subscription %s", sub["endpoint"][:40])
                    self._db.delete_subscription(sub["endpoint"])
                else:
                    last_error = str(exc)
                    logger.warning("Web push failed for user %s: %s", user["id"], exc)

        if any_sent:
            return "SENT", None
        return "FAILED", last_error or "All push endpoints failed"
