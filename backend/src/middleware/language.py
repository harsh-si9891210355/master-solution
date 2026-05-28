from starlette.middleware.base import BaseHTTPMiddleware


def extract_language(accept_language, default="en"):
    """
    Parse the first language token from the Accept-Language header.
    """
    if not accept_language:
        return default

    first_token = accept_language.split(",", 1)[0].strip()
    language = first_token.split(";", 1)[0].strip().lower()
    if not language:
        return default

    return language.split("-", 1)[0] or default


class LanguageMiddleware(BaseHTTPMiddleware):
    """
    Stores the requested language in request.state.lang.
    """

    async def dispatch(self, request, call_next):
        request.state.lang = extract_language(request.headers.get("Accept-Language"), default="en")
        return await call_next(request)
