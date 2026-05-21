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
    CommonFailureResponse,
    UpdateCameraUseCaseRequest
)
from src.services.v1.camera_services import CameraService
from src.utils.auth.auth import require_permission


router = APIRouter()


@router.post(
    "", 
    response_model=CameraResponse | CommonFailureResponse,
    dependencies=[Depends(require_permission("camera:create"))]
)
@router.post(
    "/{camera_id}", 
    response_model=CameraResponse | CommonFailureResponse,
    dependencies=[Depends(require_permission("camera:update"))]
)
def create_or_update_camera(
    request: Request,
    db: Session = Depends(get_db),
    camera_id: int | None = None,
    payload: dict = Body(...),
):  
    '''Create a new camera or update an existing camera.'''

    camera_service = CameraService(db)
    if camera_id is not None:
        payload = CameraUpdate.model_validate(payload)
        return camera_service.update_camera_details(db, camera_id, payload, request.state.lang)
    else:
        payload = CameraCreate.model_validate(payload)
        return camera_service.create_camera_details(db, payload, request.state.lang)


@router.get(
    "", 
    response_model=CamerasResponse | CommonFailureResponse, 
    dependencies=[Depends(require_permission("camera:read"))]
)
@router.get(
    "/{camera_id}", 
    response_model=CameraResponse | CommonFailureResponse, 
    dependencies=[Depends(require_permission("camera:read"))]
)
def get_cameras(
    request: Request,
    db: Session = Depends(get_db),
    camera_id: int | None = None,
):
    '''Fetch all cameras or retrieve a specific camera by ID.'''

    camera_service = CameraService(db)
    if camera_id is not None:
        return camera_service.get_camera_details(db, camera_id, request.state.lang)
    else:
        return CamerasResponse(cameras=camera_service.get_all_camera_details(db, request.state.lang))


@router.delete(
    "/{camera_id}", 
    response_model=CameraDeleteSuccessResponse | CommonFailureResponse, 
    dependencies=[Depends(require_permission("camera:delete"))]
)
def delete_camera(
    camera_id: int,
    db: Session = Depends(get_db),
):  
    '''Delete a camera using its unique camera ID.'''

    camera_service = CameraService(db)
    return camera_service.delete_camera_details(db, camera_id)


@router.patch(
    "/{camera_id}/status",
    response_model=CameraResponse | CommonFailureResponse,
    dependencies=[Depends(require_permission("camera:update"))],
)
def change_camera_status(
    camera_id: int,
    payload: CameraStatusUpdate,
    request: Request,
    db: Session = Depends(get_db),
):
    '''Update the active or inactive status of a camera.'''

    camera_service = CameraService(db)
    return camera_service.update_camera_status(
        db=db,
        camera_id=camera_id,
        status=payload.status,
        language=request.state.lang,
    )


@router.post(
    "/{camera_id}/update_camera_usecase",
    response_model=CameraResponse | CommonFailureResponse,
    dependencies=[Depends(require_permission("camera:update"))],
)
def update_camera_usecase(
    camera_id: int,
    payload: UpdateCameraUseCaseRequest,
    request: Request,
    db: Session = Depends(get_db),
):
    '''Update use-case configuration for a specific camera.'''

    camera_service = CameraService(db)
    return camera_service.update_camera_usecase(
        db=db,
        camera_id=camera_id,
        payload=payload,
        language=request.state.lang,
    )