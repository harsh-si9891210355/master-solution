from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from src.db.db_connection import get_db
from src.schemas.permission import (
    RolePermissionsListResponse,
    RolePermissionsByRoleResponse,
    ResourcesListResponse,
    ScopesListResponse,
)
from src.services.v1.permission_services import (
    get_all_permissions_details,
    get_permissions_by_role_id_details,
    get_permissions_by_user_id_details,
    get_all_resources_details,
    get_all_scopes_details,
)
from src.utils.auth.auth import require_permission


router = APIRouter()


@router.get("/resources", response_model=ResourcesListResponse, dependencies=[Depends(require_permission("permission:read"))])
def get_all_resources(
    db: Session = Depends(get_db),
) -> ResourcesListResponse:
    """Get all available resources"""
    return get_all_resources_details(db)


@router.get("/scopes", response_model=ScopesListResponse, dependencies=[Depends(require_permission("permission:read"))])
def get_all_scopes(
    db: Session = Depends(get_db),
) -> ScopesListResponse:
    """Get all available scopes"""
    return get_all_scopes_details(db)


@router.get("", response_model=RolePermissionsListResponse, dependencies=[Depends(require_permission("permission:read"))])
def get_all_permissions(
    db: Session = Depends(get_db),
) -> RolePermissionsListResponse:
    """Get all role permissions"""
    permissions = get_all_permissions_details(db)
    return RolePermissionsListResponse(permissions=permissions)


@router.get("/role/{role_id}", response_model=RolePermissionsByRoleResponse, dependencies=[Depends(require_permission("permission:read"))])
def get_permissions_by_role(
    role_id: int,
    db: Session = Depends(get_db),
) -> RolePermissionsByRoleResponse:
    """Get all permissions for a specific role"""
    return get_permissions_by_role_id_details(db, role_id)


@router.get("/user/{user_id}", response_model=RolePermissionsByRoleResponse, dependencies=[Depends(require_permission("permission:read"))])
def get_permissions_by_user(
    user_id: int,
    db: Session = Depends(get_db),
) -> RolePermissionsByRoleResponse:
    """Get all permissions for a specific user (based on user's role)"""
    return get_permissions_by_user_id_details(db, user_id)
