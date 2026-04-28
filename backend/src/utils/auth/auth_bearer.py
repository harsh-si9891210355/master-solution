from datetime import datetime, timezone

from fastapi import HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from src.crud.user import get_user_by_email
from src.crud.users_token import get_active_user_token
from src.db.db_connection import SessionLocal
from src.utils.auth.auth_handler import Authentication as auth


class JWTBearer(HTTPBearer):
    async def __call__(self, request: Request):
        credentials: HTTPAuthorizationCredentials = await super().__call__(request)
        if credentials:
            if credentials.scheme.lower() != "bearer":
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Invalid authentication scheme"
                )
            token = credentials.credentials
            user_email = auth.verify_token(token)
            if not user_email:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Invalid/Expired token"
                )

            db = SessionLocal()
            try:
                user = get_user_by_email(db, user_email)
                token_entry = (
                    get_active_user_token(
                        db,
                        userid=user.id,
                        token=token,
                        now=datetime.now(timezone.utc),
                    )
                    if user
                    else None
                )
            finally:
                db.close()

            if not token_entry:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Token has been revoked or is no longer active",
                )
            return token
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Authorization header missing"
        )
