from datetime import datetime

from sqlalchemy.orm import Session, selectinload

from src.models.camera import Camera
from src.models.event import Event
from src.models.location import Location
from src.models.usecase import UseCase


def _with_relations(query):
    return query.options(
        selectinload(Event.camera).selectinload(Camera.translations),
        selectinload(Event.location).selectinload(Location.translations),
        selectinload(Event.usecase).selectinload(UseCase.translations),
    )


def get_event_by_id(db: Session, event_id: int) -> Event | None:
    return _with_relations(db.query(Event)).filter(Event.id == event_id).first()


def get_events_filtered(
    db: Session,
    *,
    camera_id: int | None = None,
    location_id: int | None = None,
    usecase_id: int | None = None,
    from_date: datetime | None = None,
    to_date: datetime | None = None,
    is_event_read: bool | None = None,
    limit: int = 20,
    offset: int = 0,
) -> tuple[list[Event], int]:
    """Return (events, total_count) for the given filters + pagination window."""
    query = db.query(Event)

    if camera_id is not None:
        query = query.filter(Event.camera_id == camera_id)
    if location_id is not None:
        query = query.filter(Event.location_id == location_id)
    if usecase_id is not None:
        query = query.filter(Event.usecase_id == usecase_id)
    if from_date is not None:
        query = query.filter(Event.created_date_time >= from_date)
    if to_date is not None:
        query = query.filter(Event.created_date_time <= to_date)
    if is_event_read is not None:
        query = query.filter(Event.is_event_read == (1 if is_event_read else 0))

    total = query.count()
    events = (
        _with_relations(query)
        .order_by(Event.id.desc())
        .limit(limit)
        .offset(offset)
        .all()
    )
    return events, total


def create_event(
    db: Session,
    *,
    camera_id: int,
    location_id: int | None,
    usecase_id: int | None,
    unique_event_id: str | None,
    event_metadata: str | None,
    evidence_url: str | None,
    evidence_storage_path: str | None,
    number_of_frames: int | None,
    frames_range: str | None,
    event_timestamp: int | None,
    event_start_time=None,
    event_end_time=None,
    is_email_sent: int = 0,
    is_notification_sent: int = 0,
    is_event_read: int = 0,
    event_stream_quality: int = 1,
    notification_status: int | None = None,
) -> Event:
    event = Event(
        camera_id=camera_id,
        location_id=location_id,
        usecase_id=usecase_id,
        unique_event_id=unique_event_id,
        event_metadata=event_metadata,
        evidence_url=evidence_url,
        evidence_storage_path=evidence_storage_path,
        number_of_frames=number_of_frames,
        frames_range=frames_range,
        event_timestamp=event_timestamp,
        event_start_time=event_start_time,
        event_end_time=event_end_time,
        is_email_sent=is_email_sent,
        is_notification_sent=is_notification_sent,
        is_event_read=is_event_read,
        event_stream_quality=event_stream_quality,
        notification_status=notification_status,
    )
    db.add(event)
    db.commit()
    db.refresh(event)
    return event


def delete_event(db: Session, *, event: Event) -> None:
    db.delete(event)
    db.commit()
