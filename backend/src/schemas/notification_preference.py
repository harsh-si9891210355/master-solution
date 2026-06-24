from datetime import datetime, time

from pydantic import BaseModel, Field


class NotificationPreferenceResponse(BaseModel):
    user_id: int
    in_app_enabled: bool
    web_push_enabled: bool
    email_enabled: bool
    min_severity: str
    quiet_hours_enabled: bool
    quiet_hours_start: time | None
    quiet_hours_end: time | None
    quiet_hours_timezone: str
    override_critical: bool
    muted_until: datetime | None
    sound_enabled: bool
    sound_name: str


class NotificationPreferenceUpdate(BaseModel):
    in_app_enabled: bool | None = None
    web_push_enabled: bool | None = None
    email_enabled: bool | None = None
    min_severity: str | None = Field(default=None, description="LOW/MEDIUM/HIGH/CRITICAL")
    quiet_hours_enabled: bool | None = None
    quiet_hours_start: time | None = None
    quiet_hours_end: time | None = None
    quiet_hours_timezone: str | None = None
    override_critical: bool | None = None
    muted_until: datetime | None = None
    sound_enabled: bool | None = None
    sound_name: str | None = None
