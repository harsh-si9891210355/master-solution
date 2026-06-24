from sqlalchemy.orm import Session

from src.crud.notification_preference import get_or_create_preference, update_preference
from src.crud.notification_subscription import (
    delete_subscription,
    upsert_subscription,
)
from src.models.notification_preference import NotificationPreference
from src.schemas.notification_preference import (
    NotificationPreferenceResponse,
    NotificationPreferenceUpdate,
)
from src.schemas.notification_subscription import PushSubscriptionCreate


def _build_preference_response(pref: NotificationPreference) -> NotificationPreferenceResponse:
    return NotificationPreferenceResponse(
        user_id=pref.user_id,
        in_app_enabled=pref.in_app_enabled,
        web_push_enabled=pref.web_push_enabled,
        email_enabled=pref.email_enabled,
        min_severity=pref.min_severity,
        quiet_hours_enabled=pref.quiet_hours_enabled,
        quiet_hours_start=pref.quiet_hours_start,
        quiet_hours_end=pref.quiet_hours_end,
        quiet_hours_timezone=pref.quiet_hours_timezone,
        override_critical=pref.override_critical,
        muted_until=pref.muted_until,
        sound_enabled=pref.sound_enabled,
        sound_name=pref.sound_name,
    )


def get_preferences(db: Session, user_id: int) -> NotificationPreferenceResponse:
    return _build_preference_response(get_or_create_preference(db, user_id))


def save_preferences(
    db: Session, user_id: int, payload: NotificationPreferenceUpdate
) -> NotificationPreferenceResponse:
    pref = update_preference(db, user_id=user_id, changes=payload.model_dump(exclude_unset=True))
    return _build_preference_response(pref)


def register_subscription(db: Session, user_id: int, payload: PushSubscriptionCreate, user_agent: str | None) -> None:
    upsert_subscription(
        db,
        user_id=user_id,
        endpoint=payload.endpoint,
        p256dh_key=payload.keys.p256dh,
        auth_key=payload.keys.auth,
        user_agent=user_agent,
    )


def remove_subscription(db: Session, user_id: int, endpoint: str) -> bool:
    return delete_subscription(db, user_id=user_id, endpoint=endpoint)
