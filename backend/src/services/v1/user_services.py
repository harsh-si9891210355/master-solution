import secrets

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from src.crud.role import get_role_by_code
from src.crud.user import create_user, delete_user, get_all_users, get_user_by_email, get_user_by_id, update_user
from src.schemas.auth import UserInvite, UserResponse
from src.schemas.user import UserUpdate
from src.services.v1.auth_services import build_user_response
from src.utils.hashing_service import Hasher
from src.utils.auth.auth0_client import Auth0Client, Auth0Error


def create_user_details(db: Session, payload: UserInvite, language: str) -> UserResponse:
    existing_user = get_user_by_email(db, payload.email)
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email is already registered",
        )

    role = get_role_by_code(db, payload.role_code)
    if not role:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid role code",
        )

    # Create the user in Auth0 and have Auth0 email them a set-password link.
    # If Auth0 fails we never create the local row, so the two stores can't drift.
    auth0 = Auth0Client()
    try:
        auth0.create_user(payload.email)
        auth0.send_set_password_email(payload.email)
    except Auth0Error as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Could not invite the user via Auth0: {exc}",
        )

    # Only the email is collected at invite time; the name is filled in from
    # Auth0 on the user's first login (see get_or_create_session). Seed
    # first_name from the email local-part so the NOT NULL columns are valid.
    local_part = payload.email.split("@")[0]
    user = create_user(
        db,
        email=payload.email,
        first_name=local_part,
        last_name="",
        mobile_number=None,
        role_id=role.id,
        # Auth0 owns the credential; no usable local password.
        hashed_password=Hasher.get_hashed_password(secrets.token_urlsafe(32)),
        is_active=False,
    )

    return build_user_response(user, language)


def get_user_details(db: Session, user_id: int, language: str) -> UserResponse:
    user = get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )
    return build_user_response(user, language)


def get_all_user_details(db: Session, language: str) -> list[UserResponse]:
    users = get_all_users(db)
    return [build_user_response(user, language) for user in users]


def update_user_details(db: Session, user_id: int, payload: UserUpdate, language: str) -> UserResponse:
    user = get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    role_id = None
    if payload.role_code is not None:
        role = get_role_by_code(db, payload.role_code)
        if not role:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid role code",
            )
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


def delete_user_details(db: Session, user_id: int) -> None:
    user = get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )
    delete_user(db, user=user)


def change_user_status_details(
    db: Session,
    user_id: int,
    is_active: bool,
    language: str,
) -> UserResponse:
    user = get_user_by_id(db, user_id)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    user.is_active = is_active

    db.add(user)
    db.commit()
    db.refresh(user)

    return build_user_response(user, language)
