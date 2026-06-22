from typing import Any

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from src.crud.access import get_role_permissions
from src.db.db_connection import get_db
from src.services.v1.auth_services import resolve_user_from_token


# Raw bearer extractor — the token is validated in resolve_user_from_token
# (legacy local JWT, otherwise an Auth0 access token against the tenant JWKS).
_bearer = HTTPBearer()


def get_current_user_context(
    credentials: HTTPAuthorizationCredentials = Depends(_bearer),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    user = resolve_user_from_token(db, credentials.credentials)
    role_permissions = get_role_permissions(db, user.role_id)
    permissions = sorted(
        {
            f"{role_permission.resource.name}:{role_permission.scope.name}"
            for role_permission in role_permissions
        }
    )
    return {
        "user": user,
        "permissions": permissions,
    }


def require_permission(required_permission: str):
    def _dependency(current: dict[str, Any] = Depends(get_current_user_context)) -> dict[str, Any]:
        user_permissions = current["permissions"]

        if "*:*" in user_permissions or required_permission in user_permissions:
            return current

        try:
            resource, scope = required_permission.split(":")
        except ValueError as exc:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Invalid permission format: {required_permission}",
            ) from exc

        if f"{resource}:*" in user_permissions or f"*:{scope}" in user_permissions:
            return current

        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Missing permission: {required_permission}",
        )

    return _dependency
