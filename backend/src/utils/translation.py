def resolve_translation(translations, lang, fallback="en"):
    if not translations:
        return None

    normalized_lang = (lang or fallback or "en").lower()
    fallback_lang = (fallback or "en").lower()

    by_language = {translation.language.lower(): translation for translation in translations}

    if normalized_lang in by_language:
        return by_language[normalized_lang]

    base_lang = normalized_lang.split("-", 1)[0]
    if base_lang in by_language:
        return by_language[base_lang]

    if fallback_lang in by_language:
        return by_language[fallback_lang]

    fallback_base_lang = fallback_lang.split("-", 1)[0]
    if fallback_base_lang in by_language:
        return by_language[fallback_base_lang]

    return next(iter(translations), None)
