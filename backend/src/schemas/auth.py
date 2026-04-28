from pydantic import BaseModel, ConfigDict, EmailStr, Field


class UserCreate(BaseModel):
    email: EmailStr
    first_name_en: str = Field(min_length=2, max_length=255)
    first_name_es: str = Field(min_length=2, max_length=255)
    first_name_fr: str = Field(min_length=2, max_length=255)
    last_name_en: str = Field(min_length=1, max_length=255)
    last_name_es: str = Field(min_length=1, max_length=255)
    last_name_fr: str = Field(min_length=1, max_length=255)
    mobile_number: str | None = Field(default=None, min_length=7, max_length=20)
    role_code: str = Field(default="user", min_length=2, max_length=50)
    password: str = Field(min_length=8, max_length=128)


class UserLogin(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    reset_token: str
    new_password: str = Field(min_length=8, max_length=128)


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
