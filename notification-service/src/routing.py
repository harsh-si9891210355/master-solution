"""Decide who gets an alert and over which channels.

Applies per-user preferences: minimum severity, global mute, quiet hours (with a
CRITICAL break-through option), and per-channel enable flags. Returns, for each
recipient, the channels to deliver on plus any suppressions (recorded for audit).
"""

from __future__ import annotations

import logging
from datetime import datetime, time, timezone
from zoneinfo import ZoneInfo

from src.classification import severity_rank
from src.config import settings

logger = logging.getLogger(__name__)

ALL_CHANNELS = ("IN_APP", "WEB_PUSH", "EMAIL")

# Defaults applied when a user has no notification_preferences row yet.
_DEFAULT_PREF = {
    "in_app_enabled": True,
    "web_push_enabled": False,
    "email_enabled": True,
    "min_severity": "LOW",
    "quiet_hours_enabled": False,
    "quiet_hours_start": None,
    "quiet_hours_end": None,
    "quiet_hours_timezone": "UTC",
    "override_critical": True,
    "muted_until": None,
}

_CHANNEL_PREF_KEY = {
    "IN_APP": "in_app_enabled",
    "WEB_PUSH": "web_push_enabled",
    "EMAIL": "email_enabled",
}


def _in_quiet_hours(pref: dict, now_utc: datetime) -> bool:
    if not pref.get("quiet_hours_enabled"):
        return False
    start: time | None = pref.get("quiet_hours_start")
    end: time | None = pref.get("quiet_hours_end")
    if not start or not end:
        return False
    try:
        tz = ZoneInfo(pref.get("quiet_hours_timezone") or "UTC")
    except Exception:  # noqa: BLE001
        tz = timezone.utc
    local_now = now_utc.astimezone(tz).time()
    if start <= end:
        return start <= local_now <= end
    # Window crosses midnight (e.g. 22:00 → 06:00).
    return local_now >= start or local_now <= end


def decide_for_user(pref: dict | None, severity: str, now_utc: datetime) -> dict:
    """Return {'deliver': [channel...], 'suppressed': [(channel, reason)...]}."""
    p = {**_DEFAULT_PREF, **(pref or {})}
    deliver: list[str] = []
    suppressed: list[tuple[str, str]] = []

    is_critical = severity.upper() == "CRITICAL"

    # Global mute.
    if p.get("muted_until") and p["muted_until"] > now_utc and not is_critical:
        return {"deliver": [], "suppressed": [(c, "muted") for c in ALL_CHANNELS]}

    # Below minimum severity.
    if severity_rank(severity) < severity_rank(p.get("min_severity", "LOW")):
        return {"deliver": [], "suppressed": [(c, "below_min_severity") for c in ALL_CHANNELS]}

    quiet = _in_quiet_hours(p, now_utc)
    quiet_breakthrough = is_critical and p.get("override_critical", True)

    for channel in ALL_CHANNELS:
        if not p.get(_CHANNEL_PREF_KEY[channel], False):
            continue  # channel disabled — not a suppression, just off
        if quiet and not quiet_breakthrough:
            suppressed.append((channel, "quiet_hours"))
            continue
        deliver.append(channel)

    return {"deliver": deliver, "suppressed": suppressed}


def recipients(db) -> list[dict]:
    return db.recipients(settings.recipient_role_list)
