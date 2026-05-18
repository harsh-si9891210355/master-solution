from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from src.crud.usecase import (
    get_all_usecases,
    get_usecase_by_id,
)
from src.models.usecase import UseCase
from src.schemas.usecase import UseCaseResponse
from src.utils.translation import resolve_translation


def _build_usecase_response(usecase: UseCase, language: str) -> UseCaseResponse:
    translation = resolve_translation(usecase.translations, language)
    fallback_translation = resolve_translation(usecase.translations, "en")

    return UseCaseResponse(
        id=usecase.id,
        name=translation.name if translation else (fallback_translation.name if fallback_translation else str(usecase.id)),
        description=(
            translation.description
            if translation
            else (fallback_translation.description if fallback_translation else None)
        ),
        status=usecase.status,
    )


def get_usecase_details(db: Session, usecase_id: int, language: str) -> UseCaseResponse:
    usecase = get_usecase_by_id(db, usecase_id)
    if not usecase:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Use case not found",
        )
    return _build_usecase_response(usecase, language)


def get_all_usecase_details(db: Session, language: str) -> list[UseCaseResponse]:
    usecases = get_all_usecases(db)
    return [_build_usecase_response(usecase, language) for usecase in usecases]
