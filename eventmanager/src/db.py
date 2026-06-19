"""Postgres access for the events table.

Schema (shared with the backend):
    events(id, camera_id, location_id, usecase_id, evidence_url,
           created_date_time, event_start_time, event_end_time)

The SQLAlchemy engine pools connections and is safe to use from the analysis
worker threads (each call checks out its own connection).
"""

from __future__ import annotations

import logging
from datetime import datetime

from sqlalchemy import create_engine, text

from src.config import settings

logger = logging.getLogger(__name__)


class EventStore:
    def __init__(self) -> None:
        self._engine = create_engine(settings.database_url, future=True, pool_pre_ping=True)

    def location_id_for_camera(self, camera_id: int) -> int | None:
        with self._engine.connect() as conn:
            row = conn.execute(
                text("SELECT locationid FROM cameras WHERE id = :cid"), {"cid": camera_id}
            ).first()
            return int(row[0]) if row else None

    def last_event(self, camera_id: int, usecase_id: int) -> dict | None:
        """Most recent event for this camera+use-case (by end-time)."""
        with self._engine.connect() as conn:
            row = conn.execute(
                text(
                    "SELECT id, event_start_time, event_end_time FROM events "
                    "WHERE camera_id = :cid AND usecase_id = :uid "
                    "ORDER BY event_end_time DESC LIMIT 1"
                ),
                {"cid": camera_id, "uid": usecase_id},
            ).mappings().first()
            return dict(row) if row else None

    def insert_event(
        self, *, camera_id: int, location_id: int, usecase_id: int,
        evidence_url: str | None, start: datetime, end: datetime,
    ) -> int:
        with self._engine.begin() as conn:
            row = conn.execute(
                text(
                    "INSERT INTO events "
                    "(camera_id, location_id, usecase_id, evidence_url, "
                    " event_start_time, event_end_time) "
                    "VALUES (:cid, :lid, :uid, :url, :start, :end) RETURNING id"
                ),
                {"cid": camera_id, "lid": location_id, "uid": usecase_id,
                 "url": evidence_url, "start": start, "end": end},
            )
            return int(row.scalar_one())

    def extend_event(self, event_id: int, new_end: datetime) -> None:
        with self._engine.begin() as conn:
            conn.execute(
                text("UPDATE events SET event_end_time = :end WHERE id = :id "
                     "AND event_end_time < :end"),
                {"end": new_end, "id": event_id},
            )
