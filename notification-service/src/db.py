"""Postgres access for the notification service.

Shares the backend's schema (alerts, alert_timeline, notification_deliveries,
notification_preferences, notification_subscriptions, users, roles, …). Uses raw
SQL via a pooled SQLAlchemy engine — the same approach the eventmanager takes.
Enum columns are cast explicitly because Postgres has no implicit text→enum cast.
"""

from __future__ import annotations

import logging
import time
from datetime import datetime

from sqlalchemy import create_engine, text

from src.config import settings

logger = logging.getLogger(__name__)


class Database:
    def __init__(self) -> None:
        self._engine = create_engine(settings.database_url, future=True, pool_pre_ping=True)

    def wait_for_schema(self, timeout_s: int = 120, interval_s: int = 3) -> bool:
        """Block until the backend-owned `alerts` table exists (the backend creates
        it on startup). Prevents dropping the first messages on a cold start."""
        deadline = time.time() + timeout_s
        while time.time() < deadline:
            try:
                with self._engine.connect() as conn:
                    conn.execute(text("SELECT 1 FROM alerts LIMIT 1"))
                return True
            except Exception:
                logger.info("Waiting for `alerts` table to be created by the backend…")
                time.sleep(interval_s)
        logger.warning("Timed out waiting for schema; proceeding anyway")
        return False

    # --- enrichment ----------------------------------------------------------
    def _translated_name(self, table: str, fk: str, fk_id: int) -> str | None:
        with self._engine.connect() as conn:
            row = conn.execute(
                text(
                    f"SELECT name FROM {table} WHERE {fk} = :id "
                    "ORDER BY (language_code = 'en') DESC, id ASC LIMIT 1"
                ),
                {"id": fk_id},
            ).first()
            return row[0] if row else None

    def camera_name(self, camera_id: int) -> str | None:
        return self._translated_name("camera_translations", "camera_id", camera_id)

    def location_name(self, location_id: int) -> str | None:
        return self._translated_name("location_translations", "location_id", location_id)

    def usecase_name(self, usecase_id: int) -> str | None:
        return self._translated_name("usecase_translations", "usecase_id", usecase_id)

    # --- alerts --------------------------------------------------------------
    def find_alert_by_event(self, event_id: int) -> dict | None:
        with self._engine.connect() as conn:
            row = conn.execute(
                text("SELECT id, occurrence_count FROM alerts WHERE event_id = :eid ORDER BY id DESC LIMIT 1"),
                {"eid": event_id},
            ).mappings().first()
            return dict(row) if row else None

    def extend_alert(self, alert_id: int, new_end: datetime) -> None:
        with self._engine.begin() as conn:
            conn.execute(
                text(
                    "UPDATE alerts SET occurrence_count = occurrence_count + 1, "
                    "event_end_time = GREATEST(event_end_time, :end), updated_at = now() "
                    "WHERE id = :id"
                ),
                {"end": new_end, "id": alert_id},
            )

    def insert_alert(
        self,
        *,
        event_id: int | None,
        camera_id: int,
        location_id: int,
        usecase_id: int,
        title: str,
        severity: str,
        category: str,
        evidence_url: str | None,
        start: datetime,
        end: datetime,
    ) -> int:
        with self._engine.begin() as conn:
            row = conn.execute(
                text(
                    "INSERT INTO alerts "
                    "(event_id, camera_id, location_id, usecase_id, title, severity, category, "
                    " status, evidence_url, event_start_time, event_end_time, occurrence_count, created_at) "
                    "VALUES (:eid, :cid, :lid, :uid, :title, "
                    " CAST(:sev AS alert_severity_enum), CAST(:cat AS alert_category_enum), "
                    " CAST('NEW' AS alert_status_enum), :url, :start, :end, 1, now()) "
                    "RETURNING id"
                ),
                {
                    "eid": event_id, "cid": camera_id, "lid": location_id, "uid": usecase_id,
                    "title": title, "sev": severity, "cat": category, "url": evidence_url,
                    "start": start, "end": end,
                },
            )
            alert_id = int(row.scalar_one())
            conn.execute(
                text(
                    "INSERT INTO alert_timeline (alert_id, action, to_status, note, created_at) "
                    "VALUES (:aid, 'created', 'NEW', :note, now())"
                ),
                {"aid": alert_id, "note": "Alert created from detection"},
            )
            return alert_id

    # --- deliveries (idempotent) --------------------------------------------
    def record_delivery(
        self,
        *,
        alert_id: int,
        user_id: int,
        channel: str,
        status: str,
        suppressed_reason: str | None = None,
        error: str | None = None,
    ) -> bool:
        """Insert a delivery row; returns False if a row with the same idempotency
        key already exists (duplicate redelivery)."""
        key = f"{alert_id}:{channel}:{user_id}"
        with self._engine.begin() as conn:
            result = conn.execute(
                text(
                    "INSERT INTO notification_deliveries "
                    "(alert_id, user_id, channel, status, suppressed_reason, error, idempotency_key, created_at) "
                    "VALUES (:aid, :uid, CAST(:ch AS notification_channel_enum), "
                    " CAST(:st AS notification_delivery_status_enum), :reason, :err, :key, now()) "
                    "ON CONFLICT (idempotency_key) DO NOTHING RETURNING id"
                ),
                {"aid": alert_id, "uid": user_id, "ch": channel, "st": status,
                 "reason": suppressed_reason, "err": error, "key": key},
            ).first()
            return result is not None

    def update_delivery_status(self, alert_id: int, user_id: int, channel: str, status: str, error: str | None = None) -> None:
        key = f"{alert_id}:{channel}:{user_id}"
        with self._engine.begin() as conn:
            conn.execute(
                text(
                    "UPDATE notification_deliveries SET "
                    "status = CAST(:st AS notification_delivery_status_enum), error = :err, updated_at = now() "
                    "WHERE idempotency_key = :key"
                ),
                {"st": status, "err": error, "key": key},
            )

    # --- recipients / preferences / subscriptions ---------------------------
    def recipients(self, role_codes: list[str]) -> list[dict]:
        with self._engine.connect() as conn:
            rows = conn.execute(
                text(
                    "SELECT u.id, u.email, u.first_name, u.last_name, r.code AS role_code "
                    "FROM users u JOIN roles r ON u.role_id = r.id "
                    "WHERE u.is_active = true AND r.code = ANY(:codes)"
                ),
                {"codes": role_codes},
            ).mappings().all()
            return [dict(r) for r in rows]

    def role_member_ids(self, role_id: int) -> list[int]:
        with self._engine.connect() as conn:
            rows = conn.execute(
                text("SELECT id FROM users WHERE role_id = :rid AND is_active = true"),
                {"rid": role_id},
            ).all()
            return [int(r[0]) for r in rows]

    def preference(self, user_id: int) -> dict | None:
        with self._engine.connect() as conn:
            row = conn.execute(
                text("SELECT * FROM notification_preferences WHERE user_id = :uid"),
                {"uid": user_id},
            ).mappings().first()
            return dict(row) if row else None

    def subscriptions(self, user_id: int) -> list[dict]:
        with self._engine.connect() as conn:
            rows = conn.execute(
                text(
                    "SELECT id, endpoint, p256dh_key, auth_key FROM notification_subscriptions "
                    "WHERE user_id = :uid"
                ),
                {"uid": user_id},
            ).mappings().all()
            return [dict(r) for r in rows]

    def delete_subscription(self, endpoint: str) -> None:
        with self._engine.begin() as conn:
            conn.execute(
                text("DELETE FROM notification_subscriptions WHERE endpoint = :ep"),
                {"ep": endpoint},
            )

    # --- escalation ----------------------------------------------------------
    def matching_escalation_rule(self, usecase_id: int, severity: str) -> dict | None:
        with self._engine.connect() as conn:
            rule = conn.execute(
                text(
                    "SELECT id FROM escalation_rules WHERE enabled = true "
                    "AND (usecase_id IS NULL OR usecase_id = :uid) "
                    "AND (severity_filter IS NULL OR severity_filter = :sev) "
                    "ORDER BY (usecase_id IS NOT NULL) DESC, id ASC LIMIT 1"
                ),
                {"uid": usecase_id, "sev": severity},
            ).mappings().first()
            if not rule:
                return None
            steps = conn.execute(
                text(
                    "SELECT step_order, wait_seconds, escalate_to_role_id, channels "
                    "FROM escalation_steps WHERE rule_id = :rid ORDER BY step_order ASC"
                ),
                {"rid": rule["id"]},
            ).mappings().all()
            return {"id": rule["id"], "steps": [dict(s) for s in steps]}

    def alert_status(self, alert_id: int) -> str | None:
        with self._engine.connect() as conn:
            row = conn.execute(text("SELECT status FROM alerts WHERE id = :id"), {"id": alert_id}).first()
            return row[0] if row else None
