"""Local (non-Auth0) admin-invite + first-time-login onboarding.

This is a self-contained flow that lives alongside — and does not touch — the
existing Auth0 invite/login code. Passwords are stored locally (bcrypt/pbkdf2
via Hasher); the user is emailed a temporary password and a link to the
first-time-login page.
"""

import secrets
import smtplib
from email.mime.text import MIMEText

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from src.core.config import settings
from src.crud.role import get_role_by_code
from src.crud.user import create_user, get_user_by_email, update_user_password
from src.schemas.auth import MessageResponse, UserResponse
from src.schemas.onboarding import (
    CompleteProfileRequest,
    FirstTimeLoginRequest,
    FirstTimeLoginResponse,
    LocalUserInvite,
)
from src.services.v1.auth_services import build_user_response
from src.utils.auth.auth_handler import Authentication
from src.utils.hashing_service import Hasher


def _generate_temp_password() -> str:
    """A readable one-time password the admin's invite email delivers."""
    return f"Tmp-{secrets.token_urlsafe(8)}"


def _send_temp_password_email(to_email: str, temp_password: str) -> None:
    link = f"{settings.frontend_url}/first-time-login"
    body = f"""
    Hi,

    An account has been created for you.

    Email:              {to_email}
    Temporary password: {temp_password}

    Go to {link}, sign in with the temporary password, set a new password and
    complete your profile. You can then log in normally.
    """

    msg = MIMEText(body)
    msg["Subject"] = "Your account — temporary password"
    msg["From"] = settings.smtp_user
    msg["To"] = to_email

    with smtplib.SMTP(settings.smtp_host, settings.smtp_port) as server:
        server.starttls()
        server.login(settings.smtp_user, settings.smtp_password)
        server.send_message(msg)


def invite_local_user(db: Session, payload: LocalUserInvite, language: str) -> UserResponse:
    """Admin creates a user with a temporary password and emails it to them."""
    existing = get_user_by_email(db, payload.email)
    if existing and existing.is_active:
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

    temp_password = _generate_temp_password()
    hashed = Hasher.get_hashed_password(temp_password)

    if existing:
        # Still onboarding (inactive) — re-issue a fresh temporary password.
        user = update_user_password(db, user=existing, hashed_password=hashed)
    else:
        user = create_user(
            db,
            email=payload.email,
            first_name=payload.email.split("@")[0],  # placeholder until step 2
            last_name="",
            mobile_number=None,
            role_id=role.id,
            hashed_password=hashed,
            is_active=False,  # cannot log in until onboarding completes
        )

    _send_temp_password_email(payload.email, temp_password)
    return build_user_response(user, language)


def first_time_login(db: Session, payload: FirstTimeLoginRequest) -> FirstTimeLoginResponse:
    """Step 1: verify the temporary password and set the new one. Returns a
    short-lived token that authorises the profile step."""
    user = get_user_by_email(db, payload.email)
    if not user or not Hasher.verify_password(payload.temporary_password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or temporary password",
        )

    if user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Account is already set up. Please log in.",
        )

    update_user_password(
        db, user=user, hashed_password=Hasher.get_hashed_password(payload.new_password)
    )

    token = Authentication.create_access_token({Authentication.EMAIL_KEY: user.email})
    return FirstTimeLoginResponse(token=token)


def complete_profile(db: Session, payload: CompleteProfileRequest) -> MessageResponse:
    """Step 2: save the profile and activate the account."""
    email = Authentication.verify_token(payload.token)
    if not email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired token",
        )

    user = get_user_by_email(db, email)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    if user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Profile already completed. Please log in.",
        )

    mobile = None
    if payload.mobile_number:
        mobile = f"{payload.country_code or ''}{payload.mobile_number}".strip()

    user.first_name = payload.first_name
    user.last_name = payload.last_name
    user.mobile_number = mobile
    user.department = payload.department
    user.city = payload.city
    user.state = payload.state
    user.country = payload.country
    user.is_active = True  # onboarding complete — user can now log in

    db.add(user)
    db.commit()
    db.refresh(user)

    return MessageResponse(message="Profile completed successfully. You can now log in.")
