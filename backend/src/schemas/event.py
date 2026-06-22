from datetime import datetime

from pydantic import BaseModel, Field


class EventCreate(BaseModel):
    camera_id: int
    location_id: int | None = None
    usecase_id: int | None = None
    unique_event_id: str | None = Field(default=None, max_length=6)
    metadata: str | None = None
    evidence_url: str | None = Field(default=None, max_length=255)
    evidence_storage_path: str | None = Field(default=None, max_length=400)
    number_of_frames: int | None = None
    frames_range: str | None = Field(default=None, max_length=400)
    event_timestamp: int | None = None
    event_start_time: datetime | None = None
    event_end_time: datetime | None = None
    is_email_sent: int = 0
    is_notification_sent: int = 0
    is_event_read: int = 0
    event_stream_quality: int = 1
    notification_status: int | None = None


class EventResponse(BaseModel):
    event_id: int
    unique_event_id: str | None = None
    camera_id: int
    camera_name: str
    location_id: int | None = None
    location_name: str | None = None
    usecase_id: int | None = None
    usecase_name: str | None = None
    event_description: str | None = None
    metadata: str | None = None
    evidence_storage_path: str | None = None
    number_of_frames: int | None = None
    frames_range: str | None = None
    event_timestamp: int | None = None
    created_date_time: datetime | None = None
    event_end_time: datetime | None = None
    is_email_sent: int = 0
    is_notification_sent: int = 0
    is_event_read: int = 0
    event_stream_quality: int = 1
    notification_status: int | None = None


class EventsResponse(BaseModel):
    """Paginated list response."""

    events: list[EventResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


class EventDeleteResponse(BaseModel):
    message: str
