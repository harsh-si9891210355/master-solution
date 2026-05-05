from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from src.db.db_connection import get_db
from src.schemas.role import RolesResponse
from src.services.v1.role_services import get_all_roles_details
from src.utils.auth.auth_bearer import JWTBearer

router = APIRouter()


@router.get("", response_model=RolesResponse)
def get_roles(
    request: Request,
    _: str = Depends(JWTBearer()),
    db: Session = Depends(get_db),
) -> RolesResponse:
    return RolesResponse(
        roles=get_all_roles_details(db, request.state.lang)
    )