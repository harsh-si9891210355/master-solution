from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from src.db.db_connection import get_db
from src.schemas.camera import (
    CameraCreate,
    CameraDeleteResponse,
    CameraResponse,
    CamerasResponse,
    CameraUpdate,
    CameraStatusUpdate
)
from src.services.v1.camera_services import (
    create_camera_details,
    delete_camera_details,
    get_all_camera_details,
    get_camera_details,
    update_camera_details,
    update_camera_status
)
from src.utils.auth.auth import require_permission


router = APIRouter()


@router.post("", response_model=CameraResponse, status_code=201, dependencies=[Depends(require_permission("camera:create"))])
def create_camera(
    payload: CameraCreate,
    request: Request,
    db: Session = Depends(get_db),
) -> CameraResponse:
    return create_camera_details(db, payload, request.state.lang)


@router.get("", response_model=CamerasResponse, dependencies=[Depends(require_permission("camera:read"))])
def get_cameras(
    request: Request,
    db: Session = Depends(get_db),
) -> CamerasResponse:
    return CamerasResponse(cameras=get_all_camera_details(db, request.state.lang))


@router.get("/{camera_id}", response_model=CameraResponse, dependencies=[Depends(require_permission("camera:read"))])
def get_camera(
    camera_id: int,
    request: Request,
    db: Session = Depends(get_db),
) -> CameraResponse:
    return get_camera_details(db, camera_id, request.state.lang)


@router.put("/{camera_id}", response_model=CameraResponse, dependencies=[Depends(require_permission("camera:update"))])
def update_camera(
    camera_id: int,
    payload: CameraUpdate,
    request: Request,
    db: Session = Depends(get_db),
) -> CameraResponse:
    return update_camera_details(db, camera_id, payload, request.state.lang)


@router.delete("/{camera_id}", response_model=CameraDeleteResponse, dependencies=[Depends(require_permission("camera:delete"))])
def delete_camera(
    camera_id: int,
    db: Session = Depends(get_db),
) -> CameraDeleteResponse:
    delete_camera_details(db, camera_id)
    return CameraDeleteResponse(message="Camera deleted successfully")


@router.patch(
    "/{camera_id}/status",
    response_model=CameraResponse,
    dependencies=[Depends(require_permission("camera:update"))],
)
def change_camera_status(
    camera_id: int,
    payload: CameraStatusUpdate,
    request: Request,
    db: Session = Depends(get_db),
) -> CameraResponse:
    return update_camera_status(
        db=db,
        camera_id=camera_id,
        status=payload.status,
        language=request.state.lang,
    )