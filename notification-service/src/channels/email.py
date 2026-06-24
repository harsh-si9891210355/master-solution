"""Email channel via SMTP (reuses the same mailbox config as the backend)."""

from __future__ import annotations

import logging
import smtplib
from email.mime.text import MIMEText

from src.config import settings

logger = logging.getLogger(__name__)


class EmailChannel:
    name = "EMAIL"

    def __init__(self) -> None:
        self.available = settings.email_enabled and bool(settings.smtp_host)

    def send(self, alert: dict, user: dict) -> tuple[str, str | None]:
        if not self.available:
            return "FAILED", "Email channel not configured"
        to_email = user.get("email")
        if not to_email:
            return "FAILED", "User has no email"

        severity = alert.get("severity", "")
        title = alert.get("title", "Security Alert")
        link = f"{settings.frontend_url}/dashboard?tab=notifications&alert={alert.get('id')}"
        body = (
            f"{severity} alert: {title}\n\n"
            f"Camera: {alert.get('camera_name')}\n"
            f"Location: {alert.get('location_name')}\n"
            f"Category: {alert.get('category')}\n"
            f"Time: {alert.get('event_start_time')}\n\n"
            f"View in VISION X: {link}\n"
        )
        msg = MIMEText(body)
        msg["Subject"] = f"[VISION X] {severity} — {title}"
        msg["From"] = settings.smtp_from or settings.smtp_user
        msg["To"] = to_email
        try:
            with smtplib.SMTP(settings.smtp_host, settings.smtp_port) as server:
                server.starttls()
                if settings.smtp_user:
                    server.login(settings.smtp_user, settings.smtp_password)
                server.sendmail(msg["From"], [to_email], msg.as_string())
            return "SENT", None
        except Exception as exc:  # noqa: BLE001
            logger.exception("Email send failed for %s", to_email)
            return "FAILED", str(exc)
