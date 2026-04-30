from datetime import datetime

from sqlalchemy.orm import Session

from src.models.users_token import UsersToken


def create_user_token(
    db: Session,
    *,
    userid: int,
    token: str,
    expires_at: datetime,
    device_id: str | None = None,
    ip_address: str | None = None,
    user_agent: str | None = None,
) -> UsersToken:
    user_token = UsersToken(
        userid=userid,
        device_id=device_id,
        token=token,
        expires_at=expires_at,
        ip_address=ip_address,
        user_agent=user_agent,
    )
    db.add(user_token)
    db.commit()
    db.refresh(user_token)
    return user_token


def get_active_user_token(
    db: Session,
    *,
    userid: int,
    token: str,
    now: datetime,
) -> UsersToken | None:
    return (
        db.query(UsersToken)
        .filter(
            UsersToken.userid == userid,
            UsersToken.token == token,
            UsersToken.is_revoked.is_(False),
            UsersToken.expires_at > now,
        )
        .first()
    )


def get_any_active_user_token(
    db: Session,
    *,
    userid: int,
    now: datetime,
) -> UsersToken | None:
    """Get any active, non-expired token for a user"""
    return (
        db.query(UsersToken)
        .filter(
            UsersToken.userid == userid,
            UsersToken.is_revoked.is_(False),
            UsersToken.expires_at > now,
        )
        .first()
    )


def delete_expired_user_tokens(db: Session, *, userid: int, now: datetime) -> int:
    expired_tokens = (
        db.query(UsersToken)
        .filter(
            UsersToken.userid == userid,
            UsersToken.expires_at <= now,
        )
        .all()
    )

    for token in expired_tokens:
        db.delete(token)

    db.commit()
    return len(expired_tokens)


def revoke_user_token(db: Session, *, userid: int, token: str) -> bool:
    user_token = (
        db.query(UsersToken)
        .filter(
            UsersToken.userid == userid,
            UsersToken.token == token,
            UsersToken.is_revoked.is_(False),
        )
        .first()
    )
    if not user_token:
        return False

    user_token.is_revoked = True
    db.add(user_token)
    db.commit()
    return True


def revoke_all_user_tokens(db: Session, *, userid: int) -> int:
    active_tokens = (
        db.query(UsersToken)
        .filter(
            UsersToken.userid == userid,
            UsersToken.is_revoked.is_(False),
        )
        .all()
    )

    for token in active_tokens:
        token.is_revoked = True
        db.add(token)

    db.commit()
    return len(active_tokens)
