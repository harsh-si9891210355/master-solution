from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from src.crud.location import (
    get_all_locations,
    get_location_by_id,
)
from src.models.location import Location
from src.schemas.location import LocationResponse
from src.utils.translation import resolve_translation


def _build_location_response(location: Location, language: str) -> LocationResponse:
    name_translation = resolve_translation(location.translations, language)
    fallback_translation = resolve_translation(location.translations, "en")
    return LocationResponse(
        id=location.id,
        name=name_translation.name if name_translation else (fallback_translation.name if fallback_translation else str(location.id)),
    )


def get_location_details(db: Session, location_id: int, language: str) -> LocationResponse:
    location = get_location_by_id(db, location_id)
    if not location:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Location not found",
        )
    return _build_location_response(location, language)


def get_all_location_details(db: Session, language: str) -> list[LocationResponse]:
    locations = get_all_locations(db)
    return [_build_location_response(location, language) for location in locations]
