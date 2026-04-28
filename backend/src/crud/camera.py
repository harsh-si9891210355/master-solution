from sqlalchemy.orm import Session, selectinload

from src.models.camera import Camera


def get_camera_by_id(db: Session, camera_id: int) -> Camera | None:
    return (
        db.query(Camera)
        .options(
            selectinload(Camera.location),
            selectinload(Camera.camera_usecases),
        )
        .filter(Camera.id == camera_id)
        .first()
    )


def get_camera_by_name(db: Session, name_en: str, name_es: str | None = None, name_fr: str | None = None) -> Camera | None:
    query = db.query(Camera).filter(Camera.name_en == name_en)
    if name_es:
        query = query.or_(Camera.name_es == name_es)
    if name_fr:
        query = query.or_(Camera.name_fr == name_fr)
    return query.first()


def get_all_cameras(db: Session) -> list[Camera]:
    return (
        db.query(Camera)
        .options(
            selectinload(Camera.location),
            selectinload(Camera.camera_usecases),
        )
        .order_by(Camera.id.asc())
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
    status: bool,
    status_modified_by: int,
) -> Camera:
    camera = Camera(
        name_en=name_en,
        name_es=name_es,
        name_fr=name_fr,
        location_id=location_id,
        codec=codec,
        resolution=resolution,
        height=height,
        fps=fps,
        rtsp_url=rtsp_url,
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
    status: bool | None = None,
    status_modified_by: int | None = None,
) -> Camera:
    if name_en is not None:
        camera.name_en = name_en
    if name_es is not None:
        camera.name_es = name_es
    if name_fr is not None:
        camera.name_fr = name_fr
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
