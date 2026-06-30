from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from src.db.db_connection import get_db
from src.schemas.auth import UserInvite, UserResponse
from src.schemas.common import CommonFailureResponse
from src.schemas.user import UserDeleteResponse, UserStatusUpdate, UsersResponse, UserUpdate
from src.services.v1.user_services import (
    change_user_status_details,
    create_user_details,
    delete_user_details,
    get_all_user_details,
    get_user_details,
    update_user_details,
)
from src.utils.auth.auth import require_permission


router = APIRouter()


@router.post(
    "",
    response_model=UserResponse | CommonFailureResponse,
    dependencies=[Depends(require_permission("user:create"))],
)
def create_user_route(
    request: Request,
    payload: UserInvite,
    db: Session = Depends(get_db),
):
    """Admin invite: only the email is required; the user is created in Auth0,
    which emails them a link to set their own password."""
    return create_user_details(db=db, payload=payload, language=request.state.lang)


@router.post(
    "/{user_id}",
    response_model=UserResponse | CommonFailureResponse,
    dependencies=[Depends(require_permission("user:update"))],
)
def update_user_route(
    request: Request,
    user_id: int,
    payload: UserUpdate,
    db: Session = Depends(get_db),
):
    return update_user_details(db=db, user_id=user_id, payload=payload, language=request.state.lang)


@router.get(
    "",
    response_model=UsersResponse | CommonFailureResponse,
    dependencies=[Depends(require_permission("user:read"))],
)
@router.get(
    "/{user_id}",
    response_model=UserResponse | CommonFailureResponse,
    dependencies=[Depends(require_permission("user:read"))],
)
def get_users_or_user(
    request: Request,
    db: Session = Depends(get_db),
    user_id: int | None = None,
):
    if user_id is not None:
        return get_user_details(db, user_id, request.state.lang)
    return get_all_user_details(db, request.state.lang)


@router.patch(
    "/{user_id}/status",
    response_model=UserResponse | CommonFailureResponse,
    dependencies=[Depends(require_permission("user:update"))],
)
def change_user_status(
    user_id: int,
    payload: UserStatusUpdate,
    request: Request,
    db: Session = Depends(get_db),
):
    return change_user_status_details(
        db=db,
        user_id=user_id,
        is_active=payload.is_active,
        language=request.state.lang,
    )


@router.delete(
    "/{user_id}",
    response_model=UserDeleteResponse | CommonFailureResponse,
    dependencies=[Depends(require_permission("user:delete"))],
)
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
):
    return delete_user_details(db, user_id)
