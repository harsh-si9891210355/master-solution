from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from src.db.db_connection import get_db
from src.schemas.event import EventCreate, EventDeleteResponse, EventResponse, EventsResponse
from src.services.v1.event_services import (
    create_event_details,
    delete_event_details,
    get_all_event_details,
    get_event_details,
)
from src.utils.auth.auth_bearer import JWTBearer


router = APIRouter()


@router.post("", response_model=EventResponse, status_code=201)
def create_event(
    payload: EventCreate,
    request: Request,
    _: str = Depends(JWTBearer()),
    db: Session = Depends(get_db),
) -> EventResponse:
    return create_event_details(db, payload, request.state.lang)


@router.get("", response_model=EventsResponse)
def get_events(
    request: Request,
    _: str = Depends(JWTBearer()),
    db: Session = Depends(get_db),
) -> EventsResponse:
    return EventsResponse(events=get_all_event_details(db, request.state.lang))


@router.get("/{event_id}", response_model=EventResponse)
def get_event(
    event_id: int,
    request: Request,
    _: str = Depends(JWTBearer()),
    db: Session = Depends(get_db),
) -> EventResponse:
    return get_event_details(db, event_id, request.state.lang)



@router.delete("/{event_id}", response_model=EventDeleteResponse)
def delete_event(
    event_id: int,
    _: str = Depends(JWTBearer()),
    db: Session = Depends(get_db),
) -> EventDeleteResponse:
    delete_event_details(db, event_id)
    return EventDeleteResponse(message="Event deleted successfully")
