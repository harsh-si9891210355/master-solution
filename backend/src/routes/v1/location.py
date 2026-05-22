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
from src.utils.auth.auth import require_permission


router = APIRouter()


@router.get(
    "", 
    response_model=LocationsResponse, 
    dependencies=[Depends(require_permission("location:read"))]
)
@router.get(
    "/{location_id}", 
    response_model=LocationResponse, 
    dependencies=[Depends(require_permission("location:read"))]
)
def get_locations(
    request: Request,
    db: Session = Depends(get_db),
    location_id: int | None = None,
):
    if location_id is not None:
        return get_location_details(db, location_id, request.state.lang)
    else:
        return LocationsResponse(locations=get_all_location_details(db, request.state.lang))
