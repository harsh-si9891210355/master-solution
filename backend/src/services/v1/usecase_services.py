import logging
from functools import wraps
from typing import Callable

from sqlalchemy.exc import SQLAlchemyError, IntegrityError
from sqlalchemy.orm import Session

from src.crud.usecase import (
    get_all_usecases,
    get_usecase_by_id,
    create_usecase,
    delete_usecase,
    update_usecase,
)
from src.models.usecase import UseCase, UseCaseTranslation
from src.schemas.usecase import (
    UseCaseResponse,
    UseCasesResponse,
    UseCaseCreate,
    UseCaseUpdate,
    LinkedCamerasResponse,
    LinkedCameraResponse,
    CommonFailureResponse,
    UseCaseDeleteResponse,
)
from src.utils.translation import resolve_translation

logger = logging.getLogger(__name__)


def handle_db_exceptions(func: Callable):

    @wraps(func)
    def wrapper(self, *args, **kwargs):

        try:
            return func(self, *args, **kwargs)

        except IntegrityError as error:
            self.db.rollback()

            logger.exception(error)

            return CommonFailureResponse(
                code=409,
                message="Duplicate/constraint violation",
            )

        except SQLAlchemyError as error:
            self.db.rollback()

            logger.exception(error)

            return CommonFailureResponse(
                code=500,
                message="Database Error Occurred",
            )

        except Exception as error:
            self.db.rollback()

            logger.exception(error)

            return CommonFailureResponse(
                code=500,
                message="Internal Server Error",
            )

    return wrapper


