from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from src.db.db_connection import get_db
from src.schemas.usecase import (
    UseCaseResponse,
    UseCasesResponse,
)
from src.services.v1.usecase_services import (
    get_all_usecase_details,
    get_usecase_details,
)
from src.utils.auth.auth_bearer import JWTBearer


router = APIRouter()


@router.get("", response_model=UseCasesResponse)
def get_usecases(
    request: Request,
    _: str = Depends(JWTBearer()),
    db: Session = Depends(get_db),
) -> UseCasesResponse:
    return UseCasesResponse(usecases=get_all_usecase_details(db, request.state.lang))


@router.get("/{usecase_id}", response_model=UseCaseResponse)
def get_usecase(
    usecase_id: int,
    request: Request,
    _: str = Depends(JWTBearer()),
    db: Session = Depends(get_db),
) -> UseCaseResponse:
    return get_usecase_details(db, usecase_id, request.state.lang)

