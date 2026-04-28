from sqlalchemy.orm import Session

from src.models.location import Location


def get_location_by_id(db: Session, location_id: int) -> Location | None:
    return db.query(Location).filter(Location.id == location_id).first()


def get_location_by_name(db: Session, name: str) -> Location | None:
    return db.query(Location).filter(
        (Location.name_en == name) | (Location.name_es == name) | (Location.name_fr == name)
    ).first()


def get_all_locations(db: Session) -> list[Location]:
    return db.query(Location).order_by(Location.id.asc()).all()

