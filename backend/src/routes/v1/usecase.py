from fastapi import APIRouter, Depends, Request, status
from sqlalchemy.orm import Session

from src.db.db_connection import get_db
from src.schemas.usecase import (
    UseCaseResponse,
    UseCasesResponse,
    UseCaseCreate,
    UseCaseDeleteResponse,
    UseCaseStatusUpdate
)
from src.services.v1.usecase_services import (
    get_all_usecase_details,
    get_usecase_details,
    create_or_update_usecase_details,
    delete_usecase_details,
    change_usecase_status_details
)
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

    return create_or_update_usecase_details(
        db=db,
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
):
    if usecase_id is not None:
        return get_usecase_details(
            db,
            usecase_id,
            request.state.lang,
        )
    else:
        return get_all_usecase_details(
                db,
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
):
    delete_usecase_details(db, usecase_id)

    return UseCaseDeleteResponse(
        message="Usecase deleted successfully",
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
):
    return change_usecase_status_details(
        db,
        usecase_id,
        payload.status,
        request.state.lang,
    )
