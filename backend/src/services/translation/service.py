import logging
from collections.abc import Sequence

from fastapi.concurrency import run_in_threadpool

from src.services.translation.constants import REQUIRED_LANGUAGE_PAIRS
from src.services.translation.exceptions import (
    ServiceNotReadyError,
    TranslationInitializationError,
    UnsupportedLanguagePairError,
)

logger = logging.getLogger(__name__)


class TranslationService:
    """Installs required Argos models at startup and reuses loaded translators."""

    def __init__(
        self,
        required_language_pairs: Sequence[tuple[str, str]] = REQUIRED_LANGUAGE_PAIRS,
    ) -> None:
        self._required_language_pairs = tuple(
            (source.lower(), target.lower()) for source, target in required_language_pairs
        )
        self._translations: dict[tuple[str, str], object] = {}
        self._initialized = False

    async def initialize(self) -> None:
        if self._initialized:
            return

        await run_in_threadpool(self._initialize_sync)

    async def translate_text(
        self,
        text: str,
        source_language: str,
        target_languages: Sequence[str],
    ) -> dict[str, str]:
        return await run_in_threadpool(
            self._translate_text_sync,
            text,
            source_language,
            list(target_languages),
        )

    def _initialize_sync(self) -> None:
        if self._initialized:
            return

        try:
            import argostranslate.package as argos_package
            import argostranslate.translate as argos_translate
        except ImportError as exc:
            raise TranslationInitializationError(
                "Argos Translate is not installed. Add it to the backend dependencies first."
            ) from exc

        self._install_missing_packages(argos_package)
        self._translations = self._build_translation_cache(argos_translate)
        self._initialized = True
        logger.info(
            "Translation service initialized for language pairs: %s",
            ", ".join(f"{source}->{target}" for source, target in self._required_language_pairs),
        )

    def _install_missing_packages(self, argos_package: object) -> None:
        installed_packages = argos_package.get_installed_packages()
        installed_pairs = {
            (package.from_code.lower(), package.to_code.lower())
            for package in installed_packages
        }
        missing_pairs = [
            pair for pair in self._required_language_pairs if pair not in installed_pairs
        ]

        if not missing_pairs:
            return

        logger.info(
            "Installing missing Argos packages for language pairs: %s",
            ", ".join(f"{source}->{target}" for source, target in missing_pairs),
        )

        try:
            argos_package.update_package_index()
            available_packages = argos_package.get_available_packages()
        except Exception as exc:
            raise TranslationInitializationError(
                "Unable to refresh the Argos package index during startup."
            ) from exc

        for source_language, target_language in missing_pairs:
            package_to_install = next(
                (
                    package
                    for package in available_packages
                    if package.from_code.lower() == source_language
                    and package.to_code.lower() == target_language
                ),
                None,
            )
            if package_to_install is None:
                raise TranslationInitializationError(
                    f"No Argos package found for {source_language}->{target_language}."
                )

            try:
                downloaded_package_path = package_to_install.download()
                argos_package.install_from_path(downloaded_package_path)
            except Exception as exc:
                raise TranslationInitializationError(
                    f"Failed to install Argos package for {source_language}->{target_language}."
                ) from exc

    def _build_translation_cache(
        self,
        argos_translate: object,
    ) -> dict[tuple[str, str], object]:
        installed_languages = {
            language.code.lower(): language
            for language in argos_translate.get_installed_languages()
        }

        translations: dict[tuple[str, str], object] = {}
        for source_language, target_language in self._required_language_pairs:
            source = installed_languages.get(source_language)
            target = installed_languages.get(target_language)
            if source is None or target is None:
                raise TranslationInitializationError(
                    f"Installed Argos languages are incomplete for {source_language}->{target_language}."
                )

            # We resolve the translation object once at startup so requests do not
            # need to re-scan installed languages or reload model state.
            translation = source.get_translation(target)
            if translation is None:
                raise TranslationInitializationError(
                    f"Loaded languages do not expose a translation for {source_language}->{target_language}."
                )

            translations[(source_language, target_language)] = translation

        return translations

    def _translate_text_sync(
        self,
        text: str,
        source_language: str,
        target_languages: Sequence[str],
    ) -> dict[str, str]:
        self._ensure_initialized()

        normalized_source = source_language.lower()
        normalized_targets = list(dict.fromkeys(language.lower() for language in target_languages))
        translations: dict[str, str] = {}

        for target_language in normalized_targets:
            if target_language == normalized_source:
                translations[target_language] = text
                continue

            translation = self._translations.get((normalized_source, target_language))
            if translation is None:
                raise UnsupportedLanguagePairError(
                    f"Unsupported translation pair: {normalized_source}->{target_language}"
                )

            translations[target_language] = translation.translate(text)

        return translations

    def _ensure_initialized(self) -> None:
        if not self._initialized:
            raise ServiceNotReadyError(
                "Translation service is still starting up. Try again in a moment."
            )
