from pydantic import BaseModel, Field

from src.schemas.auth import UserResponse


class UserUpdate(BaseModel):
    first_name_en: str | None = Field(default=None, min_length=2, max_length=255)
    first_name_es: str | None = Field(default=None, min_length=2, max_length=255)
    first_name_fr: str | None = Field(default=None, min_length=2, max_length=255)
    last_name_en: str | None = Field(default=None, min_length=1, max_length=255)
    last_name_es: str | None = Field(default=None, min_length=1, max_length=255)
    last_name_fr: str | None = Field(default=None, min_length=1, max_length=255)
    mobile_number: str | None = Field(default=None, min_length=7, max_length=20)
    role_code: str | None = Field(default=None, min_length=2, max_length=50)
    is_active: bool | None = None
    status: bool | None = None


class UserDeleteResponse(BaseModel):
    message: str


class UsersResponse(BaseModel):
    users: list[UserResponse]
