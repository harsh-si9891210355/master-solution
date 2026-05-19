from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from src.crud.usecase import (
    get_all_usecases,
    get_usecase_by_id,
    create_usecase,
    delete_usecase,
    update_usecase,
)
from src.models.usecase import UseCase, UseCaseTranslation
from src.schemas.usecase import UseCaseResponse, UseCasesResponse, UseCaseCreate
from src.utils.translation import resolve_translation


def _sync_usecase_translations(
    usecase: UseCase,
    *,
    name_en: str,
    name_es: str | None,
    name_fr: str | None,
    description_en: str | None,
    description_es: str | None,
    description_fr: str | None,
) -> None:
    translations_by_language = {translation.language_code.lower(): translation for translation in usecase.translations}
    desired_translations = {
        "en": {"name": name_en, "description": description_en},
        "es": {"name": name_es, "description": description_es},
        "fr": {"name": name_fr, "description": description_fr},
    }

    usecase.translations = [
        translation
        for translation in usecase.translations
        if translation.language_code.lower() not in desired_translations
        or desired_translations[translation.language_code.lower()]["name"]
    ]
    translations_by_language = {translation.language_code.lower(): translation for translation in usecase.translations}

    for language_code, values in desired_translations.items():
        if not values["name"]:
            continue
        if language_code in translations_by_language:
            translations_by_language[language_code].name = values["name"]
            translations_by_language[language_code].description = values["description"]
        else:
            usecase.translations.append(
                UseCaseTranslation(
                    language_code=language_code,
                    name=values["name"],
                    description=values["description"],
                )
            )


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
        _sync_usecase_translations(
            updated_usecase,
            name_en=payload.name_en,
            name_es=payload.name_es,
            name_fr=payload.name_fr,
            description_en=payload.description_en,
            description_es=payload.description_es,
            description_fr=payload.description_fr,
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
    _sync_usecase_translations(
        usecase,
        name_en=payload.name_en,
        name_es=payload.name_es,
        name_fr=payload.name_fr,
        description_en=payload.description_en,
        description_es=payload.description_es,
        description_fr=payload.description_fr,
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
    usecase_translation = resolve_translation(usecase.translations, language)
    fallback_translation = resolve_translation(usecase.translations, "en")

    return UseCaseResponse(
        id=usecase.id,
        name_en=resolve_translation(usecase.translations, "en").name if resolve_translation(usecase.translations, "en") else None,
        name_es=resolve_translation(usecase.translations, "es").name if resolve_translation(usecase.translations, "es") else None,
        name_fr=resolve_translation(usecase.translations, "fr").name if resolve_translation(usecase.translations, "fr") else None,
        name=usecase_translation.name if usecase_translation else fallback_translation,
        description_en=resolve_translation(usecase.translations, "en").description if resolve_translation(usecase.translations, "en") else None,
        description_es=resolve_translation(usecase.translations, "es").description if resolve_translation(usecase.translations, "es") else None,
        description_fr=resolve_translation(usecase.translations, "fr").description if resolve_translation(usecase.translations, "fr") else None,
        description=usecase_translation.description if usecase_translation else fallback_translation,
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


def get_all_usecase_details(db: Session, language: str) -> UseCasesResponse:
    usecases = get_all_usecases(db)
    return UseCasesResponse(usecases=[_build_usecase_response(usecase, language) for usecase in usecases])

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