class UseCaseService:

    def __init__(self, db: Session):
        self.db = db

    def _get_translation_value(
        self,
        translations,
        language: str,
        field: str,
    ):

        translation = resolve_translation(
            translations,
            language,
        )

        fallback_translation = resolve_translation(
            translations,
            "en",
        )

        selected_translation = (
            translation
            if translation
            else fallback_translation
        )

        return (
            getattr(selected_translation, field, None)
            if selected_translation
            else None
        )

    def _sync_usecase_translations(
        self,
        usecase: UseCase,
        *,
        name_en: str,
        name_es: str | None,
        name_fr: str | None,
        description_en: str | None,
        description_es: str | None,
        description_fr: str | None,
    ) -> None:

        desired_translations = {
            "en": {
                "name": name_en,
                "description": description_en,
            },
            "es": {
                "name": name_es,
                "description": description_es,
            },
            "fr": {
                "name": name_fr,
                "description": description_fr,
            },
        }

        filtered_translations = []

        for translation in usecase.translations:

            language_code = translation.language_code.lower()

            if (
                language_code not in desired_translations
                or desired_translations[language_code]["name"]
            ):
                filtered_translations.append(translation)

        usecase.translations = filtered_translations

        translations_by_language = {
            translation.language_code.lower(): translation
            for translation in usecase.translations
        }

        for language_code, values in desired_translations.items():

            if not values["name"]:
                continue

            existing_translation = translations_by_language.get(
                language_code
            )

            if existing_translation:

                existing_translation.name = values["name"]
                existing_translation.description = values["description"]

            else:

                usecase.translations.append(
                    UseCaseTranslation(
                        language_code=language_code,
                        name=values["name"],
                        description=values["description"],
                    )
                )

    def _build_usecase_response(
        self,
        usecase: UseCase,
        language: str = "en",
    ) -> UseCaseResponse:

        english_translation = resolve_translation(
            usecase.translations,
            "en",
        )

        spanish_translation = resolve_translation(
            usecase.translations,
            "es",
        )

        french_translation = resolve_translation(
            usecase.translations,
            "fr",
        )

        return UseCaseResponse(
            id=usecase.id,

            name_en=getattr(
                english_translation,
                "name",
                None,
            ),
            name_es=getattr(
                spanish_translation,
                "name",
                None,
            ),
            name_fr=getattr(
                french_translation,
                "name",
                None,
            ),

            name=self._get_translation_value(
                usecase.translations,
                language,
                "name",
            ),

            description_en=getattr(
                english_translation,
                "description",
                None,
            ),
            description_es=getattr(
                spanish_translation,
                "description",
                None,
            ),
            description_fr=getattr(
                french_translation,
                "description",
                None,
            ),

            description=self._get_translation_value(
                usecase.translations,
                language,
                "description",
            ),

            status=usecase.status,
        )
    
    @handle_db_exceptions
    def create_or_update_usecase_details(
        self,
        payload: UseCaseCreate | UseCaseUpdate,
        language: str = "en",
        usecase_id: int | None = None,
    ) -> UseCaseResponse | CommonFailureResponse:

        # UPDATE
        if usecase_id is not None:

            usecase = get_usecase_by_id(
                self.db,
                usecase_id,
            )

            if not usecase:
                return CommonFailureResponse(
                    code=404,
                    message="Usecase not found",
                )

            updated_usecase = update_usecase(
                self.db,
                usecase=usecase,
                status=(
                    payload.status
                    if payload.status is not None
                    else usecase.status
                ),
            )

            self._sync_usecase_translations(
                updated_usecase,

                name_en=(
                    payload.name_en
                    if payload.name_en is not None
                    else self._get_translation_value(
                        updated_usecase.translations,
                        "en",
                        "name",
                    )
                ),

                name_es=(
                    payload.name_es
                    if payload.name_es is not None
                    else self._get_translation_value(
                        updated_usecase.translations,
                        "es",
                        "name",
                    )
                ),

                name_fr=(
                    payload.name_fr
                    if payload.name_fr is not None
                    else self._get_translation_value(
                        updated_usecase.translations,
                        "fr",
                        "name",
                    )
                ),

                description_en=(
                    payload.description_en
                    if payload.description_en is not None
                    else self._get_translation_value(
                        updated_usecase.translations,
                        "en",
                        "description",
                    )
                ),

                description_es=(
                    payload.description_es
                    if payload.description_es is not None
                    else self._get_translation_value(
                        updated_usecase.translations,
                        "es",
                        "description",
                    )
                ),

                description_fr=(
                    payload.description_fr
                    if payload.description_fr is not None
                    else self._get_translation_value(
                        updated_usecase.translations,
                        "fr",
                        "description",
                    )
                ),
            )

            self.db.commit()

            self.db.refresh(updated_usecase)

            return self._build_usecase_response(
                updated_usecase,
                language,
            )

        # CREATE
        usecase = create_usecase(
            self.db,
            status=payload.status,
        )

        self._sync_usecase_translations(
            usecase,
            name_en=payload.name_en,
            name_es=payload.name_es,
            name_fr=payload.name_fr,
            description_en=payload.description_en,
            description_es=payload.description_es,
            description_fr=payload.description_fr,
        )

        self.db.commit()

        self.db.refresh(usecase)

        return self._build_usecase_response(
            usecase,
            language,
        )
    
    @handle_db_exceptions
    def get_usecase_details(
        self,
        usecase_id: int,
        language: str,
    ) -> UseCaseResponse | CommonFailureResponse:

        usecase = get_usecase_by_id(
            self.db,
            usecase_id,
        )

        if not usecase:
            return CommonFailureResponse(
                code=404,
                message="Usecase not found",
            )

        return self._build_usecase_response(
            usecase,
            language,
        )

    @handle_db_exceptions
    def get_all_usecase_details(
        self,
        language: str,
    ) -> UseCasesResponse | CommonFailureResponse:

        usecases = get_all_usecases(self.db)

        return UseCasesResponse(
            usecases=[
                self._build_usecase_response(
                    usecase,
                    language,
                )
                for usecase in usecases
            ]
        )

    @handle_db_exceptions
    def delete_usecase_details(
        self,
        usecase_id: int,
    ) -> UseCaseDeleteResponse | CommonFailureResponse:

        usecase = get_usecase_by_id(
            self.db,
            usecase_id,
        )

        if not usecase:
            return CommonFailureResponse(
                code=404,
                message="Usecase not found",
            )

        if usecase.camera_usecases:
            return CommonFailureResponse(
                code=400,
                message=(
                    "Usecase is assigned to one or more cameras "
                    "and cannot be deleted"
                ),
            )

        delete_usecase(
            self.db,
            usecase,
        )

        return UseCaseDeleteResponse(
            message="Usecase deleted successfully",
        )

    @handle_db_exceptions
    def change_usecase_status_details(
        self,
        usecase_id: int,
        status_value: bool,
        language: str,
    ) -> UseCaseResponse | CommonFailureResponse:

        usecase = get_usecase_by_id(
            self.db,
            usecase_id,
        )

        if not usecase:
            return CommonFailureResponse(
                code=404,
                message="Usecase not found",
            )

        if usecase.camera_usecases:
            return CommonFailureResponse(
                code=400,
                message=(
                    "Usecase is linked with one or more cameras. "
                    "Status cannot be changed."
                ),
            )

        usecase.status = status_value

        self.db.commit()
        self.db.refresh(usecase)

        return self._build_usecase_response(
            usecase,
            language,
        )

    @handle_db_exceptions
    def get_linked_cameras_details(
        self,
        usecase_id: int,
        language: str,
    ) -> LinkedCamerasResponse | CommonFailureResponse:

        usecase = get_usecase_by_id(
            self.db,
            usecase_id,
        )

        if not usecase:
            return CommonFailureResponse(
                code=404,
                message="Usecase not found",
            )

        cameras = []

        for item in usecase.camera_usecases:

            translation = resolve_translation(
                item.camera.translations,
                language,
            )

            fallback_translation = resolve_translation(
                item.camera.translations,
                "en",
            )

            selected_translation = (
                translation
                if translation
                else fallback_translation
            )

            cameras.append(
                LinkedCameraResponse(
                    id=item.camera.id,
                    name=(
                        selected_translation.name
                        if selected_translation
                        else None
                    ),
                    status=item.camera.status,
                )
            )

        return LinkedCamerasResponse(
            cameras=cameras,
        )