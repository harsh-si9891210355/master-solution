from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from src.crud.usecase import (
    get_all_usecases,
    get_usecase_by_id,
    get_translation,
    create_usecase,
    create_usecase_translation,
    delete_usecase
)
from src.models.usecase import UseCase
from src.schemas.usecase import UseCaseResponse, UseCaseCreate
from src.utils.translation import resolve_translation


def create_or_update_usecase_details(
    db: Session,
    payload: UseCaseCreate,
    language: str,
    usecase_id: int | None = None,
):
    # UPDATE
    if usecase_id is not None:
        usecase = get_usecase_by_id(db, usecase_id)

        if not usecase:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Usecase not found",
            )
        usecase.status = payload.status

        translation = get_translation(
            db,
            usecase_id=usecase.id,
            language_code=payload.language_code,
        )

        if translation:
            translation.name = payload.name
            translation.description = payload.description

        else:
            create_usecase_translation(
                db,
                usecase_id=usecase.id,
                language_code=payload.language_code,
                name=payload.name,
                description=payload.description,
            )

        db.commit()
        db.refresh(usecase)

        return _build_usecase_response(
            usecase,
            language,
        )

    # CREATE
    usecase = create_usecase(
        db,
        status=payload.status,
    )

    create_usecase_translation(
        db,
        usecase_id=usecase.id,
        language_code=payload.language_code,
        name=payload.name,
        description=payload.description,
    )

    db.commit()
    db.refresh(usecase)

    return _build_usecase_response(
        usecase,
        language,
    )

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

def delete_usecase_details(
    db: Session,
    usecase_id: int,
):
    usecase = get_usecase_by_id(db, usecase_id)

    if not usecase:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usecase not found",
        )

    delete_usecase(db, usecase)

def change_usecase_status_details(
    db: Session,
    usecase_id: int,
    status_value: bool,
    language: str,
):
    usecase = get_usecase_by_id(db, usecase_id)

    if not usecase:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usecase not found",
        )

    usecase.status = status_value

    db.commit()
    db.refresh(usecase)

    return _build_usecase_response(
        usecase,
        language,
    )
