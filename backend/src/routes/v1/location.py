from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from src.db.db_connection import get_db
from src.schemas.location import (
    LocationResponse,
    LocationsResponse,
)
from src.services.v1.location_services import (
    get_all_location_details,
    get_location_details,
)
from src.utils.auth.auth_bearer import JWTBearer


router = APIRouter()


@router.get("", response_model=LocationsResponse)
def get_locations(
    request: Request,
    _: str = Depends(JWTBearer()),
    db: Session = Depends(get_db),
) -> LocationsResponse:
    return LocationsResponse(locations=get_all_location_details(db, request.state.lang))


@router.get("/{location_id}", response_model=LocationResponse)
def get_location(
    location_id: int,
    request: Request,
    _: str = Depends(JWTBearer()),
    db: Session = Depends(get_db),
) -> LocationResponse:
    return get_location_details(db, location_id, request.state.lang)

