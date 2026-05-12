from fastapi import APIRouter, Depends, HTTPException, status

from src.schemas.translation import TranslationRequest, TranslationResponse
from src.services.translation.dependencies import get_translation_service
from src.services.translation.exceptions import (
    ServiceNotReadyError,
    UnsupportedLanguagePairError,
)
from src.services.translation.service import TranslationService

router = APIRouter()


@router.post("/translate", response_model=TranslationResponse)
async def translate_text(
    payload: TranslationRequest,
    translation_service: TranslationService = Depends(get_translation_service),
) -> TranslationResponse:
    try:
        translations = await translation_service.translate_text(
            text=payload.text,
            source_language=payload.source_language,
            target_languages=payload.target_languages,
        )
    except UnsupportedLanguagePairError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc
    except ServiceNotReadyError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exc),
        ) from exc

    # The response is keyed by target language so a debounced client can replace
    # stale results deterministically without re-shaping the payload.
    return TranslationResponse(
        translations=translations,
    )
