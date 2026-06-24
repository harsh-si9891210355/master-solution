from datetime import datetime

from pydantic import BaseModel, Field


class AlertResponse(BaseModel):
    id: int
    event_id: int | None
    camera_id: int
    camera_name: str
    location_id: int
    location_name: str
    usecase_id: int
    usecase_name: str
    title: str
    severity: str
    category: str
    status: str
    evidence_url: str | None
    occurrence_count: int
    event_start_time: datetime
    event_end_time: datetime
    acknowledged_by: int | None
    acknowledged_at: datetime | None
    incident_id: int | None
    created_at: datetime
    updated_at: datetime | None


class AlertsResponse(BaseModel):
    alerts: list[AlertResponse]
    total: int
    page: int
    page_size: int


class AlertTimelineEntry(BaseModel):
    id: int
    action: str
    from_status: str | None
    to_status: str | None
    note: str | None
    actor_id: int | None
    actor_name: str | None
    created_at: datetime


class AlertDetailResponse(AlertResponse):
    timeline: list[AlertTimelineEntry]
    related_alerts: list[AlertResponse]


class AlertStatusUpdate(BaseModel):
    status: str = Field(..., description="One of NEW/ACK/INVESTIGATING/INCIDENT/RESOLVED/CLOSED")
    note: str | None = Field(default=None, max_length=1000)


class AlertSnoozeRequest(BaseModel):
    minutes: int = Field(default=60, ge=1, le=1440)


class AlertActionResponse(BaseModel):
    message: str
    alert: AlertResponse


class CreateIncidentFromAlertRequest(BaseModel):
    issue_type: str = Field(..., max_length=100)
    priority: str = Field(..., description="Low/Medium/High/Critical")
    summary: str | None = Field(default=None, max_length=1000)
    description: str | None = Field(default=None, max_length=1000)


class CreateIncidentFromAlertResponse(BaseModel):
    message: str
    incident_id: str
    alert: AlertResponse
