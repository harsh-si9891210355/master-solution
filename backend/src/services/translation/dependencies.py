from fastapi import HTTPException, Request, status

from src.services.translation.service import TranslationService


def get_translation_service(request: Request) -> TranslationService:
    service = getattr(request.app.state, "translation_service", None)
    if not isinstance(service, TranslationService):
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Translation service is not available",
        )
    return service
