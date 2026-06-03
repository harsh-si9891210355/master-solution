import logging

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from .config import settings
from .models import Camera

log = logging.getLogger("media-service.database")

engine = create_engine(
    settings.database_url,
    pool_pre_ping=True,   # reconnect silently after a DB restart
    pool_size=2,
    max_overflow=2,
)
SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False)


def fetch_active_cameras() -> dict[int, str]:
    """Return {camera_id: rtsp_url} for every enabled camera with a non-empty RTSP URL.

    Runs synchronously; call via asyncio.to_thread from async code.
    """
    db = SessionLocal()
    try:
        rows = (
            db.query(Camera)
            .filter(
                Camera.status.is_(True),
                Camera.rtsp_url.isnot(None),
                Camera.rtsp_url != "",
            )
            .all()
        )
        return {cam.id: cam.rtsp_url for cam in rows}
    except Exception:
        log.exception("DB query for active cameras failed")
        raise
    finally:
        db.close()
