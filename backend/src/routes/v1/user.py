from fastapi import APIRouter, Depends, Request, Query
from sqlalchemy.orm import Session

from src.db.db_connection import get_db
from src.schemas.auth import UserCreate, UserResponse
from src.schemas.user import UserDeleteResponse, UserUpdate, UsersResponse, UserStatusUpdate
from src.crud.user import get_user_by_email
from src.services.v1.user_services import (
    create_user_details,
    delete_user_details,
    get_all_user_details,
    get_user_details,
    update_user_details,
)
from src.utils.auth.auth import require_permission


router = APIRouter()


@router.post( "",
    response_model=UserResponse,
    dependencies=[
    Depends(require_permission("user:create")),
    Depends(require_permission("user:update")),
]
)
def create_or_update_user(
    payload: UserCreate,
    request: Request,
    db: Session = Depends(get_db),
) -> UserResponse:
    existing_user = get_user_by_email(db, payload.email)

    if existing_user:
        return update_user_details(
            db=db,
            user_id=existing_user.id,
            payload=payload,
            language=request.state.lang,
        )

    return create_user_details(
        db=db,
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
    return update_user_details(
        db=db,
        user_id=user_id,
        payload=UserUpdate(is_active=payload.is_active),
        language=request.state.lang,
    )


@router.delete("/{user_id}", response_model=UserDeleteResponse, dependencies=[Depends(require_permission("user:delete"))])
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
) -> UserDeleteResponse:
    delete_user_details(db, user_id)
    return UserDeleteResponse(message="User deleted successfully")



