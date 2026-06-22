import json
from typing import List, Optional, Any, Dict
from sqlalchemy import or_
from sqlalchemy.orm import Session, selectinload

from src.models.camera import Camera, CameraTranslation
from src.models.location import Location



def _roi_items(roi_payload: Any) -> List[Dict[str, Any]]:
    if roi_payload is None:
        return []
    if isinstance(roi_payload, list):
        return [item for item in roi_payload if isinstance(item, dict)]
    if isinstance(roi_payload, dict):
        return [roi_payload]
    return []


def _has_usecase_id(roi_item: Dict[str, Any], usecase_id: int) -> bool:
    usecases = roi_item.get("usecases")
    if not isinstance(usecases, list):
        return False
    for uc in usecases:
        if not isinstance(uc, dict):
            continue
        if uc.get("usecaseId") == usecase_id:
            return True
    return False


def _extract_usecase_roi_items(roi_payload: Any, usecase_id: int) -> List[Dict[str, Any]]:
    return [item for item in _roi_items(roi_payload) if _has_usecase_id(item, usecase_id)]


def get_camera_by_id(db: Session, camera_id: int) -> Camera | None:
    return (
        db.query(Camera)
        .options(
            selectinload(Camera.location).selectinload(Location.translations),
            selectinload(Camera.translations),
            selectinload(Camera.camera_usecases),
        )
        .filter(Camera.id == camera_id)
        .first()
    )


def get_camera_by_name(
    db: Session,
    name_en: str,
    name_es: str | None = None,
    name_fr: str | None = None
) -> Camera | None:
    conditions = [CameraTranslation.name == name_en]

    if name_es:
        conditions.append(CameraTranslation.name == name_es)

    if name_fr:
        conditions.append(CameraTranslation.name == name_fr)

    return (
        db.query(Camera)
        .join(Camera.translations)
        .options(
            selectinload(Camera.location).selectinload(Location.translations),
            selectinload(Camera.translations),
            selectinload(Camera.camera_usecases),
        )
        .filter(or_(*conditions))
        .first()
    )


def get_all_cameras(db: Session) -> list[Camera]:
    return (
        db.query(Camera)
        .options(
            selectinload(Camera.location).selectinload(Location.translations),
            selectinload(Camera.translations),
            selectinload(Camera.camera_usecases),
        )
        .order_by(Camera.id.desc())
        .all()
    )


def create_camera(
    db: Session,
    *,
    name_en: str,
    name_es: str,
    name_fr: str,
    location_id: int,
    codec: str,
    resolution: str,
    height: float | None,
    fps: str,
    rtsp_url: str | None,
    substream_rtsp_url: str | None,
    status: bool,
    status_modified_by: int,
) -> Camera:
    camera = Camera(
        location_id=location_id,
        codec=codec,
        resolution=resolution,
        height=height,
        fps=fps,
        rtsp_url=rtsp_url,
        substream_rtsp_url=substream_rtsp_url,
        status=status,
        status_modified_by=status_modified_by,
    )
    db.add(camera)
    db.commit()
    db.refresh(camera)
    return camera


def update_camera(
    db: Session,
    *,
    camera: Camera,
    name_en: str | None = None,
    name_es: str | None = None,
    name_fr: str | None = None,
    location_id: int | None = None,
    codec: str | None = None,
    resolution: str | None = None,
    height: float | None = None,
    fps: str | None = None,
    rtsp_url: str | None = None,
    substream_rtsp_url: str | None = None,
    status: bool | None = None,
    status_modified_by: int | None = None,
) -> Camera:
    if location_id is not None:
        camera.location_id = location_id
    if codec is not None:
        camera.codec = codec
    if resolution is not None:
        camera.resolution = resolution
    if height is not None:
        camera.height = height
    if fps is not None:
        camera.fps = fps
    if rtsp_url is not None:
        camera.rtsp_url = rtsp_url
    if substream_rtsp_url is not None:
        camera.substream_rtsp_url = substream_rtsp_url
    if status is not None:
        camera.status = status
    if status_modified_by is not None:
        camera.status_modified_by = status_modified_by

    db.add(camera)
    db.commit()
    db.refresh(camera)
    return camera


def delete_camera(db: Session, *, camera: Camera) -> None:
    db.delete(camera)
    db.commit()


def get_camera_roi(db: Session, camera_id: int) -> Optional[Dict[str, Any]]:
    """
    Return the ROI JSON for a given camera, or None if camera not found or soft-deleted.
    """
    camera = (
        db.query(Camera)
        .filter(Camera.id == camera_id, Camera.is_delete.is_(False))
        .one_or_none()
    )
    if not camera:
        return None
    # Could be None if not set yet
    return camera.roi

#create/save respective camera roi
def set_camera_roi(db: Session, camera_id: int, roi_payload: Dict[str, Any], actor_id: Optional[int] = None) -> Optional[Dict[str, Any]]:
    """
    Overwrite the ROI JSON for a given camera. Creates or replaces the entire payload.
    Returns the updated ROI JSON, or None if camera not found/soft-deleted.
    """
    camera = (
        db.query(Camera)
        .filter(Camera.id == camera_id, Camera.is_delete.is_(False))
        .one_or_none()
    )
    if not camera:
        return None


    # Overwrite the JSON column
    camera.roi = roi_payload
    if hasattr(camera, "updated_by") and actor_id is not None:
        camera.updated_by = actor_id


    db.commit()
    db.refresh(camera)
    return camera.roi

#set respective camere roi to null
def clear_camera_roi(db: Session, camera_id: int, actor_id: Optional[int] = None) -> bool:
    """
    Clear (set to None) the ROI JSON for a given camera.
    Returns True if successful, False if camera not found/soft-deleted.
    """
    camera = (
        db.query(Camera)
        .filter(Camera.id == camera_id, Camera.is_delete.is_(False))
        .one_or_none()
    )
    if not camera:
        return False

    camera.roi = None
    if hasattr(camera, "updated_by") and actor_id is not None:
        camera.updated_by = actor_id

    db.commit()
    return True

def get_camera_frame_blob(db: Session, camera_id: int) -> Optional[bytes]:
    """
    Returns the stored frame blob if present; None if not set or camera missing/soft-deleted.
    """
    camera = (
        db.query(Camera)
        .filter(Camera.id == camera_id, Camera.is_delete.is_(False))
        .one_or_none()
    )
    if not camera:
        return None
    return getattr(camera, "roi_frame_blob", None)

def set_camera_frame_blob(
    db: Session,
    camera_id: int,
    frame_blob: Optional[bytes],
    actor_id: Optional[int] = None
) -> bool:
    """
    Set (or clear if None) the frame blob on camera. Returns True if updated; False if not found
    or column not present.
    """
    camera = (
        db.query(Camera)
        .filter(Camera.id == camera_id, Camera.is_delete.is_(False))
        .one_or_none()
    )
    if not camera or not hasattr(camera, "roi_frame_blob"):
        return False

    camera.roi_frame_blob = frame_blob
    if hasattr(camera, "updated_by") and actor_id is not None:
        camera.updated_by = actor_id
    db.commit()
    db.refresh(camera)
    return True
