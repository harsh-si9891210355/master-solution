from fastapi import HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from src.utils.auth.auth0_token import Auth0TokenError, Auth0TokenValidator
from src.utils.auth.auth_handler import Authentication as auth


class JWTBearer(HTTPBearer):
    """Requires a valid bearer token: either a legacy local backend JWT or an
    Auth0-issued access token (verified against the tenant JWKS)."""

    async def __call__(self, request: Request) -> str:
        credentials: HTTPAuthorizationCredentials = await super().__call__(request)
        if not credentials:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Authorization header missing",
            )
        if credentials.scheme.lower() != "bearer":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Invalid authentication scheme",
            )

        token = credentials.credentials

        # Legacy local JWT (issued by /auth/login) — decodes with our secret.
        if auth.verify_token(token):
            return token

        # Otherwise it must be a valid Auth0 access token.
        try:
            Auth0TokenValidator().verify(token)
        except Auth0TokenError as exc:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Invalid Auth0 token: {exc}",
            )
        return token
