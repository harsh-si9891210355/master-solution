"""Channel protocol. Each channel delivers an alert to one user and reports a
delivery status string from the NotificationDelivery status enum."""

from __future__ import annotations

from typing import Protocol


class Channel(Protocol):
    name: str  # one of IN_APP / WEB_PUSH / EMAIL

    def send(self, alert: dict, user: dict) -> tuple[str, str | None]:
        """Return (status, error). status ∈ SENT/FAILED."""
        ...
