from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from src.core.config import settings
from src.db.db_connection import get_db
from src.schemas.notification_preference import (
    NotificationPreferenceResponse,
    NotificationPreferenceUpdate,
)
from src.schemas.notification_subscription import (
    MessageResponse,
    PushSubscriptionCreate,
    VapidPublicKeyResponse,
)
from src.services.v1.notification_services import (
    get_preferences,
    register_subscription,
    remove_subscription,
    save_preferences,
)
from src.utils.auth.auth import require_permission

router = APIRouter()


@router.get("/preferences", response_model=NotificationPreferenceResponse)
def get_preferences_route(
    db: Session = Depends(get_db),
    current=Depends(require_permission("notification:read")),
) -> NotificationPreferenceResponse:
    return get_preferences(db, current["user"].id)


@router.put("/preferences", response_model=NotificationPreferenceResponse)
def update_preferences_route(
    payload: NotificationPreferenceUpdate,
    db: Session = Depends(get_db),
    current=Depends(require_permission("notification:update")),
) -> NotificationPreferenceResponse:
    return save_preferences(db, current["user"].id, payload)


@router.get("/vapid-public-key", response_model=VapidPublicKeyResponse)
def vapid_public_key_route() -> VapidPublicKeyResponse:
    return VapidPublicKeyResponse(public_key=settings.vapid_public_key)


@router.post("/subscriptions", response_model=MessageResponse, status_code=201)
def create_subscription_route(
    payload: PushSubscriptionCreate,
    request: Request,
    db: Session = Depends(get_db),
    current=Depends(require_permission("notification:update")),
) -> MessageResponse:
    register_subscription(db, current["user"].id, payload, request.headers.get("user-agent"))
    return MessageResponse(message="Subscription registered")


@router.delete("/subscriptions", response_model=MessageResponse)
def delete_subscription_route(
    payload: PushSubscriptionCreate,
    db: Session = Depends(get_db),
    current=Depends(require_permission("notification:update")),
) -> MessageResponse:
    remove_subscription(db, current["user"].id, payload.endpoint)
    return MessageResponse(message="Subscription removed")
