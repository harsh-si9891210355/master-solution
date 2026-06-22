import logging
from functools import wraps
from typing import Callable

from sqlalchemy.exc import SQLAlchemyError, IntegrityError
from sqlalchemy.orm import Session

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
    Ai,
    Alerts,
    CameraCreate,
    CameraDeleteSuccessResponse,
    CameraResponse,
    CameraUpdate,
    CamerasResponse,
    Capabilities,
    CommonFailureResponse,
    Connectivity,
    Identity,
    LocationInfo,
    Recording,
    StatusInfo,
    UpdateCameraUseCaseRequest,
    Video,
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
            return CommonFailureResponse(code=409, message="Duplicate/constraint violation")

        except SQLAlchemyError as error:
            self.db.rollback()
            logger.exception(error)
            return CommonFailureResponse(code=500, message="Database Error Occurred")

        except Exception as error:
            self.db.rollback()
            logger.exception(error)
            return CommonFailureResponse(code=500, message="Internal Server Error")

    return wrapper


def _parse_int(value) -> int | None:
    try:
        return int(float(value))
    except (TypeError, ValueError):
        return None


class CameraService:
    def __init__(self, db: Session):
        self.db = db

    # ----------------------------------------------------------------- #
    # Translation / location helpers (unchanged behaviour)
    # ----------------------------------------------------------------- #
    def _sync_camera_translations(
        self,
        camera: Camera,
        *,
        name_en: str,
        name_es: str | None,
        name_fr: str | None,
    ) -> None:
        desired_translations = {"en": name_en, "es": name_es, "fr": name_fr}

        camera.translations = [
            translation
            for translation in camera.translations
            if translation.language_code.lower() not in desired_translations
            or desired_translations[translation.language_code.lower()]
        ]
        translations_by_language = {
            translation.language_code.lower(): translation for translation in camera.translations
        }

        for language_code, name in desired_translations.items():
            if not name:
                continue
            if language_code in translations_by_language:
                translations_by_language[language_code].name = name
            else:
                camera.translations.append(
                    CameraTranslation(language_code=language_code, name=name)
                )

    def _get_location_name(self, camera: Camera, language_code: str, fallback: str | None = None) -> str | None:
        translations = {t.language_code.lower(): t for t in camera.location.translations}
        normalized = language_code.lower()
        if normalized in translations:
            return translations[normalized].name
        base = normalized.split("-", 1)[0]
        if base in translations:
            return translations[base].name
        return next(iter(translations.values())).name if translations else None

    def _translation_name(self, camera: Camera, language_code: str) -> str | None:
        translation = resolve_translation(camera.translations, language_code)
        return translation.name if translation else None

    # ----------------------------------------------------------------- #
    # Nested response builder (columns + JSONB config)
    # ----------------------------------------------------------------- #
    def _build_camera_response(self, camera: Camera, language: str) -> CameraResponse:
        config = camera.config or {}

        def section(name: str) -> dict:
            value = config.get(name)
            return value if isinstance(value, dict) else {}

        identity_cfg = section("identity")
        location_cfg = section("location")
        connectivity_cfg = section("connectivity")
        video_cfg = section("video")
        ai_cfg = section("ai")
        recording_cfg = section("recording")
        alerts_cfg = section("alerts")
        capabilities_cfg = section("capabilities")
        status_cfg = section("status")

        name_en = self._translation_name(camera, "en")
        name_es = self._translation_name(camera, "es")
        name_fr = self._translation_name(camera, "fr")
        display = self._translation_name(camera, language) or name_en or str(camera.id)

        location_translation = resolve_translation(camera.location.translations, language)
        location_name = (
            location_translation.name
            if location_translation
            else (self._get_location_name(camera, "en") or str(camera.location_id))
        )

        # Flat columns are authoritative for streaming/relational fields.
        connectivity = {**connectivity_cfg}
        connectivity["rtspUrl"] = camera.rtsp_url
        connectivity["substreamRtspUrl"] = camera.substream_rtsp_url

        video = {**video_cfg}
        video["codec"] = camera.codec
        video["nativeResolution"] = camera.resolution
        video["nativeFps"] = _parse_int(camera.fps)
        video["height"] = camera.height

        return CameraResponse(
            identity=Identity(
                id=camera.id,
                code=identity_cfg.get("code"),
                displayName=display,
                en=name_en,
                es=name_es,
                fr=name_fr,
                tags=identity_cfg.get("tags"),
            ),
            location=LocationInfo(
                siteId=location_cfg.get("siteId"),
                locationId=camera.location_id,
                zoneId=location_cfg.get("zoneId"),
                zoneType=location_cfg.get("zoneType"),
                locationName=location_name,
            ),
            connectivity=Connectivity(**connectivity),
            video=Video(**video),
            ai=Ai(**ai_cfg),
            recording=Recording(**recording_cfg),
            alerts=Alerts(**alerts_cfg),
            capabilities=Capabilities(**capabilities_cfg),
            status=StatusInfo(
                active=camera.status,
                createdAt=camera.created_at,
                createdBy=status_cfg.get("createdBy") or camera.status_modified_by,
                updatedAt=camera.last_modified_at,
                updatedBy=status_cfg.get("updatedBy"),
            ),
        )

    # ----------------------------------------------------------------- #
    # Create
    # ----------------------------------------------------------------- #
    @handle_db_exceptions
    def create_camera_details(self, db: Session, payload: CameraCreate, language: str = "en"):
        identity = payload.identity
        location = payload.location
        video = payload.video
        status_info = payload.status
        connectivity = payload.connectivity

        name_en = (identity.en or identity.displayName) if identity else None
        name_es = identity.es if identity else None
        name_fr = identity.fr if identity else None

        if not name_en:
            return CommonFailureResponse(code=400, message="identity.displayName (or identity.en) is required")
        if not location or location.locationId is None:
            return CommonFailureResponse(code=400, message="location.locationId is required")
        if not video or not video.codec or not video.nativeResolution:
            return CommonFailureResponse(code=400, message="video.codec and video.nativeResolution are required")
        created_by = status_info.createdBy if status_info else None
        if created_by is None:
            return CommonFailureResponse(code=400, message="status.createdBy is required")

        if get_camera_by_name(db, name_en, name_es, name_fr):
            return CommonFailureResponse(code=400, message="Camera name already exists")
        if not get_location_by_id(db, location.locationId):
            return CommonFailureResponse(code=400, message="Invalid location id")
        if not get_user_by_id(db, created_by):
            return CommonFailureResponse(code=400, message="Invalid status.createdBy user id")

        config = payload.model_dump(exclude_none=True, mode="json")

        camera = create_camera(
            db,
            name_en=name_en,
            name_es=name_es,
            name_fr=name_fr,
            location_id=location.locationId,
            codec=video.codec,
            resolution=video.nativeResolution,
            height=video.height,
            fps=str(video.nativeFps) if video.nativeFps is not None else "5",
            rtsp_url=connectivity.rtspUrl if connectivity else None,
            substream_rtsp_url=connectivity.substreamRtspUrl if connectivity else None,
            status=status_info.active if status_info.active is not None else True,
            status_modified_by=created_by,
            config=config,
        )
        self._sync_camera_translations(camera, name_en=name_en, name_es=name_es, name_fr=name_fr)
        db.add(camera)
        db.commit()
        db.refresh(camera)
        return self._build_camera_response(camera, language)

    # ----------------------------------------------------------------- #
    # Update (partial)
    # ----------------------------------------------------------------- #
    @handle_db_exceptions
    def update_camera_details(self, db: Session, camera_id: int, payload: CameraUpdate, language: str = "en"):
        camera = get_camera_by_id(db, camera_id)
        if not camera:
            return CommonFailureResponse(code=404, message="Camera not found")

        identity = payload.identity
        location = payload.location
        video = payload.video
        connectivity = payload.connectivity
        status_info = payload.status

        current_en = self._translation_name(camera, "en")
        current_es = self._translation_name(camera, "es")
        current_fr = self._translation_name(camera, "fr")

        new_en = (identity.en or identity.displayName) if identity else None
        new_es = identity.es if identity else None
        new_fr = identity.fr if identity else None

        if identity and (new_en or new_es or new_fr):
            existing = get_camera_by_name(
                db,
                new_en or current_en or "",
                new_es if new_es is not None else current_es,
                new_fr if new_fr is not None else current_fr,
            )
            if existing and existing.id != camera.id:
                return CommonFailureResponse(code=400, message="Camera name already exists")

        if location and location.locationId is not None:
            if not get_location_by_id(db, location.locationId):
                return CommonFailureResponse(code=400, message="Invalid location id")

        new_status_by = None
        if status_info:
            new_status_by = status_info.updatedBy or status_info.createdBy
            if new_status_by is not None and not get_user_by_id(db, new_status_by):
                return CommonFailureResponse(code=400, message="Invalid status user id")

        # Shallow per-section merge so a partial update doesn't wipe other config.
        merged_config = dict(camera.config or {})
        incoming = payload.model_dump(exclude_none=True, mode="json")
        for key, value in incoming.items():
            if isinstance(value, dict) and isinstance(merged_config.get(key), dict):
                merged_config[key] = {**merged_config[key], **value}
            else:
                merged_config[key] = value

        update_camera(
            db,
            camera=camera,
            location_id=location.locationId if location else None,
            codec=video.codec if video else None,
            resolution=video.nativeResolution if video else None,
            height=video.height if video else None,
            fps=str(video.nativeFps) if (video and video.nativeFps is not None) else None,
            rtsp_url=connectivity.rtspUrl if connectivity else None,
            substream_rtsp_url=connectivity.substreamRtspUrl if connectivity else None,
            status=status_info.active if status_info else None,
            status_modified_by=new_status_by,
            config=merged_config,
        )

        if identity and (new_en is not None or new_es is not None or new_fr is not None):
            self._sync_camera_translations(
                camera,
                name_en=new_en if new_en is not None else (current_en or ""),
                name_es=new_es if new_es is not None else current_es,
                name_fr=new_fr if new_fr is not None else current_fr,
            )
            db.add(camera)
            db.commit()
            db.refresh(camera)
        return self._build_camera_response(camera, language)

    # ----------------------------------------------------------------- #
    # Read / delete / status / usecase (unchanged behaviour)
    # ----------------------------------------------------------------- #
    @handle_db_exceptions
    def get_camera_details(self, db: Session, camera_id: int, language: str = "en"):
        camera = get_camera_by_id(db, camera_id)
        if not camera:
            return CommonFailureResponse(code=404, message="Camera not found")
        return self._build_camera_response(camera, language)

    @handle_db_exceptions
    def get_all_camera_details(self, db: Session, language: str = "en"):
        cameras = get_all_cameras(db)
        return CamerasResponse(cameras=[self._build_camera_response(camera, language) for camera in cameras])

    @handle_db_exceptions
    def delete_camera_details(self, db: Session, camera_id: int):
        camera = get_camera_by_id(db, camera_id)
        if not camera:
            return CommonFailureResponse(code=404, message="Camera not found")
        delete_camera(db, camera=camera)
        return CameraDeleteSuccessResponse(code=200, message="Camera deleted successfully")

    @handle_db_exceptions
    def update_camera_status(self, db: Session, camera_id: int, status: bool, language: str):
        camera = get_camera_by_id(db, camera_id)
        if not camera:
            return CommonFailureResponse(code=404, message="Camera not found")
        camera.status = status
        db.commit()
        db.refresh(camera)
        return self._build_camera_response(camera, language)

    @handle_db_exceptions
    def update_camera_usecase(self, db: Session, camera_id: int, payload: UpdateCameraUseCaseRequest, language: str):
        camera = get_camera_by_id(db, camera_id)
        if not camera:
            return CommonFailureResponse(code=404, message="Camera not found")

        for usecase_assignment in payload.usecases:
            if not get_usecase_by_id(db, usecase_assignment.usecase_id):
                return CommonFailureResponse(code=400, message=f"Invalid usecase id: {usecase_assignment.usecase_id}")
        camera.camera_usecases = [
            CameraUsecase(usecase_id=item.usecase_id, is_active=item.is_active)
            for item in payload.usecases
        ]
        db.add(camera)
        db.commit()
        db.refresh(camera)
        return self._build_camera_response(camera, language)
