from sqlalchemy.orm import Session, selectinload

from src.models.camera import Camera
from src.models.event import Event
from src.models.location import Location
from src.models.usecase import UseCase


def get_event_by_id(db: Session, event_id: int) -> Event | None:
    return (
        db.query(Event)
        .options(
            selectinload(Event.camera).selectinload(Camera.translations),
            selectinload(Event.location).selectinload(Location.translations),
            selectinload(Event.usecase).selectinload(UseCase.translations),
        )
        .filter(Event.id == event_id)
        .first()
    )


def get_all_events(db: Session) -> list[Event]:
    return (
        db.query(Event)
        .options(
            selectinload(Event.camera).selectinload(Camera.translations),
            selectinload(Event.location).selectinload(Location.translations),
            selectinload(Event.usecase).selectinload(UseCase.translations),
        )
        .order_by(Event.id.desc())
        .all()
    )


def create_event(
    db: Session,
    *,
    camera_id: int,
    location_id: int,
    usecase_id: int,
    evidence_url: str | None,
    event_start_time,
    event_end_time,
) -> Event:
    event = Event(
        camera_id=camera_id,
        location_id=location_id,
        usecase_id=usecase_id,
        evidence_url=evidence_url,
        event_start_time=event_start_time,
        event_end_time=event_end_time,
    )
    db.add(event)
    db.commit()
    db.refresh(event)
    return event


def delete_event(db: Session, *, event: Event) -> None:
    db.delete(event)
    db.commit()
