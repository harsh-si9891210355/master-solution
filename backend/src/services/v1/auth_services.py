import secrets
import smtplib
from datetime import datetime, timezone
from email.mime.text import MIMEText

from fastapi import HTTPException, Request, status
from sqlalchemy.orm import Session

from src.core.config import settings
from src.crud.role import get_role_by_code
from src.crud.user import create_user, get_user_by_email, get_users_by_role_code, update_user_password, update_user
from src.crud.users_token import create_user_token, get_active_user_token, revoke_all_user_tokens, revoke_user_token, get_any_active_user_token
from src.crud.access import get_role_permissions
from src.models.user import User
from src.schemas.auth import ForgotPasswordResponse, LoginSignupResponse, MessageResponse, SessionResponse, TokenResponse, UserCreate, UserLogin, UserResponse
from src.utils.translation import resolve_translation
from src.utils.auth.auth_handler import Authentication
from src.utils.auth.auth0_client import Auth0Client, Auth0Error
from src.utils.auth.auth0_token import Auth0TokenValidator, Auth0TokenError
from src.utils.hashing_service import Hasher


# Role assigned to users auto-provisioned on their first Auth0 login.
DEFAULT_AUTH0_ROLE_CODE = "user"


def _role_permission_names(db: Session, role_id: int) -> list[str]:
    """Permissions for a role formatted as "resource:scope"."""
    role_permissions = get_role_permissions(db, role_id)
    return [f"{rp.resource.name}:{rp.scope.name}" for rp in role_permissions]


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


def _notify_admins_of_signup(db: Session, new_user: User) -> None:
    """Send an approval-request email to every admin when a new user signs up.

    Failures are swallowed so a mail outage never blocks the signup itself —
    the account is already created and awaiting activation regardless.
    """
    admins = get_users_by_role_code(db, "admin")
    admin_emails = [admin.email for admin in admins if admin.email]
    if not admin_emails:
        return

    subject = "New user signup awaiting approval"
    body = f"""
    Hi,

    A new user has signed up and is awaiting approval:

    Name:   {new_user.first_name} {new_user.last_name}
    Email:  {new_user.email}
    Mobile: {new_user.mobile_number or "-"}

    The account is currently inactive. Please review and activate it from the
    User Management screen so the user can sign in.
    """

    msg = MIMEText(body)
    msg["Subject"] = subject
    msg["From"] = settings.smtp_user
    msg["To"] = ", ".join(admin_emails)

    try:
        with smtplib.SMTP(settings.smtp_host, settings.smtp_port) as server:
            server.starttls()
            server.login(settings.smtp_user, settings.smtp_password)
            server.send_message(msg)
    except Exception:
        # Notification email is best-effort; do not fail the signup if it errors.
        pass


def signup_user(db: Session, payload: UserCreate, request: Request, language: str) -> MessageResponse:
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

    # New self-signups start inactive and must be activated by an admin
    # before they are allowed to sign in.
    user = create_user(
        db,
        email=payload.email,
        first_name=payload.first_name,
        last_name=payload.last_name,
        mobile_number=payload.mobile_number,
        role_id=role.id,
        hashed_password=Hasher.get_hashed_password(payload.password),
        is_active=False,
    )

    _notify_admins_of_signup(db, user)

    return MessageResponse(
        message=(
            "Your signup request has been submitted successfully. An administrator "
            "will review and approve your account. You will be able to sign in once "
            "your account has been activated."
        )
    )


def login_user(db: Session, payload: UserLogin, request: Request, language: str) -> LoginSignupResponse:
    user = get_user_by_email(db, payload.email)
    if not user or not Hasher.verify_password(payload.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )
    
    # Check if account is active
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account is currently inactive. Please contact the Super Admin for account activation or further assistance.",
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


