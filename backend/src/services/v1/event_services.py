from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from src.crud.camera import get_camera_by_id
from src.crud.event import create_event, delete_event, get_all_events, get_event_by_id
from src.crud.location import get_location_by_id
from src.crud.usecase import get_usecase_by_id
from src.models.event import Event
from src.schemas.event import EventCreate, EventResponse
from src.utils.translation import resolve_translation


def _build_event_response(event: Event, language: str) -> EventResponse:
    location_translation = resolve_translation(
        [
            type("LocationTranslation", (), {"language": "en", "value": event.location.name_en})(),
            type("LocationTranslation", (), {"language": "es", "value": event.location.name_es})(),
            type("LocationTranslation", (), {"language": "fr", "value": event.location.name_fr})(),
        ],
        language,
    )
    usecase_name_translation = resolve_translation(
        [
            type("UseCaseTranslation", (), {"language": "en", "value": event.usecase.name_en})(),
            type("UseCaseTranslation", (), {"language": "es", "value": event.usecase.name_es})(),
            type("UseCaseTranslation", (), {"language": "fr", "value": event.usecase.name_fr})(),
        ],
        language,
    )
    event_description_translation = resolve_translation(
        [
            type("EventTranslation", (), {"language": "en", "value": event.usecase.description_en})(),
            type("EventTranslation", (), {"language": "es", "value": event.usecase.description_es})(),
            type("EventTranslation", (), {"language": "fr", "value": event.usecase.description_fr})(),
        ],
        language,
    )

    return EventResponse(
        id=event.id,
        camera_id=event.camera_id,
        camera_name=event.camera.name,
        location_id=event.location_id,
        location_name=location_translation.value if location_translation else event.location.name_en,
        usecase_id=event.usecase_id,
        usecase_name=usecase_name_translation.value if usecase_name_translation else event.usecase.name_en,
        event_description=event_description_translation.value if event_description_translation else event.usecase.description_en,
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
) -> None:
    if not get_camera_by_id(db, camera_id):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid camera id")
    if not get_location_by_id(db, location_id):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid location id")
    if not get_usecase_by_id(db, usecase_id):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid usecase id")


def create_event_details(db: Session, payload: EventCreate, language: str) -> EventResponse:
    _validate_foreign_keys(db, payload.camera_id, payload.location_id, payload.usecase_id)

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


def get_event_details(db: Session, event_id: int, language: str) -> EventResponse:
    event = get_event_by_id(db, event_id)
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")
    return _build_event_response(event, language)


def get_all_event_details(db: Session, language: str) -> list[EventResponse]:
    return [_build_event_response(event, language) for event in get_all_events(db)]


def delete_event_details(db: Session, event_id: int) -> None:
    event = get_event_by_id(db, event_id)
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")
    delete_event(db, event=event)
