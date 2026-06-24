from sqlalchemy.orm import Session

from src.models.notification_preference import NotificationPreference


def get_preference(db: Session, user_id: int) -> NotificationPreference | None:
    return (
        db.query(NotificationPreference)
        .filter(NotificationPreference.user_id == user_id)
        .first()
    )


def get_or_create_preference(db: Session, user_id: int) -> NotificationPreference:
    pref = get_preference(db, user_id)
    if pref:
        return pref
    pref = NotificationPreference(user_id=user_id)
    db.add(pref)
    db.commit()
    db.refresh(pref)
    return pref


def update_preference(db: Session, *, user_id: int, changes: dict) -> NotificationPreference:
    pref = get_or_create_preference(db, user_id)
    for key, value in changes.items():
        if value is not None and hasattr(pref, key):
            setattr(pref, key, value)
    db.add(pref)
    db.commit()
    db.refresh(pref)
    return pref
