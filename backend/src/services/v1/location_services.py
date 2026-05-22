import logging
from functools import wraps
from typing import Callable

from sqlalchemy.exc import (
    SQLAlchemyError,
    IntegrityError,
)
from sqlalchemy.orm import Session

from src.crud.location import (
    get_all_locations,
    get_location_by_id,
    create_location,
    delete_location
)
from src.models.location import (
    Location,
    LocationTranslation,
)
from src.schemas.location import (
    LocationCreate,
    LocationUpdate,
    LocationResponse,
    LocationsResponse,
    CommonFailureResponse,
    LocationDeleteResponse
)
from src.utils.translation import (
    resolve_translation,
)

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


class LocationService:

    def __init__(self, db: Session):
        self.db = db

    def _get_translation_value(
        self,
        translations,
        language: str,
    ) -> str | None:

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
            selected_translation.name
            if selected_translation
            else None
        )

    def _sync_location_translations(
        self,
        location: Location,
        *,
        name_en: str,
        name_es: str | None,
        name_fr: str | None,
    ) -> None:

        desired_translations = {
            "en": name_en,
            "es": name_es,
            "fr": name_fr,
        }

        translations_by_language = {
            translation.language_code.lower(): translation
            for translation in location.translations
        }

        for language_code, name in desired_translations.items():

            if not name:
                continue

            existing_translation = (
                translations_by_language.get(
                    language_code
                )
            )

            if existing_translation:

                existing_translation.name = name

            else:

                location.translations.append(
                    LocationTranslation(
                        language_code=language_code,
                        name=name,
                    )
                )

    def _build_location_response(
        self,
        location: Location,
        language: str,
    ) -> LocationResponse:

        english_translation = resolve_translation(
            location.translations,
            "en",
        )

        spanish_translation = resolve_translation(
            location.translations,
            "es",
        )

        french_translation = resolve_translation(
            location.translations,
            "fr",
        )

        return LocationResponse(
            id=location.id,

            name=self._get_translation_value(
                location.translations,
                language,
            ),

            name_en=(
                english_translation.name
                if english_translation
                else None
            ),

            name_es=(
                spanish_translation.name
                if spanish_translation
                else None
            ),

            name_fr=(
                french_translation.name
                if french_translation
                else None
            ),
        )

    @handle_db_exceptions
    def create_or_update_location_details(
        self,
        payload: (
            LocationCreate
            | LocationUpdate
        ),
        language: str,
        location_id: int | None = None,
    ) -> (
        LocationResponse
        | CommonFailureResponse
    ):

        # UPDATE
        if location_id is not None:

            location = get_location_by_id(
                self.db,
                location_id,
            )

            if not location:

                return CommonFailureResponse(
                    code=404,
                    message="Location not found",
                )

            location.last_modified_by = (
                payload.last_modified_by
            )

            self._sync_location_translations(
                location,

                name_en=(
                    payload.name_en
                    if payload.name_en is not None
                    else self._get_translation_value(
                        location.translations,
                        "en",
                    )
                ),

                name_es=(
                    payload.name_es
                    if payload.name_es is not None
                    else self._get_translation_value(
                        location.translations,
                        "es",
                    )
                ),

                name_fr=(
                    payload.name_fr
                    if payload.name_fr is not None
                    else self._get_translation_value(
                        location.translations,
                        "fr",
                    )
                ),
            )

            self.db.commit()

            self.db.refresh(location)

            return self._build_location_response(
                location,
                language,
            )

        # CREATE
        location = create_location(
            self.db,
            last_modified_by=(
                payload.last_modified_by
            ),
        )

        self._sync_location_translations(
            location,
            name_en=payload.name_en,
            name_es=payload.name_es,
            name_fr=payload.name_fr,
        )

        self.db.commit()

        self.db.refresh(location)

        return self._build_location_response(
            location,
            language,
        )

    @handle_db_exceptions
    def get_location_details(
        self,
        location_id: int,
        language: str,
    ) -> (
        LocationResponse
        | CommonFailureResponse
    ):

        location = get_location_by_id(
            self.db,
            location_id,
        )

        if not location:

            return CommonFailureResponse(
                code=404,
                message="Location not found",
            )

        return self._build_location_response(
            location,
            language,
        )

    @handle_db_exceptions
    def get_all_location_details(
        self,
        language: str,
    ) -> (
        LocationsResponse
        | CommonFailureResponse
    ):

        locations = get_all_locations(
            self.db,
        )

        return LocationsResponse(
            locations=[
                self._build_location_response(
                    location,
                    language,
                )
                for location in locations
            ]
        )
    
    @handle_db_exceptions
    def delete_location_details(
        self,
        location_id: int,
    ) -> (
        LocationDeleteResponse
        | CommonFailureResponse
    ):

        location = get_location_by_id(
            self.db,
            location_id,
        )

        if not location:

            return CommonFailureResponse(
                code=404,
                message="Location not found",
            )

        if location.cameras:

            return CommonFailureResponse(
                code=400,
                message=(
                    "Location is linked with one or more cameras "
                    "and cannot be deleted"
                ),
            )

        delete_location(
            self.db,
            location,
        )

        return LocationDeleteResponse(
            message="Location deleted successfully",
        )