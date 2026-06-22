from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from src.db.db_connection import get_db
from src.schemas.auth import MessageResponse, UserResponse
from src.schemas.onboarding import (
    CompleteProfileRequest,
    FirstTimeLoginRequest,
    FirstTimeLoginResponse,
    LocalUserInvite,
)
from src.services.v1.onboarding_services import (
    complete_profile,
    first_time_login,
    invite_local_user,
)
from src.utils.auth.auth import require_permission


router = APIRouter()


@router.post(
    "/invite",
    response_model=UserResponse,
    dependencies=[Depends(require_permission("user:create"))],
)
def invite_local_user_route(
    payload: LocalUserInvite,
    request: Request,
    db: Session = Depends(get_db),
) -> UserResponse:
    """Admin invites a user with a temporary password emailed to them."""
    return invite_local_user(db, payload, request.state.lang)


@router.post("/first-time-login", response_model=FirstTimeLoginResponse)
def first_time_login_route(
    payload: FirstTimeLoginRequest,
    db: Session = Depends(get_db),
) -> FirstTimeLoginResponse:
    """Step 1 — sign in with the temporary password and set a new one."""
    return first_time_login(db, payload)


@router.post("/complete-profile", response_model=MessageResponse)
def complete_profile_route(
    payload: CompleteProfileRequest,
    db: Session = Depends(get_db),
) -> MessageResponse:
    """Step 2 — complete the profile and activate the account."""
    return complete_profile(db, payload)