def reset_password(db: Session, reset_token: str, new_password: str) -> MessageResponse:
    user_email = Authentication.verify_token(reset_token)
    if not user_email:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired reset token",
        )

    user = get_user_by_email(db, user_email)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    update_user_password(
        db,
        user=user,
        hashed_password=Hasher.get_hashed_password(new_password),
    )
    revoke_all_user_tokens(db, userid=user.id)

    return MessageResponse(message="Password reset successfully")


def get_current_user_from_token(db: Session, token: str) -> User:
    return resolve_user_from_token(db, token)


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

    return UserResponse(
        id=user.id,
        email=user.email,
        first_name= user.first_name,
        last_name= user.last_name,
        mobile_number=user.mobile_number,
        role_code=user.role.code,
        role_name=role_name,
        is_active=user.is_active,
        status=user.status,
    )

def set_password(db: Session, email: str) -> MessageResponse:
    """(Re)send the Auth0 set-password email for a managed user.

    The actual password is set by the user on Auth0's hosted page via the link;
    Auth0 — not this backend — stores it. This just triggers/resends that email.
    """
    user = get_user_by_email(db, email)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    try:
        Auth0Client().send_set_password_email(email)
    except Auth0Error as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Could not send the set-password email: {exc}",
        )

    return MessageResponse(message="Password setup email sent")


def resolve_auth0_user(db: Session, token: str) -> User:
    """Validate an Auth0-issued access token and return the matching local user.

    On first login the user won't exist yet, so we create one with the default
    role (find-or-create by email). Raises 401 if the token is invalid.

    Shared by the /auth/session exchange and the route guards (JWTBearer /
    require_permission), so every protected route accepts the Auth0 token.
    """
    validator = Auth0TokenValidator()
    try:
        profile = validator.get_profile(token)
    except Auth0TokenError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid Auth0 token: {exc}",
        )

    user = get_user_by_email(db, profile["email"])
    if not user:
        role = get_role_by_code(db, DEFAULT_AUTH0_ROLE_CODE)
        if not role:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Default role '{DEFAULT_AUTH0_ROLE_CODE}' is not configured",
            )
        user = create_user(
            db,
            email=profile["email"],
            first_name=profile["first_name"],
            last_name=profile["last_name"],
            mobile_number=None,
            role_id=role.id,
            # Auth0 owns the credential; no usable local password.
            hashed_password=Hasher.get_hashed_password(secrets.token_urlsafe(32)),
            is_active=True,
        )
    elif not user.is_active:
        # First login after an admin invite: capture the real name from Auth0
        # (the invite only stored the email) and activate the account.
        update_user(
            db,
            user=user,
            first_name=profile["first_name"],
            last_name=profile["last_name"],
            is_active=True,
        )

    return user


def resolve_user_from_token(db: Session, token: str) -> User:
    """Resolve the request's user from either auth scheme.

    1. Legacy local backend JWT (issued by /auth/login) — verified with our
       secret and checked against the active-token store.
    2. Otherwise an Auth0 access token (the primary path).

    An Auth0 token won't decode with the local secret, so step 1 simply returns
    None for it and we fall through to Auth0 — the two schemes don't collide.
    """
    local_email = Authentication.verify_token(token)
    if local_email:
        user = get_user_by_email(db, local_email)
        if user:
            active_token = get_active_user_token(
                db,
                userid=user.id,
                token=token,
                now=datetime.now(timezone.utc),
            )
            if active_token:
                return user

    return resolve_auth0_user(db, token)


def get_or_create_session(db: Session, token: str, language: str) -> SessionResponse:
    """Resolve an Auth0-issued access token to a local user + permissions.

    Auth0 owns the access token (issued to the frontend via Universal Login).
    We validate it, find-or-create the matching local user, and return identity
    + authorization only — no backend token is issued.
    """
    user = resolve_auth0_user(db, token)
    return SessionResponse(
        user=build_user_response(user, language),
        permissions=_role_permission_names(db, user.role_id),
    )