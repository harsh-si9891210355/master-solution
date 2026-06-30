from sqlalchemy.orm import Session

from src.crud.camera import get_camera_by_id
from src.crud.event import create_event, delete_event, get_all_events, get_event_by_id
from src.crud.location import get_location_by_id
from src.crud.usecase import get_usecase_by_id
from src.models.event import Event
from src.schemas.common import CommonFailureResponse
from src.schemas.event import EventCreate, EventDeleteResponse, EventResponse, EventsResponse
from src.utils.error_handler import handle_db_exceptions
from src.utils.translation import resolve_translation


def _build_event_response(event: Event, language: str) -> EventResponse:
    # resolve_translation already handles the requested-language lookup; fall
    # back to English, then to the id, so no separate per-entity helper is needed.
    camera = resolve_translation(event.camera.translations, language) or resolve_translation(event.camera.translations, "en")
    location = resolve_translation(event.location.translations, language) or resolve_translation(event.location.translations, "en")
    usecase = resolve_translation(event.usecase.translations, language) or resolve_translation(event.usecase.translations, "en")

    return EventResponse(
        id=event.id,
        camera_id=event.camera_id,
        camera_name=camera.name if camera else str(event.camera_id),
        location_id=event.location_id,
        location_name=location.name if location else str(event.location_id),
        usecase_id=event.usecase_id,
        usecase_name=usecase.name if usecase else str(event.usecase_id),
        event_description=usecase.description if usecase else None,
        evidence_url=event.evidence_url,
        created_date_time=event.created_date_time,
        event_start_time=event.event_start_time,
        event_end_time=event.event_end_time,
    )


def _validate_foreign_keys(
    db: Session,
    camera_id: int,
    location_id: int,
    usecase_id: int,
) -> CommonFailureResponse | None:
    if not get_camera_by_id(db, camera_id):
        return CommonFailureResponse(code=400, message="Invalid camera id")
    if not get_location_by_id(db, location_id):
        return CommonFailureResponse(code=400, message="Invalid location id")
    if not get_usecase_by_id(db, usecase_id):
        return CommonFailureResponse(code=400, message="Invalid usecase id")
    return None


@handle_db_exceptions
def create_event_details(db: Session, payload: EventCreate, language: str) -> EventResponse | CommonFailureResponse:
    error = _validate_foreign_keys(db, payload.camera_id, payload.location_id, payload.usecase_id)
    if error:
        return error

    event = create_event(
        db,
        camera_id=payload.camera_id,
        location_id=payload.location_id,
        usecase_id=payload.usecase_id,
        evidence_url=payload.evidence_url,
        event_start_time=payload.event_start_time,
        event_end_time=payload.event_end_time,
    )
    event = get_event_by_id(db, event.id) or event
    return _build_event_response(event, language)


@handle_db_exceptions
def get_event_details(db: Session, event_id: int, language: str) -> EventResponse | CommonFailureResponse:
    event = get_event_by_id(db, event_id)
    if not event:
        return CommonFailureResponse(code=404, message="Event not found")
    return _build_event_response(event, language)


@handle_db_exceptions
def get_all_event_details(db: Session, language: str) -> EventsResponse | CommonFailureResponse:
    return EventsResponse(events=[_build_event_response(event, language) for event in get_all_events(db)])


@handle_db_exceptions
def delete_event_details(db: Session, event_id: int) -> EventDeleteResponse | CommonFailureResponse:
    event = get_event_by_id(db, event_id)
    if not event:
        return CommonFailureResponse(code=404, message="Event not found")
    delete_event(db, event=event)
    return EventDeleteResponse(message="Event deleted successfully")
