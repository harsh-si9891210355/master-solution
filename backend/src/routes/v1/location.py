from fastapi import (
    APIRouter,
    Depends,
    Request,
    Body,
)
from sqlalchemy.orm import Session

from src.db.db_connection import (
    get_db,
)

from src.schemas.location import (
    LocationCreate,
    LocationUpdate,
    LocationResponse,
    LocationsResponse,
    CommonFailureResponse,
    LocationDeleteResponse
)

from src.services.v1.location_services import (
    LocationService,
)

from src.utils.auth.auth import (
    require_permission,
)

router = APIRouter()


@router.post(
    "",
    response_model=(
        LocationResponse
        | CommonFailureResponse
    ),
    dependencies=[
        Depends(
            require_permission(
                "location:create"
            )
        )
    ],
)
@router.post(
    "/{location_id}",
    response_model=(
        LocationResponse
        | CommonFailureResponse
    ),
    dependencies=[
        Depends(
            require_permission(
                "location:update"
            )
        )
    ],
)
def create_or_update_location(
    request: Request,
    db: Session = Depends(get_db),
    location_id: int | None = None,
    payload: dict = Body(...),
):
    ''' Create a new location or update an existing location '''

    service = LocationService(db)

    validated_payload = (
        LocationUpdate.model_validate(payload)
        if location_id is not None
        else LocationCreate.model_validate(payload)
    )

    return service.create_or_update_location_details(
        payload=validated_payload,
        language=request.state.lang,
        location_id=location_id,
    )


@router.get(
    "",
    response_model=(
        LocationsResponse
        | CommonFailureResponse
    ),
    dependencies=[
        Depends(
            require_permission(
                "location:read"
            )
        )
    ],
)
@router.get(
    "/{location_id}",
    response_model=(
        LocationResponse
        | CommonFailureResponse
    ),
    dependencies=[
        Depends(
            require_permission(
                "location:read"
            )
        )
    ],
)
def get_locations(
    request: Request,
    db: Session = Depends(get_db),
    location_id: int | None = None,
):
    ''' Fetch all locations or a specific location by id '''

    service = LocationService(db)

    if location_id is not None:

        return service.get_location_details(
            location_id,
            request.state.lang,
        )

    return service.get_all_location_details(
        request.state.lang,
    )

@router.delete(
    "/{location_id}",
    response_model=(
        LocationDeleteResponse
        | CommonFailureResponse
    ),
    dependencies=[
        Depends(
            require_permission(
                "location:delete"
            )
        )
    ],
)
def delete_location(
    location_id: int,
    db: Session = Depends(get_db),
):
    ''' Delete a location by id '''

    service = LocationService(db)

    return service.delete_location_details(
        location_id,
    )