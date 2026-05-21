from fastapi import APIRouter, Depends, Request, status
from sqlalchemy.orm import Session

from src.db.db_connection import get_db
from src.schemas.usecase import (
    UseCaseResponse,
    UseCasesResponse,
    UseCaseCreate,
    UseCaseDeleteResponse,
    UseCaseStatusUpdate,
    LinkedCamerasResponse,
)
from src.services.v1.usecase_services import UseCaseService
from src.utils.auth.auth import require_permission

router = APIRouter()


@router.post(
    "",
    response_model=UseCaseResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_permission("usecase:create"))],
)
@router.post(
    "/{usecase_id}",
    response_model=UseCaseResponse,
    dependencies=[Depends(require_permission("usecase:update"))],
)
def create_or_update_usecase(
    request: Request,
    payload: UseCaseCreate,
    db: Session = Depends(get_db),
    usecase_id: int | None = None,
) -> UseCaseResponse:
    ''' Create a new usecase or update an existing usecase '''

    service = UseCaseService(db)

    return service.create_or_update_usecase_details(
        payload=payload,
        language=request.state.lang,
        usecase_id=usecase_id,
    )


@router.get(
    "",
    response_model=UseCasesResponse,
    dependencies=[Depends(require_permission("usecase:read"))],
)
@router.get(
    "/{usecase_id}",
    response_model=UseCaseResponse,
    dependencies=[Depends(require_permission("usecase:read"))],
)
def get_usecases(
    request: Request,
    db: Session = Depends(get_db),
    usecase_id: int | None = None,
) -> UseCasesResponse | UseCaseResponse:
    ''' Fetch all usecases or a specific usecase by id '''

    service = UseCaseService(db)

    if usecase_id is not None:
        return service.get_usecase_details(
            usecase_id,
            request.state.lang,
        )

    return service.get_all_usecase_details(
        request.state.lang,
    )


@router.delete(
    "/{usecase_id}",
    response_model=UseCaseDeleteResponse,
    dependencies=[Depends(require_permission("usecase:delete"))],
)
def delete_usecase(
    usecase_id: int,
    db: Session = Depends(get_db),
) -> UseCaseDeleteResponse:
    ''' Delete a usecase by id '''

    service = UseCaseService(db)

    return service.delete_usecase_details(
        usecase_id,
    )


@router.patch(
    "/{usecase_id}/status",
    response_model=UseCaseResponse,
    dependencies=[Depends(require_permission("usecase:update"))],
)
def change_usecase_status(
    usecase_id: int,
    payload: UseCaseStatusUpdate,
    request: Request,
    db: Session = Depends(get_db),
) -> UseCaseResponse:
    ''' Enable or disable a usecase '''

    service = UseCaseService(db)

    return service.change_usecase_status_details(
        usecase_id,
        payload.status,
        request.state.lang,
    )


@router.get(
    "/{usecase_id}/linked-cameras",
    response_model=LinkedCamerasResponse,
    dependencies=[Depends(require_permission("usecase:read"))],
)
def get_linked_cameras(
    usecase_id: int,
    request: Request,
    db: Session = Depends(get_db),
) -> LinkedCamerasResponse:
    ''' Fetch all cameras linked to a specific usecase '''

    service = UseCaseService(db)

    return service.get_linked_cameras_details(
        usecase_id,
        request.state.lang,
    )