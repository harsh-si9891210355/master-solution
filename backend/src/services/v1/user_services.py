import secrets

from sqlalchemy.orm import Session

from src.crud.role import get_role_by_code
from src.crud.user import create_user, delete_user, get_all_users, get_user_by_email, get_user_by_id, update_user
from src.schemas.auth import UserInvite, UserResponse
from src.schemas.common import CommonFailureResponse
from src.schemas.user import UserDeleteResponse, UsersResponse, UserUpdate
from src.services.v1.auth_services import build_user_response
from src.utils.auth.auth0_client import Auth0Client, Auth0Error
from src.utils.error_handler import handle_db_exceptions
from src.utils.hashing_service import Hasher


@handle_db_exceptions
def create_user_details(db: Session, payload: UserInvite, language: str) -> UserResponse | CommonFailureResponse:
    if get_user_by_email(db, payload.email):
        return CommonFailureResponse(code=400, message="Email is already registered")

    role = get_role_by_code(db, payload.role_code)
    if not role:
        return CommonFailureResponse(code=400, message="Invalid role code")

    # Provision in Auth0 first; if it fails we never create the local row so the
    # two stores can't drift.
    try:
        auth0 = Auth0Client()
        auth0.create_user(payload.email)
        auth0.send_set_password_email(payload.email)
    except Auth0Error as exc:
        return CommonFailureResponse(code=502, message=f"Could not invite the user via Auth0: {exc}")

    user = create_user(
        db,
        email=payload.email,
        first_name=payload.email.split("@")[0],  # filled in on first login
        last_name="",
        mobile_number=None,
        role_id=role.id,
        hashed_password=Hasher.get_hashed_password(secrets.token_urlsafe(32)),
        is_active=False,
    )
    return build_user_response(user, language)


@handle_db_exceptions
def get_user_details(db: Session, user_id: int, language: str) -> UserResponse | CommonFailureResponse:
    user = get_user_by_id(db, user_id)
    if not user:
        return CommonFailureResponse(code=404, message="User not found")
    return build_user_response(user, language)


@handle_db_exceptions
def get_all_user_details(db: Session, language: str) -> UsersResponse | CommonFailureResponse:
    return UsersResponse(users=[build_user_response(user, language) for user in get_all_users(db)])


@handle_db_exceptions
def update_user_details(db: Session, user_id: int, payload: UserUpdate, language: str) -> UserResponse | CommonFailureResponse:
    user = get_user_by_id(db, user_id)
    if not user:
        return CommonFailureResponse(code=404, message="User not found")

    role_id = None
    if payload.role_code is not None:
        role = get_role_by_code(db, payload.role_code)
        if not role:
            return CommonFailureResponse(code=400, message="Invalid role code")
        role_id = role.id

    updated_user = update_user(
        db,
        user=user,
        first_name=payload.first_name,
        last_name=payload.last_name,
        mobile_number=payload.mobile_number,
        role_id=role_id,
        is_active=getattr(payload, "is_active", None),
        status=getattr(payload, "status", None),
    )
    return build_user_response(updated_user, language)


@handle_db_exceptions
def delete_user_details(db: Session, user_id: int) -> UserDeleteResponse | CommonFailureResponse:
    user = get_user_by_id(db, user_id)
    if not user:
        return CommonFailureResponse(code=404, message="User not found")
    delete_user(db, user=user)
    return UserDeleteResponse(message="User deleted successfully")


@handle_db_exceptions
def change_user_status_details(db: Session, user_id: int, is_active: bool, language: str) -> UserResponse | CommonFailureResponse:
    user = get_user_by_id(db, user_id)
    if not user:
        return CommonFailureResponse(code=404, message="User not found")

    user.is_active = is_active
    db.add(user)
    db.commit()
    db.refresh(user)
    return build_user_response(user, language)
