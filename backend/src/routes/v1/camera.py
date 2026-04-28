from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from src.db.db_connection import get_db
from src.schemas.camera import (
    CameraCreate,
    CameraDeleteResponse,
    CameraResponse,
    CamerasResponse,
    CameraUpdate,
)
from src.services.v1.camera_services import (
    create_camera_details,
    delete_camera_details,
    get_all_camera_details,
    get_camera_details,
    update_camera_details,
)
from src.utils.auth.auth_bearer import JWTBearer


router = APIRouter()


@router.post("", response_model=CameraResponse, status_code=201)
def create_camera(
    payload: CameraCreate,
    request: Request,
    _: str = Depends(JWTBearer()),
    db: Session = Depends(get_db),
) -> CameraResponse:
    return create_camera_details(db, payload, request.state.lang)


@router.get("", response_model=CamerasResponse)
def get_cameras(
    request: Request,
    _: str = Depends(JWTBearer()),
    db: Session = Depends(get_db),
) -> CamerasResponse:
    return CamerasResponse(cameras=get_all_camera_details(db, request.state.lang))


@router.get("/{camera_id}", response_model=CameraResponse)
def get_camera(
    camera_id: int,
    request: Request,
    _: str = Depends(JWTBearer()),
    db: Session = Depends(get_db),
) -> CameraResponse:
    return get_camera_details(db, camera_id, request.state.lang)


@router.put("/{camera_id}", response_model=CameraResponse)
def update_camera(
    camera_id: int,
    payload: CameraUpdate,
    request: Request,
    _: str = Depends(JWTBearer()),
    db: Session = Depends(get_db),
) -> CameraResponse:
    return update_camera_details(db, camera_id, payload, request.state.lang)


@router.delete("/{camera_id}", response_model=CameraDeleteResponse)
def delete_camera(
    camera_id: int,
    _: str = Depends(JWTBearer()),
    db: Session = Depends(get_db),
) -> CameraDeleteResponse:
    delete_camera_details(db, camera_id)
    return CameraDeleteResponse(message="Camera deleted successfully")
