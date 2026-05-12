from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from src.db.db_connection import get_db
from src.schemas.auth import UserCreate, UserResponse
from src.schemas.user import UserDeleteResponse, UserUpdate, UsersResponse
from src.services.v1.user_services import (
    create_user_details,
    delete_user_details,
    get_all_user_details,
    get_user_details,
    update_user_details,
)
from src.utils.auth.auth import require_permission


router = APIRouter()


@router.post("", response_model=UserResponse, dependencies=[Depends(require_permission("user:create"))])
def create_user(
    payload: UserCreate,
    request: Request,
    db: Session = Depends(get_db),
) -> UserResponse:
    return create_user_details(db, payload, request.state.lang)


@router.get("", response_model=UsersResponse, dependencies=[Depends(require_permission("user:read"))])
def get_users(
    request: Request,
    db: Session = Depends(get_db),
) -> UsersResponse:
    return UsersResponse(users=get_all_user_details(db, request.state.lang))


@router.get("/{user_id}", response_model=UserResponse, dependencies=[Depends(require_permission("user:read"))])
def get_user(
    user_id: int,
    request: Request,
    db: Session = Depends(get_db),
) -> UserResponse:
    return get_user_details(db, user_id, request.state.lang)


@router.put("/{user_id}", response_model=UserResponse, dependencies=[Depends(require_permission("user:update"))])
def update_user(
    user_id: int,
    payload: UserUpdate,
    request: Request,
    db: Session = Depends(get_db),
) -> UserResponse:
    return update_user_details(db, user_id, payload, request.state.lang)


@router.delete("/{user_id}", response_model=UserDeleteResponse, dependencies=[Depends(require_permission("user:delete"))])
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
) -> UserDeleteResponse:
    delete_user_details(db, user_id)
    return UserDeleteResponse(message="User deleted successfully")
