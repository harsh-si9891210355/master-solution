class TranslationError(Exception):
    """Base exception for translation-related failures."""


class TranslationInitializationError(TranslationError):
    """Raised when translation packages cannot be installed or loaded."""


class ServiceNotReadyError(TranslationError):
    """Raised when the translation service has not completed startup."""


class UnsupportedLanguagePairError(TranslationError):
    """Raised when a requested language pair is not available."""
