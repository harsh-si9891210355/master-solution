from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from src.crud.camera import get_camera_by_id
from src.crud.event import create_event, delete_event, get_all_events, get_event_by_id
from src.crud.location import get_location_by_id
from src.crud.usecase import get_usecase_by_id
from src.models.event import Event
from src.schemas.event import EventCreate, EventResponse
from src.utils.translation import resolve_translation


def _get_camera_name(event: Event, language_code: str, fallback: str | None = None) -> str | None:
    translations = {translation.language_code.lower(): translation for translation in event.camera.translations}
    normalized = language_code.lower()
    if normalized in translations:
        return translations[normalized].name
    base = normalized.split("-", 1)[0]
    if base in translations:
        return translations[base].name
    if fallback:
        fallback_normalized = fallback.lower()
        if fallback_normalized in translations:
            return translations[fallback_normalized].name
        fallback_base = fallback_normalized.split("-", 1)[0]
        if fallback_base in translations:
            return translations[fallback_base].name
    return next(iter(translations.values())).name if translations else None


def _get_location_name(event: Event, language_code: str, fallback: str | None = None) -> str | None:
    translations = {translation.language_code.lower(): translation for translation in event.location.translations}
    normalized = language_code.lower()
    if normalized in translations:
        return translations[normalized].name
    base = normalized.split("-", 1)[0]
    if base in translations:
        return translations[base].name
    if fallback:
        fallback_normalized = fallback.lower()
        if fallback_normalized in translations:
            return translations[fallback_normalized].name
        fallback_base = fallback_normalized.split("-", 1)[0]
        if fallback_base in translations:
            return translations[fallback_base].name
    return next(iter(translations.values())).name if translations else None


def _build_event_response(event: Event, language: str) -> EventResponse:
    camera_name_translation = resolve_translation(event.camera.translations, language)
    location_translation = resolve_translation(event.location.translations, language)
    usecase_translation = resolve_translation(event.usecase.translations, language)
    fallback_usecase_translation = resolve_translation(event.usecase.translations, "en")

    return EventResponse(
        id=event.id,
        camera_id=event.camera_id,
        camera_name=camera_name_translation.name if camera_name_translation else (_get_camera_name(event, "en") or str(event.camera_id)),
        location_id=event.location_id,
        location_name=location_translation.name if location_translation else (_get_location_name(event, "en") or str(event.location_id)),
        usecase_id=event.usecase_id,
        usecase_name=(
            usecase_translation.name
            if usecase_translation
            else (fallback_usecase_translation.name if fallback_usecase_translation else str(event.usecase.id))
        ),
        event_description=(
            usecase_translation.description
            if usecase_translation
            else (fallback_usecase_translation.description if fallback_usecase_translation else None)
        ),
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
