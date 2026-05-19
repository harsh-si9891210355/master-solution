from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from src.crud.usecase import (
    get_all_usecases,
    get_usecase_by_id,
    get_translation,
    create_usecase,
    create_usecase_translation,
    delete_usecase,
    update_usecase
)
from src.models.usecase import UseCase
from src.schemas.usecase import UseCaseResponse, UseCaseCreate


def create_or_update_usecase_details(
    db: Session,
    payload: UseCaseCreate,
    language: str = "en",
    usecase_id: int | None = None,
) -> UseCaseResponse:

    # UPDATE
    if usecase_id is not None:
        usecase = get_usecase_by_id(db, usecase_id)

        if not usecase:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Usecase not found",
            )

        updated_usecase = update_usecase(
            db,
            usecase=usecase,
            status=payload.status,
        )

        translations = [
            {
                "language_code": "en",
                "name": payload.name_en,
                "description": payload.description_en,
            },
            {
                "language_code": "es",
                "name": payload.name_es,
                "description": payload.description_es,
            },
            {
                "language_code": "fr",
                "name": payload.name_fr,
                "description": payload.description_fr,
            },
        ]

        for item in translations:

            if not item["name"]:
                continue

            translation = get_translation(
                db,
                usecase_id=updated_usecase.id,
                language_code=item["language_code"],
            )

            if translation:
                translation.name = item["name"]
                translation.description = item["description"]

            else:
                create_usecase_translation(
                    db,
                    usecase_id=updated_usecase.id,
                    language_code=item["language_code"],
                    name=item["name"],
                    description=item["description"],
                )

        db.commit()
        db.refresh(updated_usecase)

        return _build_usecase_response(
            updated_usecase,
            language,
        )

    # CREATE
    usecase = create_usecase(
        db,
        status=payload.status,
    )

    translations = [
        {
            "language_code": "en",
            "name": payload.name_en,
            "description": payload.description_en,
        },
        {
            "language_code": "es",
            "name": payload.name_es,
            "description": payload.description_es,
        },
        {
            "language_code": "fr",
            "name": payload.name_fr,
            "description": payload.description_fr,
        },
    ]

    for item in translations:

        if not item["name"]:
            continue

        create_usecase_translation(
            db,
            usecase_id=usecase.id,
            language_code=item["language_code"],
            name=item["name"],
            description=item["description"],
        )

    db.commit()
    db.refresh(usecase)

    return _build_usecase_response(
        usecase,
        language,
    )


def _build_usecase_response(
    usecase: UseCase,
    language: str = "en",
) -> UseCaseResponse:

    return UseCaseResponse(
        id=usecase.id,

        name_en=next(
            (
                t.name
                for t in usecase.translations
                if t.language_code == "en"
            ),
            None,
        ),

        name_es=next(
            (
                t.name
                for t in usecase.translations
                if t.language_code == "es"
            ),
            None,
        ),

        name_fr=next(
            (
                t.name
                for t in usecase.translations
                if t.language_code == "fr"
            ),
            None,
        ),

        description_en=next(
            (
                t.description
                for t in usecase.translations
                if t.language_code == "en"
            ),
            None,
        ),

        description_es=next(
            (
                t.description
                for t in usecase.translations
                if t.language_code == "es"
            ),
            None,
        ),

        description_fr=next(
            (
                t.description
                for t in usecase.translations
                if t.language_code == "fr"
            ),
            None,
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
    
    # CHECK IF ASSIGNED TO ANY CAMERA
    if usecase.camera_usecases:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Usecase is assigned to one or more cameras and cannot be deleted",
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
