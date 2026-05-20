from typing import Union

from fastapi import APIRouter, Depends, Request, Body
from sqlalchemy.orm import Session

from src.db.db_connection import get_db
from src.schemas.camera import (
    CameraCreate,
    CameraDeleteSuccessResponse,
    CameraResponse,
    CamerasResponse,
    CameraUpdate,
    CameraStatusUpdate,
    CommonFailureResponse
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


@router.post(
    "", 
    response_model=Union[CameraResponse, CommonFailureResponse],
    dependencies=[Depends(require_permission("camera:create"))]
)
@router.post(
    "/{camera_id}", 
    response_model=Union[CameraResponse, CommonFailureResponse],
    dependencies=[Depends(require_permission("camera:update"))]
)
def create_or_update_camera(
    request: Request,
    db: Session = Depends(get_db),
    camera_id: int | None = None,
    payload: dict = Body(...),
):
    if camera_id is not None:
        payload = CameraUpdate.model_validate(payload)
        return update_camera_details(db, camera_id, payload, request.state.lang)
    else:
        payload = CameraCreate.model_validate(payload)
        return create_camera_details(db, payload, request.state.lang)


@router.get(
    "", 
    response_model=Union[CamerasResponse, CommonFailureResponse], 
    dependencies=[Depends(require_permission("camera:read"))]
)
@router.get(
    "/{camera_id}", 
    response_model=Union[CameraResponse, CommonFailureResponse], 
    dependencies=[Depends(require_permission("camera:read"))]
)
def get_cameras(
    request: Request,
    db: Session = Depends(get_db),
    camera_id: int | None = None,
):
    if camera_id is not None:
        return get_camera_details(db, camera_id, request.state.lang)
    else:
        return CamerasResponse(cameras=get_all_camera_details(db, request.state.lang))


@router.delete(
    "/{camera_id}", 
    response_model=Union[CameraDeleteSuccessResponse, CommonFailureResponse], 
    dependencies=[Depends(require_permission("camera:delete"))]
)
def delete_camera(
    camera_id: int,
    db: Session = Depends(get_db),
):
    return delete_camera_details(db, camera_id)


@router.patch(
    "/{camera_id}/status",
    response_model=Union[CameraResponse, CommonFailureResponse],
    dependencies=[Depends(require_permission("camera:update"))],
)
def change_camera_status(
    camera_id: int,
    payload: CameraStatusUpdate,
    request: Request,
    db: Session = Depends(get_db),
):
    return update_camera_status(
        db=db,
        camera_id=camera_id,
        status=payload.status,
        language=request.state.lang,
    )