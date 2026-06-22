from fastapi import APIRouter, Depends, HTTPException, Request, Query, status
from sqlalchemy.orm import Session

from src.db.db_connection import get_db
from src.schemas.auth import UserInvite, UserResponse
from src.schemas.user import UserDeleteResponse, UserUpdate, UsersResponse, UserStatusUpdate
from src.crud.user import get_user_by_email, get_user_by_id
from src.services.v1.user_services import (
    create_user_details,
    delete_user_details,
    get_all_user_details,
    get_user_details,
    update_user_details,
    change_user_status_details
)
from src.utils.auth.auth import require_permission


router = APIRouter()


@router.post(
    "",
    response_model=UserResponse,
    dependencies=[Depends(require_permission("user:create"))],
)
def create_user_route(
    request: Request,
    payload: UserInvite,
    db: Session = Depends(get_db),
) -> UserResponse:
    """Admin invite: only the email is required. The user is created in Auth0,
    which emails them a link to set their own password."""
    existing_user = get_user_by_email(db, payload.email)

    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User already exists",
        )

    return create_user_details(
        db=db,
        payload=payload,
        language=request.state.lang,
    )


@router.post(
    "/{user_id}",
    response_model=UserResponse,
    dependencies=[Depends(require_permission("user:update"))],
)
def update_user_route(
    request: Request,
    user_id: int,
    payload: UserUpdate,
    db: Session = Depends(get_db),
) -> UserResponse:
    user = get_user_by_id(db, user_id)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    return update_user_details(
        db=db,
        user_id=user_id,
        payload=payload,
        language=request.state.lang,
    )


@router.get(
    "",
    response_model=UsersResponse,
    dependencies=[Depends(require_permission("user:read"))],
)
@router.get(
    "/{user_id}",
    response_model=UserResponse,
    dependencies=[Depends(require_permission("user:read"))],
)
def get_users_or_user(
    request: Request,
    db: Session = Depends(get_db),
    user_id: int | None = None,
):
    if user_id is not None:
        return get_user_details(db, user_id, request.state.lang)

    return UsersResponse(
        users=get_all_user_details(db, request.state.lang)
    )



@router.patch(
    "/{user_id}/status",
    response_model=UserResponse,
    dependencies=[Depends(require_permission("user:update"))],
)
def change_user_status(
    user_id: int,
    payload: UserStatusUpdate,
    request: Request,
    db: Session = Depends(get_db),
) -> UserResponse:
    return change_user_status_details(
        db=db,
        user_id=user_id,
        is_active=payload.is_active,
        language=request.state.lang,
    )


@router.delete("/{user_id}", response_model=UserDeleteResponse, dependencies=[Depends(require_permission("user:delete"))])
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
) -> UserDeleteResponse:
    delete_user_details(db, user_id)
    return UserDeleteResponse(message="User deleted successfully")



