from pydantic import BaseModel, Field


class PushSubscriptionKeys(BaseModel):
    p256dh: str
    auth: str


class PushSubscriptionCreate(BaseModel):
    """Mirrors the browser PushSubscription.toJSON() shape."""

    endpoint: str = Field(..., max_length=2048)
    keys: PushSubscriptionKeys


class PushSubscriptionResponse(BaseModel):
    id: int
    endpoint: str
    user_agent: str | None


class VapidPublicKeyResponse(BaseModel):
    public_key: str


class MessageResponse(BaseModel):
    message: str
