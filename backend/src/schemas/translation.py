from pydantic import BaseModel, Field, field_validator


class TranslationRequest(BaseModel):
    text: str = Field(min_length=1, max_length=5000)
    source_language: str = Field(min_length=2, max_length=10)
    target_languages: list[str] = Field(min_length=1)

    @field_validator("source_language")
    @classmethod
    def normalize_source_language(cls, value: str) -> str:
        return value.strip().lower()

    @field_validator("target_languages")
    @classmethod
    def normalize_target_languages(cls, value: list[str]) -> list[str]:
        normalized = []
        seen: set[str] = set()

        for language in value:
            normalized_language = language.strip().lower()
            if not normalized_language:
                raise ValueError("Target languages must not contain empty values.")
            if normalized_language not in seen:
                seen.add(normalized_language)
                normalized.append(normalized_language)

        if not normalized:
            raise ValueError("At least one target language is required.")

        return normalized


class TranslationResponse(BaseModel):
    translations: dict[str, str]
