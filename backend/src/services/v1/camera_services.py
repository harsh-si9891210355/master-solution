from sqlalchemy.exc import SQLAlchemyError, IntegrityError
from sqlalchemy.orm import Session
from typing import Union, List

from src.crud.camera import (
    create_camera,
    delete_camera,
    get_all_cameras,
    get_camera_by_id,
    get_camera_by_name,
    update_camera,
)
from src.crud.location import get_location_by_id
from src.crud.usecase import get_usecase_by_id
from src.crud.user import get_user_by_id
from src.models.camera import Camera, CameraTranslation
from src.models.camera_usecase import CameraUsecase
from src.schemas.camera import (
    CameraCreate,
    CameraDeleteSuccessResponse,
    CameraResponse,
    CameraUpdate,
    CameraUseCaseResponse,
    CommonFailureResponse,
)
from src.utils.translation import resolve_translation


def _sync_camera_translations(
    camera: Camera,
    *,
    name_en: str,
    name_es: str | None,
    name_fr: str | None,
) -> None:
    translations_by_language = {translation.language_code.lower(): translation for translation in camera.translations}
    desired_translations = {
        "en": name_en,
        "es": name_es,
        "fr": name_fr,
    }

    camera.translations = [
        translation
        for translation in camera.translations
        if translation.language_code.lower() not in desired_translations or desired_translations[translation.language_code.lower()]
    ]
    translations_by_language = {translation.language_code.lower(): translation for translation in camera.translations}

    for language_code, name in desired_translations.items():
        if not name:
            continue
        if language_code in translations_by_language:
            translations_by_language[language_code].name = name
        else:
            camera.translations.append(CameraTranslation(language_code=language_code, name=name))


def _build_camera_response(camera: Camera, language: str) -> CameraResponse:
    location_translation = resolve_translation(
        [
            type("LocationTranslation", (), {"language": "en", "value": camera.location.name_en})(),
            type("LocationTranslation", (), {"language": "es", "value": camera.location.name_es})(),
            type("LocationTranslation", (), {"language": "fr", "value": camera.location.name_fr})(),
        ],
        language,
    )
    camera_name_translation = resolve_translation(camera.translations, language)
    fallback_camera_name = resolve_translation(camera.translations, "en").name if resolve_translation(camera.translations, "en") else None
    return CameraResponse(
        id=camera.id,
        name_en=resolve_translation(camera.translations, "en").name if resolve_translation(camera.translations, "en") else None,
        name_es=resolve_translation(camera.translations, "es").name if resolve_translation(camera.translations, "es") else None,
        name_fr=resolve_translation(camera.translations, "fr").name if resolve_translation(camera.translations, "fr") else None,
        name=camera_name_translation.name if camera_name_translation else (fallback_camera_name or str(camera.id)),
        location_id=camera.location_id,
        location_name=location_translation.value if location_translation else camera.location.name_en,
        codec=camera.codec,
        resolution=camera.resolution,
        height=camera.height,
        fps=camera.fps,
        rtsp_url=camera.rtsp_url,
        status=camera.status,
        status_modified_by=camera.status_modified_by,
        usecases=[
            CameraUseCaseResponse(usecase_id=item.usecase_id, is_active=item.is_active)
            for item in camera.camera_usecases
        ],
        last_modified_at=camera.last_modified_at,
        created_at=camera.created_at,
    )

def create_camera_details(
    db: Session, 
    payload: CameraCreate, 
    language: str = "en"
) -> Union[CameraResponse, CommonFailureResponse]:
    try:
        existing_camera = get_camera_by_name(db, payload.name_en, payload.name_es, payload.name_fr)
        if existing_camera:
            return CommonFailureResponse(code=400, message="Camera name already exists")

        location = get_location_by_id(db, payload.location_id)
        if not location:
            return CommonFailureResponse(code=400, message="Invalid location id")

        user = get_user_by_id(db, payload.status_modified_by)
        if not user:
            return CommonFailureResponse(code=400, message="Invalid status_modified_by user id")

        for usecase_assignment in payload.usecases:
            usecase = get_usecase_by_id(db, usecase_assignment.usecase_id)
            if not usecase:
                return CommonFailureResponse(code=400, message=f"Invalid usecase id: {usecase_assignment.usecase_id}")

        camera = create_camera(
            db,
            name_en=payload.name_en,
            name_es=payload.name_es,
            name_fr=payload.name_fr,
            location_id=payload.location_id,
            codec=payload.codec,
            resolution=payload.resolution,
            height=payload.height,
            fps=payload.fps,
            rtsp_url=payload.rtsp_url,
            status=payload.status,
            status_modified_by=payload.status_modified_by,
        )
        _sync_camera_translations(
            camera,
            name_en=payload.name_en,
            name_es=payload.name_es,
            name_fr=payload.name_fr,
        )
        camera.camera_usecases = [
            CameraUsecase(
                usecase_id=usecase_assignment.usecase_id,
                is_active=usecase_assignment.is_active,
            )
            for usecase_assignment in payload.usecases
        ]
        db.add(camera)
        db.commit()
        db.refresh(camera)
        return _build_camera_response(camera, language)
    
    except IntegrityError as e:
        return CommonFailureResponse(code=409, message="Duplicate/constraint violation")
    except SQLAlchemyError as e:
        return CommonFailureResponse(code=500, message="Database Error Occurred")
    except Exception as e:
        return CommonFailureResponse(code=500, message="Internal Server Error")



