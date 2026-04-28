from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from src.db.db_connection import get_db
from src.schemas.auth import (
    ForgotPasswordRequest,
    ForgotPasswordResponse,
    MessageResponse,
    TokenResponse,
    UserCreate,
    UserLogin,
    UserResponse,
    LoginSignupResponse,
)
from src.services.v1.auth_services import (
    build_user_response,
    forgot_password,
    get_current_user_from_token,
    login_user,
    logout_user,
    signup_user,
)
from src.utils.auth.auth_bearer import JWTBearer


router = APIRouter()


@router.post("/signup", response_model=LoginSignupResponse, status_code=201)
def signup(
    payload: UserCreate,
    request: Request,
    db: Session = Depends(get_db),
) -> LoginSignupResponse:
    return signup_user(db, payload, request, request.state.lang)


@router.post("/login", response_model=LoginSignupResponse)
def login(
    payload: UserLogin,
    request: Request,
    db: Session = Depends(get_db),
) -> LoginSignupResponse:
    return login_user(db, payload, request, request.state.lang)


@router.post("/logout", response_model=MessageResponse)
def logout(
    token: str = Depends(JWTBearer()),
    db: Session = Depends(get_db),
) -> MessageResponse:
    logout_user(db, token)
    return MessageResponse(message="Logged out successfully")


@router.post("/forgot-password", response_model=ForgotPasswordResponse)
def forgot_password_route(
    payload: ForgotPasswordRequest,
    db: Session = Depends(get_db),
) -> ForgotPasswordResponse:
    return forgot_password(db, payload.email)


@router.get("/me", response_model=UserResponse)
def read_current_user(
    request: Request,
    token: str = Depends(JWTBearer()),
    db: Session = Depends(get_db),
) -> UserResponse:
    user = get_current_user_from_token(db, token)
    return build_user_response(user, request.state.lang)
