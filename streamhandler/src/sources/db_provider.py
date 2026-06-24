"""Database camera provider.

Reads the desired fleet directly from the existing Master Solution Postgres
schema (``cameras`` + ``camera_usecase`` + ``usecases`` and their translations)
so the StreamHandler stays in lock-step with the cameras/use-cases configured in
the main app — no duplicate config to maintain.

The schema has no ROI column, so ROIs are supplied via an optional JSON overlay
file keyed ``"<camera_id>:<usecase_id>"``; any pairing without an entry defaults
to a full-frame ROI. This keeps ROI authoring decoupled from the app's DB while
still driving everything else from it.
"""

from __future__ import annotations

import json
import logging

from sqlalchemy import create_engine, text

from src.config import settings
from src.models import ROI, CameraStreamConfig, FrameOverrides, UsecaseBinding
from src.sources.base import CameraProvider, parse_roi

logger = logging.getLogger(__name__)

# English-named, active cameras that have an RTSP URL, with their active
# use-case bindings. Column names match the SQLAlchemy models in the backend
# (note the lowercase physical column names: rtspurl, cameraid, usecaseid).
_QUERY = text(
    """
    SELECT
        c.id                AS camera_id,
        c.rtspurl           AS rtsp_url,
        c.codec             AS codec,
        c.resolution        AS resolution,
        c.fps               AS fps,
        c.roi               AS roi,
        ct.name             AS camera_name,
        l_t.name            AS location_name,
        u.id                AS usecase_id,
        ut.name             AS usecase_name
    FROM cameras c
    JOIN camera_usecase cu       ON cu.cameraid = c.id AND cu.is_active = TRUE
    JOIN usecases u              ON u.id = cu.usecaseid AND u.status = TRUE
    LEFT JOIN camera_translations ct
           ON ct.camera_id = c.id AND ct.language_code = 'en'
    LEFT JOIN usecase_translations ut
           ON ut.usecase_id = u.id AND ut.language_code = 'en'
    LEFT JOIN locations loc      ON loc.id = c.locationid
    LEFT JOIN location_translations l_t
           ON l_t.location_id = loc.id AND l_t.language_code = 'en'
    WHERE c.status = TRUE AND c.rtspurl IS NOT NULL AND c.rtspurl <> ''
    ORDER BY c.id, u.id
    """
)


def _slugify(name: str, usecase_id: int) -> str:
    slug = "".join(ch.lower() if ch.isalnum() else "-" for ch in name).strip("-")
    while "--" in slug:
        slug = slug.replace("--", "-")
    return slug or f"usecase-{usecase_id}"


class DatabaseProvider(CameraProvider):
    def __init__(self) -> None:
        self._engine = create_engine(settings.database_url, future=True, pool_pre_ping=True)
        self._roi_overlay = self._load_roi_overlay(settings.roi_overlay_file)

    @staticmethod
    def _load_roi_overlay(path: str) -> dict[str, dict]:
        if not path:
            return {}
        try:
            with open(path, encoding="utf-8") as fh:
                data = json.load(fh)
            return {str(k): v for k, v in data.items()}
        except FileNotFoundError:
            logger.warning("ROI overlay file not found: %s — using full-frame ROIs", path)
        except (json.JSONDecodeError, OSError):
            logger.exception("Failed to read ROI overlay file %s", path)
        return {}

    def load(self) -> list[CameraStreamConfig]:
        # Re-read the overlay each cycle so ROI edits hot-reload too.
        self._roi_overlay = self._load_roi_overlay(settings.roi_overlay_file)
        try:
            with self._engine.connect() as conn:
                rows = conn.execute(_QUERY).mappings().all()
        except Exception:
            logger.exception("Failed to query cameras from database")
            return []

        cameras: dict[int, CameraStreamConfig] = {}
        camera_roi_raw: dict[int, object] = {}
        for row in rows:
            cid = int(row["camera_id"])
            cfg = cameras.get(cid)
            if cfg is None:
                cfg = CameraStreamConfig(
                    camera_id=cid,
                    rtsp_url=str(row["rtsp_url"]),
                    name=str(row["camera_name"] or f"camera-{cid}"),
                    location=str(row["location_name"] or ""),
                    codec=str(row["codec"] or ""),
                    source_resolution=str(row["resolution"] or ""),
                    usecases=[],
                    overrides=FrameOverrides(),
                )
                cameras[cid] = cfg
                # Raw per-camera ROI (cameras.roi JSONB, set via the ROI editor).
                # Each shape carries the use-cases it applies to.
                camera_roi_raw[cid] = row.get("roi")

            uid = int(row["usecase_id"])
            name = str(row["usecase_name"] or f"usecase-{uid}")
            slug = _slugify(name, uid)
            # Per-use-case ROI: only the shapes assigned to this use-case. An
            # optional per-(camera,use-case) overlay entry overrides the DB ROI.
            overlay = self._roi_overlay.get(f"{cid}:{uid}")
            roi = parse_roi(overlay) if overlay else ROI.from_backend(camera_roi_raw[cid], uid)
            cfg.usecases.append(
                UsecaseBinding(usecase_id=uid, name=name, slug=slug, roi=roi)
            )

        result = list(cameras.values())
        logger.info("Loaded %d camera(s) from database", len(result))
        return result
