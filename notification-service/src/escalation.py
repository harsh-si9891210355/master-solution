"""Acknowledgement-driven escalation on a Redis sorted set.

When an alert matching an enabled escalation rule is created, each step is
scheduled at now + cumulative wait. A background worker pops due steps and fires
them only if the alert is still in NEW status (i.e. nobody acknowledged it) —
acknowledgement therefore cancels escalation implicitly. The alert payload is
cached in Redis so the worker can re-deliver without rebuilding it.
"""

from __future__ import annotations

import json
import logging
import threading
import time

from src.config import settings
from src.metrics import ESCALATIONS_FIRED, ESCALATIONS_SCHEDULED, PENDING_ESCALATIONS
from src.redis_client import get_redis

logger = logging.getLogger(__name__)

_PAYLOAD_KEY = "alert:payload:{alert_id}"
_PAYLOAD_TTL_S = 86_400
_POLL_INTERVAL_S = 5


class EscalationManager:
    def __init__(self, db, dispatcher) -> None:
        self._db = db
        self._dispatcher = dispatcher
        self._redis = get_redis()
        self._stop = threading.Event()
        self._thread: threading.Thread | None = None

    # --- scheduling ----------------------------------------------------------
    def schedule(self, alert_id: int, payload: dict, rule: dict) -> None:
        steps = rule.get("steps") or []
        if not steps:
            return
        self._redis.set(_PAYLOAD_KEY.format(alert_id=alert_id), json.dumps(payload, default=str), ex=_PAYLOAD_TTL_S)
        cumulative = 0.0
        now = time.time()
        for step in steps:
            cumulative += float(step.get("wait_seconds", 0))
            member = json.dumps(
                {
                    "alert_id": alert_id,
                    "step_order": step["step_order"],
                    "role_id": step.get("escalate_to_role_id"),
                    "channels": [c for c in (step.get("channels") or "").split(",") if c] or ["IN_APP"],
                }
            )
            self._redis.zadd(settings.escalation_zset, {member: now + cumulative})
            ESCALATIONS_SCHEDULED.inc()

    # --- worker --------------------------------------------------------------
    def start(self) -> None:
        self._thread = threading.Thread(target=self._run, name="escalation-worker", daemon=True)
        self._thread.start()

    def stop(self) -> None:
        self._stop.set()

    def _run(self) -> None:
        logger.info("Escalation worker started")
        while not self._stop.is_set():
            try:
                self._tick()
            except Exception:  # noqa: BLE001
                logger.exception("Escalation tick failed")
            self._stop.wait(_POLL_INTERVAL_S)

    def _tick(self) -> None:
        now = time.time()
        due = self._redis.zrangebyscore(settings.escalation_zset, "-inf", now)
        PENDING_ESCALATIONS.set(self._redis.zcard(settings.escalation_zset))
        for member in due:
            # Claim atomically so only one worker fires a given step.
            if self._redis.zrem(settings.escalation_zset, member) == 0:
                continue
            try:
                self._fire(json.loads(member))
            except Exception:  # noqa: BLE001
                logger.exception("Failed to fire escalation step")

    def _fire(self, step: dict) -> None:
        alert_id = step["alert_id"]
        status = self._db.alert_status(alert_id)
        if status != "NEW":
            logger.debug("Alert %s no longer NEW (%s) — escalation cancelled", alert_id, status)
            return

        role_id = step.get("role_id")
        if not role_id:
            return
        raw = self._redis.get(_PAYLOAD_KEY.format(alert_id=alert_id))
        if not raw:
            logger.warning("No cached payload for alert %s — skipping escalation", alert_id)
            return
        payload = json.loads(raw)
        channels = step.get("channels") or ["IN_APP"]

        for user_id in self._db.role_member_ids(role_id):
            user = {"id": user_id, "email": self._user_email(user_id)}
            self._dispatcher.deliver(payload, user, channels)
        ESCALATIONS_FIRED.inc()
        logger.info("Escalated alert %s to role %s over %s", alert_id, role_id, channels)

    def _user_email(self, user_id: int) -> str | None:
        # Email is looked up lazily; recipients() already carries it for the
        # initial fan-out, but escalation resolves by role membership.
        with self._db._engine.connect() as conn:  # noqa: SLF001 — internal helper
            from sqlalchemy import text

            row = conn.execute(text("SELECT email FROM users WHERE id = :id"), {"id": user_id}).first()
            return row[0] if row else None
