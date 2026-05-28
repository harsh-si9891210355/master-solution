from datetime import datetime

from pydantic import BaseModel, Field


class EventCreate(BaseModel):
    camera_id: int
    location_id: int
    usecase_id: int
    evidence_url: str | None = Field(default=None, max_length=255)
    event_start_time: datetime
    event_end_time: datetime


class EventResponse(BaseModel):
    id: int
    camera_id: int
    camera_name: str
    location_id: int
    location_name: str
    usecase_id: int
    usecase_name: str
    event_description: str | None
    evidence_url: str | None
    created_date_time: datetime
    event_start_time: datetime
    event_end_time: datetime


class EventsResponse(BaseModel):
    events: list[EventResponse]


class EventDeleteResponse(BaseModel):
    message: str