def update_camera_details(
    db: Session,
    camera_id: int,
    payload: CameraUpdate,
    language: str = "en",
) -> Union[CameraResponse, CommonFailureResponse]:
    try:
        camera = get_camera_by_id(db, camera_id)
        if not camera:
            return CommonFailureResponse(code=404, message="Camera not found")

        # Check if any of the localized names are being changed
        current_name_en = resolve_translation(camera.translations, "en").name if resolve_translation(camera.translations, "en") else None
        current_name_es = resolve_translation(camera.translations, "es").name if resolve_translation(camera.translations, "es") else None
        current_name_fr = resolve_translation(camera.translations, "fr").name if resolve_translation(camera.translations, "fr") else None

        if payload.name_en or payload.name_es or payload.name_fr:
            existing_camera = get_camera_by_name(
                db,
                payload.name_en or current_name_en or "",
                payload.name_es if payload.name_es is not None else current_name_es,
                payload.name_fr if payload.name_fr is not None else current_name_fr,
            )
            if existing_camera and existing_camera.id != camera.id:
                return CommonFailureResponse(code=400, message="Camera name already exists")

        if payload.location_id is not None:
            location = get_location_by_id(db, payload.location_id)
            if not location:
                return CommonFailureResponse(code=400, message="Invalid location id")

        if payload.status_modified_by is not None:
            user = get_user_by_id(db, payload.status_modified_by)
            if not user:
                return CommonFailureResponse(code=400, message="Invalid status_modified_by user id")

        if payload.usecases is not None:
            for usecase_assignment in payload.usecases:
                usecase = get_usecase_by_id(db, usecase_assignment.usecase_id)
                if not usecase:
                    return CommonFailureResponse(code=400, message=f"Invalid usecase id: {usecase_assignment.usecase_id}")

        updated_camera = update_camera(
            db,
            camera=camera,
            name_en=payload.name_en,
            name_es=payload.name_es,
            name_fr=payload.name_fr,
            location_id=payload.location_id,
            codec=payload.codec,
            resolution=payload.resolution,
            height=payload.height,
            fps=payload.fps,
            rtsp_url=payload.rtsp_url,
            status=payload.status,
            status_modified_by=payload.status_modified_by,
        )
        should_persist_related_changes = False
        if payload.name_en is not None or payload.name_es is not None or payload.name_fr is not None:
            _sync_camera_translations(
                updated_camera,
                name_en=payload.name_en if payload.name_en is not None else (current_name_en or ""),
                name_es=payload.name_es if payload.name_es is not None else current_name_es,
                name_fr=payload.name_fr if payload.name_fr is not None else current_name_fr,
            )
            should_persist_related_changes = True
        if payload.usecases is not None:
            updated_camera.camera_usecases = [
                CameraUsecase(
                    usecase_id=usecase_assignment.usecase_id,
                    is_active=usecase_assignment.is_active,
                )
                for usecase_assignment in payload.usecases
            ]
            should_persist_related_changes = True
        if should_persist_related_changes:
            db.add(updated_camera)
            db.commit()
            db.refresh(updated_camera)
        return _build_camera_response(updated_camera, language)
    
    except IntegrityError as e:
        return CommonFailureResponse(code=409, message="Duplicate/constraint violation")
    except SQLAlchemyError as e:
        return CommonFailureResponse(code=500, message="Database Error Occurred")
    except Exception as e:
        return CommonFailureResponse(code=500, message="Internal Server Error")


def get_camera_details(
    db: Session, 
    camera_id: int, 
    language: str = "en"
) -> Union[CommonFailureResponse, CameraResponse]:
    try:
        camera = get_camera_by_id(db, camera_id)
        if not camera:
            return CommonFailureResponse(code=404, message="Camera not found")
        return _build_camera_response(camera, language)
    
    except IntegrityError as e:
        return CommonFailureResponse(code=409, message="Duplicate/constraint violation")
    except SQLAlchemyError as e:
        return CommonFailureResponse(code=500, message="Database Error Occurred")
    except Exception as e:
        return CommonFailureResponse(code=500, message="Internal Server Error") 


def get_all_camera_details(
    db: Session, 
    language: str = "en"
) -> Union[CommonFailureResponse, List[CameraResponse]]:
    try:
        cameras = get_all_cameras(db)
        return [_build_camera_response(camera, language) for camera in cameras]
    except IntegrityError as e:
        return CommonFailureResponse(code=409, message="Duplicate/constraint violation")
    except SQLAlchemyError as e:
        return CommonFailureResponse(code=500, message="Database Error Occurred")
    except Exception as e:
        return CommonFailureResponse(code=500, message="Internal Server Error") 


def delete_camera_details(
    db: Session, 
    camera_id: int
) -> Union[CommonFailureResponse, CameraDeleteSuccessResponse]:
    try:
        camera = get_camera_by_id(db, camera_id)
        if not camera:
            return CommonFailureResponse(code=404, message="Camera not found")
        delete_camera(db, camera=camera)
        return CameraDeleteSuccessResponse(code=200, message="Camera deleted successfully")
    except IntegrityError as e:
        return CommonFailureResponse(code=409, message="Duplicate/constraint violation")
    except SQLAlchemyError as e:
        return CommonFailureResponse(code=500, message="Database Error Occurred")
    except Exception as e:
        return CommonFailureResponse(code=500, message="Internal Server Error") 

def update_camera_status(
    db: Session,
    camera_id: int,
    status: bool,
    language: str,
) -> Union[CameraResponse, CommonFailureResponse]:
    try:
        camera = get_camera_by_id(db, camera_id)

        if not camera:
            return CommonFailureResponse(code=404, message="Camera not found")

        camera.status = status

        db.commit()
        db.refresh(camera)

        return _build_camera_response(camera, language)
    
    except IntegrityError as e:
        return CommonFailureResponse(code=409, message="Duplicate/constraint violation")
    except SQLAlchemyError as e:
        return CommonFailureResponse(code=500, message="Database Error Occurred")
    except Exception as e:
        return CommonFailureResponse(code=500, message="Internal Server Error") 