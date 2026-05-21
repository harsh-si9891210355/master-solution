from sqlalchemy import or_
from sqlalchemy.orm import Session, selectinload

from src.models.location import Location, LocationTranslation


def get_location_by_id(db: Session, location_id: int) -> Location | None:
    return (
        db.query(Location)
        .options(selectinload(Location.translations))
        .filter(Location.id == location_id)
        .first()
    )


def get_location_by_name(db: Session, name: str) -> Location | None:
    return (
        db.query(Location)
        .join(Location.translations)
        .options(selectinload(Location.translations))
        .filter(or_(LocationTranslation.name == name))
        .first()
    )


def get_all_locations(db: Session) -> list[Location]:
    return db.query(Location).options(selectinload(Location.translations)).order_by(Location.id.asc()).all()
