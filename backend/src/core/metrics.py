"""Business-level Prometheus metrics for the backend.

The HTTP request metrics (rate, latency, status codes) are provided by
``prometheus_fastapi_instrumentator`` in ``main.py``. This module adds the
*business* gauges that only the application knows the meaning of — active users,
camera fleet size, open incidents, etc. — by polling the database on a fixed
interval and setting gauges on the default Prometheus registry, so they show up
on the same ``/metrics`` endpoint.

Design notes:
  * Every query is cheap (small tables) or uses a planner estimate
    (``events`` via ``pg_class.reltuples``) so this stays safe at 200-camera
    scale where the events table can grow huge.
  * A failed collection never propagates — monitoring must not take down the API.
  * DB work runs in a thread executor so the polling loop never blocks the
    event loop.
"""

from __future__ import annotations

import asyncio
import logging
import os

from prometheus_client import Gauge
from sqlalchemy import text

from src.db.db_connection import SessionLocal

logger = logging.getLogger(__name__)

REFRESH_SECONDS = int(os.getenv("METRICS_REFRESH_SECONDS", "15"))

# --- Gauges (default registry → exposed on /metrics) ------------------------
ACTIVE_USERS = Gauge(
    "app_active_users",
    "Distinct users holding a non-revoked, unexpired token",
)
USERS_TOTAL = Gauge("app_users_total", "Total user accounts")
CAMERAS_TOTAL = Gauge("app_cameras_total", "Total cameras configured")
CAMERAS_ACTIVE = Gauge("app_cameras_active", "Cameras with status = active")
LOCATIONS_TOTAL = Gauge("app_locations_total", "Total locations")
USECASES_ACTIVE = Gauge("app_usecases_active", "Use cases with status = active")
CAMERA_USECASE_ACTIVE = Gauge(
    "app_camera_usecase_active", "Active camera↔use-case assignments"
)
INCIDENTS_OPEN = Gauge(
    "app_incidents_open", "Incidents not in a Resolved/Closed state"
)
EVENTS_ESTIMATED_TOTAL = Gauge(
    "app_events_estimated_total",
    "Planner estimate of rows in the events table (cheap, avoids full scan)",
)
COLLECTION_OK = Gauge(
    "app_metrics_collection_ok",
    "1 if the last business-metrics collection succeeded, else 0",
)

# (metric, SQL) — each returns a single numeric value.
_QUERIES: list[tuple[Gauge, str]] = [
    (ACTIVE_USERS,
     "SELECT count(DISTINCT userid) FROM users_token "
     "WHERE is_revoked = false AND expires_at > now()"),
    (USERS_TOTAL, "SELECT count(*) FROM users"),
    (CAMERAS_TOTAL, "SELECT count(*) FROM cameras"),
    (CAMERAS_ACTIVE, "SELECT count(*) FROM cameras WHERE status = true"),
    (LOCATIONS_TOTAL, "SELECT count(*) FROM locations"),
    (USECASES_ACTIVE, "SELECT count(*) FROM usecases WHERE status = true"),
    (CAMERA_USECASE_ACTIVE,
     "SELECT count(*) FROM camera_usecase WHERE is_active = true"),
    (INCIDENTS_OPEN,
     "SELECT count(*) FROM incident WHERE status NOT IN ('Resolved', 'Closed')"),
    (EVENTS_ESTIMATED_TOTAL,
     "SELECT COALESCE(reltuples, 0)::bigint FROM pg_class WHERE relname = 'events'"),
]


def _collect_once() -> None:
    """Blocking: run all queries in one session and set the gauges."""
    db = SessionLocal()
    try:
        for gauge, sql in _QUERIES:
            try:
                value = db.execute(text(sql)).scalar()
                gauge.set(float(value or 0))
            except Exception:
                db.rollback()
                logger.warning("Failed collecting metric %s", gauge._name, exc_info=True)
        COLLECTION_OK.set(1)
    except Exception:
        COLLECTION_OK.set(0)
        logger.exception("Business-metrics collection failed")
    finally:
        db.close()


async def collect_business_metrics_loop() -> None:
    """Background task: refresh business gauges every REFRESH_SECONDS."""
    loop = asyncio.get_event_loop()
    while True:
        try:
            await loop.run_in_executor(None, _collect_once)
        except Exception:
            logger.exception("Unexpected error in metrics loop")
        await asyncio.sleep(REFRESH_SECONDS)
