from pydantic import BaseModel


class CommonFailureResponse(BaseModel):
    """Structured error body returned by services on failure (mirrors the
    shape used by the camera service). The HTTP status stays 200; the `code`
    field carries the logical status (400/404/409/500/502...)."""

    code: int = 500
    message: str
