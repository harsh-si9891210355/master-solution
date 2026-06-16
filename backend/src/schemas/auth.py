from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator


class UserCreate(BaseModel):
    email: EmailStr
    first_name: str = Field(..., min_length=2, max_length=255)
    last_name: str = Field(..., min_length=1, max_length=255)
    mobile_number: str | None = Field(default=None, min_length=7, max_length=20)
    role_code: str = Field(default="user", min_length=2, max_length=50)
    password: str

    @field_validator("password")
    @classmethod
    def password(cls, value: str):

        if len(value) < 8:
            raise ValueError(
                "Password is too short. Kindly enter at least 8 characters."
            )

        if len(value) > 128:
            raise ValueError(
                "Password is too long. Kindly keep it within 128 characters."
            )
        
        return value


class UserLogin(BaseModel):
    email: EmailStr
    password: str

    @field_validator("password")
    @classmethod
    def password(cls, value: str):

        if len(value) < 8:
            raise ValueError(
                "Password is too short. Kindly enter at least 8 characters."
            )

        if len(value) > 128:
            raise ValueError(
                "Password is too long. Kindly keep it within 128 characters."
            )
        
        return value


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    reset_token: str
    new_password: str

    @field_validator("new_password")
    @classmethod
    def password(cls, value: str):

        if len(value) < 8:
            raise ValueError(
                "Password is too short. Kindly enter at least 8 characters."
            )

        if len(value) > 128:
            raise ValueError(
                "Password is too long. Kindly keep it within 128 characters."
            )
        
        return value


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class MessageResponse(BaseModel):
    message: str


class ForgotPasswordResponse(MessageResponse):
    reset_token: str


class PermissionResponseAuth(BaseModel):
    id: int
    permission_name: str

    class Config:
        from_attributes = True


class UserResponse(BaseModel):
    id: int
    email: EmailStr
    first_name: str
    last_name: str
    mobile_number: str | None
    role_code: str
    role_name: str
    is_active: bool
    status: bool


class LoginSignupResponse(BaseModel):
    code: int = 200
    access_token: str
    token_type: str = "bearer"
    user: UserResponse
    permissions: list[str]


class SessionResponse(BaseModel):
    """Returned after validating an Auth0-issued token. No backend token —
    Auth0 owns the access token; we only resolve identity + authorization."""

    user: UserResponse
    permissions: list[str]

class SetPasswordRequest(BaseModel):
    token: str
    password: str

    @field_validator("password")
    @classmethod
    def password(cls, value: str):

        if len(value) < 8:
            raise ValueError(
                "Password is too short. Kindly enter at least 8 characters."
            )

        if len(value) > 128:
            raise ValueError(
                "Password is too long. Kindly keep it within 128 characters."
            )

        return value
