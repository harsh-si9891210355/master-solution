from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from src.crud.camera import (
    create_camera,
    delete_camera,
    get_all_cameras,
    get_camera_by_id,
    get_camera_by_name,
    update_camera,
)
from src.crud.location import get_location_by_id
from src.crud.usecase import get_usecase_by_id
from src.crud.user import get_user_by_id
from src.models.camera import Camera
from src.models.camera_usecase import CameraUsecase
from src.schemas.camera import (
    CameraCreate,
    CameraResponse,
    CameraUpdate,
    CameraUseCaseResponse,
)
from src.utils.translation import resolve_translation


def create_camera_details(db: Session, payload: CameraCreate, language: str = "en") -> CameraResponse:
    existing_camera = get_camera_by_name(db, payload.name_en, payload.name_es, payload.name_fr)
    if existing_camera:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Camera name already exists",
        )

    location = get_location_by_id(db, payload.location_id)
    if not location:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid location id",
        )

    user = get_user_by_id(db, payload.status_modified_by)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid status_modified_by user id",
        )

    for usecase_assignment in payload.usecases:
        usecase = get_usecase_by_id(db, usecase_assignment.usecase_id)
        if not usecase:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid usecase id: {usecase_assignment.usecase_id}",
            )

    camera = create_camera(
        db,
        name_en=payload.name_en,
        name_es=payload.name_es,
        name_fr=payload.name_fr,
        location_id=payload.location_id,
        codec=payload.codec,
        resolution=payload.resolution,
        height=payload.height,
        fps=payload.fps,
        rtsp_url=payload.rtsp_url,
        status=payload.status,
        status_modified_by=payload.status_modified_by,
    )
    camera.camera_usecases = [
        CameraUsecase(
            usecase_id=usecase_assignment.usecase_id,
            is_active=usecase_assignment.is_active,
        )
        for usecase_assignment in payload.usecases
    ]
    db.add(camera)
    db.commit()
    db.refresh(camera)
    return build_camera_response(camera, language)


def build_camera_response(camera: Camera, language: str) -> CameraResponse:
    location_translation = resolve_translation(
        [
            type("LocationTranslation", (), {"language": "en", "value": camera.location.name_en})(),
            type("LocationTranslation", (), {"language": "es", "value": camera.location.name_es})(),
            type("LocationTranslation", (), {"language": "fr", "value": camera.location.name_fr})(),
        ],
        language,
    )
    camera_name_translation = resolve_translation(
        [
            type("CameraTranslation", (), {"language": "en", "value": camera.name_en})(),
            type("CameraTranslation", (), {"language": "es", "value": camera.name_es})(),
            type("CameraTranslation", (), {"language": "fr", "value": camera.name_fr})(),
        ],
        language,
    )
    return CameraResponse(
        id=camera.id,
        name_en=camera.name_en,
        name_es=camera.name_es,
        name_fr=camera.name_fr,
        name=camera_name_translation.value if camera_name_translation else camera.name_en,
        location_id=camera.location_id,
        location_name=location_translation.value if location_translation else camera.location.name_en,
        codec=camera.codec,
        resolution=camera.resolution,
        height=camera.height,
        fps=camera.fps,
        rtsp_url=camera.rtsp_url,
        status=camera.status,
        status_modified_by=camera.status_modified_by,
        usecases=[
            CameraUseCaseResponse(usecase_id=item.usecase_id, is_active=item.is_active)
            for item in camera.camera_usecases
        ],
        last_modified_at=camera.last_modified_at,
        created_at=camera.created_at,
    )


def get_camera_details(db: Session, camera_id: int, language: str = "en") -> CameraResponse:
    camera = get_camera_by_id(db, camera_id)
    if not camera:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Camera not found",
        )
    return build_camera_response(camera, language)


def get_all_camera_details(db: Session, language: str = "en") -> list[CameraResponse]:
    cameras = get_all_cameras(db)
    return [build_camera_response(camera, language) for camera in cameras]


def update_camera_details(
    db: Session,
    camera_id: int,
    payload: CameraUpdate,
    language: str = "en",
) -> CameraResponse:
    camera = get_camera_by_id(db, camera_id)
    if not camera:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Camera not found",
        )

    # Check if any of the localized names are being changed
    if payload.name_en or payload.name_es or payload.name_fr:
        existing_camera = get_camera_by_name(
            db,
            payload.name_en or camera.name_en,
            payload.name_es or camera.name_es,
            payload.name_fr or camera.name_fr,
        )
        if existing_camera and existing_camera.id != camera.id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Camera name already exists",
            )

    if payload.location_id is not None:
        location = get_location_by_id(db, payload.location_id)
        if not location:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid location id",
            )

    if payload.status_modified_by is not None:
        user = get_user_by_id(db, payload.status_modified_by)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid status_modified_by user id",
            )

    if payload.usecases is not None:
        for usecase_assignment in payload.usecases:
            usecase = get_usecase_by_id(db, usecase_assignment.usecase_id)
            if not usecase:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Invalid usecase id: {usecase_assignment.usecase_id}",
                )

    updated_camera = update_camera(
        db,
        camera=camera,
        name_en=payload.name_en,
        name_es=payload.name_es,
        name_fr=payload.name_fr,
        location_id=payload.location_id,
        codec=payload.codec,
        resolution=payload.resolution,
        height=payload.height,
        fps=payload.fps,
        rtsp_url=payload.rtsp_url,
        status=payload.status,
        status_modified_by=payload.status_modified_by,
    )
    if payload.usecases is not None:
        updated_camera.camera_usecases = [
            CameraUsecase(
                usecase_id=usecase_assignment.usecase_id,
                is_active=usecase_assignment.is_active,
            )
            for usecase_assignment in payload.usecases
        ]
        db.add(updated_camera)
        db.commit()
        db.refresh(updated_camera)
    return build_camera_response(updated_camera, language)


def delete_camera_details(db: Session, camera_id: int) -> None:
    camera = get_camera_by_id(db, camera_id)
    if not camera:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Camera not found",
        )
    delete_camera(db, camera=camera)

def update_camera_status(
    db: Session,
    camera_id: int,
    status: bool,
    language: str,
) -> CameraResponse:

    camera = get_camera_by_id(db, camera_id)

    if not camera:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Camera not found",
        )

    camera.status = status

    db.commit()
    db.refresh(camera)

    return build_camera_response(camera, language)