import secrets
import smtplib
from email.mime.text import MIMEText

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from src.core.config import settings
from src.crud.role import get_role_by_code
from src.crud.user import create_user, delete_user, get_all_users, get_user_by_email, get_user_by_id, update_user
from src.schemas.auth import UserInvite, UserResponse
from src.schemas.user import UserUpdate
from src.services.v1.auth_services import build_user_response
from src.utils.hashing_service import Hasher
from src.utils.auth.auth_handler import Authentication
from src.utils.auth.auth0_client import Auth0Client, Auth0Error


def send_invite_email(to_email: str, token: str) -> None:
    """Email the invited user a link to our own set-password page. That page
    posts the new password to /auth/set-password, which writes it to BOTH Auth0
    and our DB — so the user can later sign in via Auth0 or local /login."""
    link = f"{settings.frontend_url}/set-password?token={token}"

    body = f"""
    Hi,

    An account has been created for you. Click the link below to set your
    password:

    {link}

    Link expires in {settings.access_token_expire_minutes} minutes.
    """

    msg = MIMEText(body)
    msg["Subject"] = "Set your password"
    msg["From"] = settings.smtp_user
    msg["To"] = to_email

    with smtplib.SMTP(settings.smtp_host, settings.smtp_port) as server:
        server.starttls()
        server.login(settings.smtp_user, settings.smtp_password)
        server.send_message(msg)


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

    # Create the user in Auth0 (throwaway password) so the account exists there;
    # the real password is chosen by the user via the set-password link and
    # written to both stores. If Auth0 fails we never create the local row.
    auth0 = Auth0Client()
    try:
        auth0.create_user(payload.email)
    except Auth0Error as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Could not invite the user via Auth0: {exc}",
        )

    # Only the email is collected at invite time; the name is filled in on the
    # user's first login. Seed first_name from the email local-part so the
    # NOT NULL columns are valid.
    local_part = payload.email.split("@")[0]
    user = create_user(
        db,
        email=payload.email,
        first_name=local_part,
        last_name="",
        mobile_number=None,
        role_id=role.id,
        # Placeholder until the user sets their password via the invite link.
        hashed_password=Hasher.get_hashed_password(secrets.token_urlsafe(32)),
        is_active=False,
    )

    # Email the user our set-password link (the token carries their email).
    token = Authentication.create_access_token({Authentication.EMAIL_KEY: payload.email})
    send_invite_email(payload.email, token)

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
