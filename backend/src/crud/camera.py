from typing import Any

from sqlalchemy import or_
from sqlalchemy.orm import Session, selectinload

from src.models.camera import Camera, CameraTranslation
from src.models.location import Location


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
    config: dict[str, Any] | None = None,
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
        config=config,
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
    config: dict[str, Any] | None = None,
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
    if config is not None:
        camera.config = config

    db.add(camera)
    db.commit()
    db.refresh(camera)
    return camera


def delete_camera(db: Session, *, camera: Camera) -> None:
    db.delete(camera)
    db.commit()
