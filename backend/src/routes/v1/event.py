from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from src.db.db_connection import get_db
from src.schemas.common import CommonFailureResponse
from src.schemas.event import EventCreate, EventDeleteResponse, EventResponse, EventsResponse
from src.services.v1.event_services import (
    create_event_details,
    delete_event_details,
    get_all_event_details,
    get_event_details,
)
from src.utils.auth.auth import require_permission


router = APIRouter()


@router.post(
    "",
    response_model=EventResponse | CommonFailureResponse,
    dependencies=[Depends(require_permission("event:create"))],
)
def create_event(
    payload: EventCreate,
    request: Request,
    db: Session = Depends(get_db),
):
    return create_event_details(db, payload, request.state.lang)


@router.get(
    "",
    response_model=EventsResponse | CommonFailureResponse,
    dependencies=[Depends(require_permission("event:read"))],
)
def get_events(
    request: Request,
    db: Session = Depends(get_db),
):
    return get_all_event_details(db, request.state.lang)


@router.get(
    "/{event_id}",
    response_model=EventResponse | CommonFailureResponse,
    dependencies=[Depends(require_permission("event:read"))],
)
def get_event(
    event_id: int,
    request: Request,
    db: Session = Depends(get_db),
):
    return get_event_details(db, event_id, request.state.lang)


@router.delete(
    "/{event_id}",
    response_model=EventDeleteResponse | CommonFailureResponse,
    dependencies=[Depends(require_permission("event:delete"))],
)
def delete_event(
    event_id: int,
    db: Session = Depends(get_db),
):
    return delete_event_details(db, event_id)
