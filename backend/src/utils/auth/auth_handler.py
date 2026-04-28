from datetime import datetime, timedelta, timezone

from jose import JWTError, jwt

from src.core.config import settings


class Authentication:
    EXPIRY_KEY = "exp"
    EMAIL_KEY = "email"

    @staticmethod
    def create_access_token(data: dict) -> str:
        to_encode = data.copy()
        expire = datetime.now(timezone.utc) + timedelta(
            minutes=settings.access_token_expire_minutes
        )
        to_encode.update({Authentication.EXPIRY_KEY: expire.timestamp()})
        return jwt.encode(to_encode, settings.secret_key, algorithm=settings.algorithm)

    @staticmethod
    def verify_token(token: str) -> str | None:
        try:
            payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
            exp_timestamp = payload.get(Authentication.EXPIRY_KEY)
            current_time = datetime.now(timezone.utc)
            exp_time = datetime.fromtimestamp(exp_timestamp, tz=timezone.utc) if exp_timestamp else None
            if exp_timestamp and current_time > exp_time:
                return None
            return payload.get(Authentication.EMAIL_KEY)
        except JWTError:
            return None

    @staticmethod
    def get_token_expiry(token: str) -> datetime | None:
        try:
            payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
            exp_timestamp = payload.get(Authentication.EXPIRY_KEY)
            if not exp_timestamp:
                return None
            return datetime.fromtimestamp(exp_timestamp, tz=timezone.utc)
        except JWTError:
            return None
