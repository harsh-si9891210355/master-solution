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
from src.utils.auth.auth_bearer import JWTBearer


router = APIRouter()


@router.post("", response_model=UserResponse)
def create_user(
    payload: UserCreate,
    request: Request,
    _: str = Depends(JWTBearer()),
    db: Session = Depends(get_db),
) -> UserResponse:
    return create_user_details(db, payload, request.state.lang)


@router.get("", response_model=UsersResponse)
def get_users(
    request: Request,
    _: str = Depends(JWTBearer()),
    db: Session = Depends(get_db),
) -> UsersResponse:
    return UsersResponse(users=get_all_user_details(db, request.state.lang))


@router.get("/{user_id}", response_model=UserResponse)
def get_user(
    user_id: int,
    request: Request,
    _: str = Depends(JWTBearer()),
    db: Session = Depends(get_db),
) -> UserResponse:
    return get_user_details(db, user_id, request.state.lang)


@router.put("/{user_id}", response_model=UserResponse)
def update_user(
    user_id: int,
    payload: UserUpdate,
    request: Request,
    _: str = Depends(JWTBearer()),
    db: Session = Depends(get_db),
) -> UserResponse:
    return update_user_details(db, user_id, payload, request.state.lang)


@router.delete("/{user_id}", response_model=UserDeleteResponse)
def delete_user(
    user_id: int,
    _: str = Depends(JWTBearer()),
    db: Session = Depends(get_db),
) -> UserDeleteResponse:
    delete_user_details(db, user_id)
    return UserDeleteResponse(message="User deleted successfully")
