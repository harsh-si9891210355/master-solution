from sqlalchemy.orm import Session

from src.models.notification_subscription import NotificationSubscription


def upsert_subscription(
    db: Session,
    *,
    user_id: int,
    endpoint: str,
    p256dh_key: str,
    auth_key: str,
    user_agent: str | None,
) -> NotificationSubscription:
    sub = (
        db.query(NotificationSubscription)
        .filter(NotificationSubscription.endpoint == endpoint)
        .first()
    )
    if sub:
        sub.user_id = user_id
        sub.p256dh_key = p256dh_key
        sub.auth_key = auth_key
        sub.user_agent = user_agent
    else:
        sub = NotificationSubscription(
            user_id=user_id,
            endpoint=endpoint,
            p256dh_key=p256dh_key,
            auth_key=auth_key,
            user_agent=user_agent,
        )
        db.add(sub)
    db.commit()
    db.refresh(sub)
    return sub


def delete_subscription(db: Session, *, user_id: int, endpoint: str) -> bool:
    sub = (
        db.query(NotificationSubscription)
        .filter(
            NotificationSubscription.endpoint == endpoint,
            NotificationSubscription.user_id == user_id,
        )
        .first()
    )
    if not sub:
        return False
    db.delete(sub)
    db.commit()
    return True


def list_subscriptions(db: Session, user_id: int) -> list[NotificationSubscription]:
    return (
        db.query(NotificationSubscription)
        .filter(NotificationSubscription.user_id == user_id)
        .all()
    )
