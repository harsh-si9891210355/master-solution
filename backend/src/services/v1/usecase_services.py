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
    name_translation = resolve_translation(
        [
            type("UseCaseTranslation", (), {"language": "en", "value": usecase.name_en})(),
            type("UseCaseTranslation", (), {"language": "es", "value": usecase.name_es})(),
            type("UseCaseTranslation", (), {"language": "fr", "value": usecase.name_fr})(),
        ],
        language,
    )
    description_translation = resolve_translation(
        [
            type("UseCaseTranslation", (), {"language": "en", "value": usecase.description_en})(),
            type("UseCaseTranslation", (), {"language": "es", "value": usecase.description_es})(),
            type("UseCaseTranslation", (), {"language": "fr", "value": usecase.description_fr})(),
        ],
        language,
    )

    return UseCaseResponse(
        id=usecase.id,
        code=usecase.code,
        name=name_translation.value if name_translation else usecase.name_en,
        description=description_translation.value if description_translation else usecase.description_en,
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

