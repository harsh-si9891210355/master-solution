from sqlalchemy import or_
from sqlalchemy.orm import Session, selectinload

from src.models.location import Location, LocationTranslation

def create_location(
    db: Session,
    last_modified_by: int | None,
):

    location = Location(
        last_modified_by=last_modified_by,
    )

    db.add(location)

    db.flush()

    return location

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

def delete_location(
    db: Session,
    location: Location,
) -> None:

    db.delete(location)

    db.commit()