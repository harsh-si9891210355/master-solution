"""Schemas for the local (non-Auth0) admin-invite + first-time-login flow.

Flow:
  1. Admin invites a user by email  -> temp password emailed + link to
     {FRONTEND_URL}/first-time-login
  2. First-time login: user enters email + temp password + new password
     -> password changed, returns a short-lived onboarding token
  3. Complete profile: user submits name/department/phone/city/state/country
     (authorised by the onboarding token) -> account activated
  4. User logs in normally with the new password.
"""

from pydantic import BaseModel, EmailStr, Field, field_validator, model_validator


def _validate_password_length(value: str) -> str:
    if len(value) < 8:
        raise ValueError("Password is too short. Kindly enter at least 8 characters.")
    if len(value) > 128:
        raise ValueError("Password is too long. Kindly keep it within 128 characters.")
    return value


class LocalUserInvite(BaseModel):
    """Admin invite — only the email (and optional role) is required."""

    email: EmailStr
    role_code: str = Field(default="user", min_length=2, max_length=50)


class FirstTimeLoginRequest(BaseModel):
    """Step 1: sign in with the temporary password and set a new one."""

    email: EmailStr
    temporary_password: str
    new_password: str
    confirm_password: str

    @field_validator("new_password")
    @classmethod
    def _password_policy(cls, value: str) -> str:
        return _validate_password_length(value)

    @model_validator(mode="after")
    def _passwords_match(self):
        if self.new_password != self.confirm_password:
            raise ValueError("New password and confirm password do not match.")
        return self


class FirstTimeLoginResponse(BaseModel):
    token: str
    message: str = "Password updated. Please complete your profile."


class CompleteProfileRequest(BaseModel):
    """Step 2: complete the profile. Authorised by the onboarding `token`
    returned from step 1."""

    token: str
    first_name: str = Field(..., min_length=2, max_length=255)
    last_name: str = Field(..., min_length=1, max_length=255)
    department: str | None = Field(default=None, max_length=255)
    country_code: str | None = Field(default=None, max_length=8)
    mobile_number: str | None = Field(default=None, min_length=5, max_length=15)
    city: str | None = Field(default=None, max_length=255)
    state: str | None = Field(default=None, max_length=255)
    country: str | None = Field(default=None, max_length=255)
