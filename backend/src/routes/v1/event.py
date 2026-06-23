from datetime import datetime

from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.orm import Session

from src.db.db_connection import get_db
from src.schemas.event import EventCreate, EventDeleteResponse, EventResponse, EventsResponse
from src.services.v1.event_services import (
    create_event_details,
    delete_event_details,
    get_all_event_details,
    get_event_details,
)
from src.utils.auth.auth import require_permission


router = APIRouter()


@router.post("", response_model=EventResponse, status_code=201, dependencies=[Depends(require_permission("event:create"))])
def create_event(
    payload: EventCreate,
    request: Request,
    db: Session = Depends(get_db),
) -> EventResponse:
    return create_event_details(db, payload, request.state.lang)


@router.get("", response_model=EventsResponse, dependencies=[Depends(require_permission("event:read"))])
def get_events(
    request: Request,
    db: Session = Depends(get_db),
    camera_id: int | None = Query(default=None),
    location_id: int | None = Query(default=None),
    usecase_id: int | None = Query(default=None),
    from_date: datetime | None = Query(default=None, description="Filter created_date_time >= from_date (ISO 8601)"),
    to_date: datetime | None = Query(default=None, description="Filter created_date_time <= to_date (ISO 8601)"),
    event_is_read_filter: bool | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=200),
) -> EventsResponse:
    return get_all_event_details(
        db,
        request.state.lang,
        camera_id=camera_id,
        location_id=location_id,
        usecase_id=usecase_id,
        from_date=from_date,
        to_date=to_date,
        event_is_read_filter=event_is_read_filter,
        page=page,
        page_size=page_size,
    )


@router.get("/{event_id}", response_model=EventResponse, dependencies=[Depends(require_permission("event:read"))])
def get_event(
    event_id: int,
    request: Request,
    db: Session = Depends(get_db),
) -> EventResponse:
    return get_event_details(db, event_id, request.state.lang)



@router.delete("/{event_id}", response_model=EventDeleteResponse, dependencies=[Depends(require_permission("event:delete"))])
def delete_event(
    event_id: int,
    db: Session = Depends(get_db),
) -> EventDeleteResponse:
    delete_event_details(db, event_id)
    return EventDeleteResponse(message="Event deleted successfully")
