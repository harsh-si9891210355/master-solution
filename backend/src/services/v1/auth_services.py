from datetime import datetime, timezone

from fastapi import HTTPException, Request, status
from sqlalchemy.orm import Session

from src.crud.role import get_role_by_code
from src.crud.user import create_user, get_user_by_email
from src.crud.users_token import create_user_token, get_active_user_token, revoke_user_token, get_any_active_user_token
from src.crud.access import get_role_permissions
from src.models.user import User
from src.schemas.auth import ForgotPasswordResponse, TokenResponse, UserCreate, UserLogin, UserResponse, LoginSignupResponse
from src.utils.translation import resolve_translation
from src.utils.auth.auth_handler import Authentication
from src.utils.hashing_service import Hasher


def _store_access_token(db: Session, user: User, token: str, request: Request) -> None:
    expires_at = Authentication.get_token_expiry(token)
    if not expires_at:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to determine token expiry",
        )

    create_user_token(
        db,
        userid=user.id,
        token=token,
        expires_at=expires_at,
        device_id=request.headers.get("x-device-id"),
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
    )


def _build_login_response(db: Session, user: User, access_token: str, language: str) -> LoginSignupResponse:
    """Build comprehensive login/signup response with user details and permissions"""
    user_response = build_user_response(user, language)
    
    # Get all permissions for the user's role
    role_permissions = get_role_permissions(db, user.role_id)
    # Format permissions as "resource:scope" (e.g., "camera:read", "user:create")
    permission_names = [f"{rp.resource.name}:{rp.scope.name}" for rp in role_permissions]
    
    return LoginSignupResponse(
        code=200,
        access_token=access_token,
        token_type="bearer",
        user=user_response,
        permissions=permission_names,
    )


def signup_user(db: Session, payload: UserCreate, request: Request, language: str) -> LoginSignupResponse:
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
        first_name_en=payload.first_name_en,
        first_name_es=payload.first_name_es,
        first_name_fr=payload.first_name_fr,
        last_name_en=payload.last_name_en,
        last_name_es=payload.last_name_es,
        last_name_fr=payload.last_name_fr,
        mobile_number=payload.mobile_number,
        role_id=role.id,
        hashed_password=Hasher.get_hashed_password(payload.password),
    )
    access_token = Authentication.create_access_token(
        {Authentication.EMAIL_KEY: user.email}
    )
    _store_access_token(db, user, access_token, request)
    return _build_login_response(db, user, access_token, language)


def login_user(db: Session, payload: UserLogin, request: Request, language: str) -> LoginSignupResponse:
    user = get_user_by_email(db, payload.email)
    if not user or not Hasher.verify_password(payload.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    # Check if user has an active, non-expired token
    active_token = get_any_active_user_token(
        db,
        userid=user.id,
        now=datetime.now(timezone.utc),
    )
    if active_token:
        # Reuse existing token instead of creating a new one
        return _build_login_response(db, user, active_token.token, language)

    # Create new token only if no active token exists
    access_token = Authentication.create_access_token(
        {Authentication.EMAIL_KEY: user.email}
    )
    _store_access_token(db, user, access_token, request)
    return _build_login_response(db, user, access_token, language)


def forgot_password(db: Session, email: str) -> ForgotPasswordResponse:
    user = get_user_by_email(db, email)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User with this email does not exist",
        )

    reset_token = Authentication.create_access_token(
        {Authentication.EMAIL_KEY: user.email}
    )
    return ForgotPasswordResponse(
        message="Use this token to reset your password",
        reset_token=reset_token,
    )


def get_current_user_from_token(db: Session, token: str) -> User:
    user_email = Authentication.verify_token(token)
    if not user_email:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired access token",
        )

    user = get_user_by_email(db, user_email)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )

    token_entry = get_active_user_token(
        db,
        userid=user.id,
        token=token,
        now=datetime.now(timezone.utc),
    )
    if not token_entry:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has been revoked or is no longer active",
        )
    return user


def logout_user(db: Session, token: str) -> None:
    user = get_current_user_from_token(db, token)
    revoke_user_token(db, userid=user.id, token=token)


def build_user_response(user: User, language: str) -> UserResponse:
    role_translation = resolve_translation(
        [
            type("RoleTranslation", (), {"language": "en", "value": user.role.name_en})(),
            type("RoleTranslation", (), {"language": "es", "value": user.role.name_es})(),
            type("RoleTranslation", (), {"language": "fr", "value": user.role.name_fr})(),
        ],
        language,
    )
    role_name = role_translation.value if role_translation else user.role.name_en
    first_name_translation = resolve_translation(
        [
            type("UserTranslation", (), {"language": "en", "value": user.first_name_en})(),
            type("UserTranslation", (), {"language": "es", "value": user.first_name_es})(),
            type("UserTranslation", (), {"language": "fr", "value": user.first_name_fr})(),
        ],
        language,
    )
    last_name_translation = resolve_translation(
        [
            type("UserTranslation", (), {"language": "en", "value": user.last_name_en})(),
            type("UserTranslation", (), {"language": "es", "value": user.last_name_es})(),
            type("UserTranslation", (), {"language": "fr", "value": user.last_name_fr})(),
        ],
        language,
    )

    return UserResponse(
        id=user.id,
        email=user.email,
        first_name=first_name_translation.value if first_name_translation else user.first_name_en,
        last_name=last_name_translation.value if last_name_translation else user.last_name_en,
        mobile_number=user.mobile_number,
        role_code=user.role.code,
        role_name=role_name,
        is_active=user.is_active,
        status=user.status,
    )
