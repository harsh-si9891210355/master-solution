import secrets
from datetime import datetime

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from src.crud.camera import get_camera_by_id
from src.crud.event import create_event, delete_event, get_events_filtered, get_event_by_id
from src.crud.location import get_location_by_id
from src.crud.usecase import get_usecase_by_id
from src.models.event import Event
from src.schemas.event import EventCreate, EventResponse, EventsResponse
from src.utils.translation import resolve_translation


def _build_event_response(event: Event, language: str) -> EventResponse:
    camera_name_translation = resolve_translation(event.camera.translations, language) if event.camera else None
    fallback_camera = resolve_translation(event.camera.translations, "en") if event.camera else None
    camera_name = (
        camera_name_translation.name
        if camera_name_translation
        else (fallback_camera.name if fallback_camera else str(event.camera_id))
    )

    location_name = None
    if event.location:
        loc_t = resolve_translation(event.location.translations, language) or resolve_translation(event.location.translations, "en")
        location_name = loc_t.name if loc_t else str(event.location_id)

    usecase_name = None
    event_description = None
    if event.usecase:
        uc_t = resolve_translation(event.usecase.translations, language) or resolve_translation(event.usecase.translations, "en")
        if uc_t:
            usecase_name = uc_t.name
            event_description = uc_t.description

    return EventResponse(
        event_id=event.id,
        unique_event_id=event.unique_event_id,
        camera_id=event.camera_id,
        camera_name=camera_name,
        location_id=event.location_id,
        location_name=location_name,
        usecase_id=event.usecase_id,
        usecase_name=usecase_name,
        event_description=event_description,
        metadata=event.event_metadata,
        evidence_storage_path=event.evidence_storage_path or event.evidence_url,
        number_of_frames=event.number_of_frames,
        frames_range=event.frames_range,
        event_timestamp=event.event_timestamp,
        created_date_time=event.created_date_time,
        event_end_time=event.event_end_time,
        is_email_sent=event.is_email_sent,
        is_notification_sent=event.is_notification_sent,
        is_event_read=event.is_event_read,
        event_stream_quality=event.event_stream_quality,
        notification_status=event.notification_status,
    )


def get_all_event_details(
    db: Session,
    language: str,
    *,
    camera_id: int | None = None,
    location_id: int | None = None,
    usecase_id: int | None = None,
    from_date: datetime | None = None,
    to_date: datetime | None = None,
    event_is_read_filter: bool | None = None,
    page: int = 1,
    page_size: int = 20,
) -> EventsResponse:
    page = max(page, 1)
    page_size = max(min(page_size, 200), 1)
    offset = (page - 1) * page_size

    events, total = get_events_filtered(
        db,
        camera_id=camera_id,
        location_id=location_id,
        usecase_id=usecase_id,
        from_date=from_date,
        to_date=to_date,
        is_event_read=event_is_read_filter,
        limit=page_size,
        offset=offset,
    )
    total_pages = (total + page_size - 1) // page_size

    return EventsResponse(
        events=[_build_event_response(event, language) for event in events],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


def get_event_details(db: Session, event_id: int, language: str) -> EventResponse:
    event = get_event_by_id(db, event_id)
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")
    return _build_event_response(event, language)


def _validate_foreign_keys(db: Session, camera_id: int, location_id: int | None, usecase_id: int | None) -> None:
    if not get_camera_by_id(db, camera_id):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid camera id")
    if location_id is not None and not get_location_by_id(db, location_id):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid location id")
    if usecase_id is not None and not get_usecase_by_id(db, usecase_id):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid usecase id")


def create_event_details(db: Session, payload: EventCreate, language: str) -> EventResponse:
    _validate_foreign_keys(db, payload.camera_id, payload.location_id, payload.usecase_id)

    event = create_event(
        db,
        camera_id=payload.camera_id,
        location_id=payload.location_id,
        usecase_id=payload.usecase_id,
        unique_event_id=payload.unique_event_id or secrets.token_hex(3),
        event_metadata=payload.metadata,
        evidence_url=payload.evidence_url,
        evidence_storage_path=payload.evidence_storage_path,
        number_of_frames=payload.number_of_frames,
        frames_range=payload.frames_range,
        event_timestamp=payload.event_timestamp,
        event_start_time=payload.event_start_time,
        event_end_time=payload.event_end_time,
        is_email_sent=payload.is_email_sent,
        is_notification_sent=payload.is_notification_sent,
        is_event_read=payload.is_event_read,
        event_stream_quality=payload.event_stream_quality,
        notification_status=payload.notification_status,
    )
    event = get_event_by_id(db, event.id) or event
    return _build_event_response(event, language)


def delete_event_details(db: Session, event_id: int) -> None:
    event = get_event_by_id(db, event_id)
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")
    delete_event(db, event=event)
