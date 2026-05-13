from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from src.crud.role import get_role_by_code
from src.crud.user import create_user, delete_user, get_all_users, get_user_by_email, get_user_by_id, update_user
from src.schemas.auth import UserCreate, UserResponse
from src.schemas.user import UserUpdate
from src.services.v1.auth_services import build_user_response
from src.utils.hashing_service import Hasher
from src.utils.auth.auth_handler import Authentication
import smtplib
from email.mime.text import MIMEText
from src.core.config import settings

from datetime import datetime, timedelta, timezone
from jose import jwt


def send_set_password_email(to_email: str, token: str):

    link = f"http://localhost:8010/set-password?token={token}"

    subject = "Set your password"

    body = f"""
    Hi,

    Click the link below to set your password:

    {link}

    Link expires in 24 hours.
    """

    msg = MIMEText(body)
    msg["Subject"] = subject
    msg["From"] = settings.smtp_user
    msg["To"] = to_email

    with smtplib.SMTP(settings.smtp_host, settings.smtp_port) as server:
        server.starttls()
        server.login(settings.smtp_user, settings.smtp_password)
        server.send_message(msg)

def create_user_details(db: Session, payload: UserCreate, language: str) -> UserResponse:
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

    user = create_user(
        db,
        email=payload.email,
        first_name=payload.first_name,
        last_name=payload.last_name,
        mobile_number=payload.mobile_number,
        role_id=role.id,
        hashed_password = Hasher.get_hashed_password("Temp@123"),  # no password yet
        is_active=False,
    )

    token = Authentication.create_access_token({Authentication.EMAIL_KEY: payload.email})

    send_set_password_email(user.email, token)

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
