from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from src.crud.camera import get_camera_by_id
from src.db.db_connection import get_db
from src.services.v1.stream_service import StreamService
from src.utils.auth.auth import require_permission

router = APIRouter()


@router.get("/{camera_id}", dependencies=[Depends(require_permission("camera:read"))])
def get_stream_info(camera_id: int, db: Session = Depends(get_db)):
    """Ensure a MediaMTX path exists for the camera and return playback URLs."""
    camera = get_camera_by_id(db, camera_id)
    if not camera:
        raise HTTPException(status_code=404, detail="Camera not found")
    if not camera.rtsp_url:
        raise HTTPException(status_code=400, detail="Camera has no RTSP URL configured")

    return StreamService().get_stream_info(camera_id, camera.rtsp_url, camera.substream_rtsp_url)


@router.get("/{camera_id}/recordings", dependencies=[Depends(require_permission("camera:read"))])
def get_recordings(camera_id: int, db: Session = Depends(get_db)):
    """Return recorded timespans for a camera from MediaMTX playback."""
    camera = get_camera_by_id(db, camera_id)
    if not camera:
        raise HTTPException(status_code=404, detail="Camera not found")
    if not camera.rtsp_url:
        raise HTTPException(status_code=400, detail="Camera has no RTSP URL configured")

    return StreamService().get_recording_spans(camera_id, camera.rtsp_url, camera.substream_rtsp_url)


@router.post("/sync", dependencies=[Depends(require_permission("camera:read"))])
def sync_cameras(db: Session = Depends(get_db)):
    """Register / refresh all active cameras as MediaMTX paths (with NVR recording)."""
    return StreamService().sync_all_cameras(db)
