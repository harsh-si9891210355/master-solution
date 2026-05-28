from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from src.crud.permission import (
    get_all_resources,
    get_all_scopes,
)
from src.crud.access import get_role_permissions
from src.crud.user import get_user_by_id
from src.crud.role import get_role_by_id
from src.schemas.permission import (
    RolePermissionResponse,
    RolePermissionsByRoleResponse,
    ResourcesListResponse,
    ResourceResponse,
    ScopesListResponse,
    ScopeResponse,
)


def get_all_resources_details(db: Session) -> ResourcesListResponse:
    resources = get_all_resources(db)
    return ResourcesListResponse(
        resources=[
            ResourceResponse(id=r.id, name=r.name, is_active=r.is_active)
            for r in resources
        ]
    )


def get_all_scopes_details(db: Session) -> ScopesListResponse:
    scopes = get_all_scopes(db)
    return ScopesListResponse(
        scopes=[
            ScopeResponse(id=s.id, name=s.name, is_active=s.is_active)
            for s in scopes
        ]
    )


def get_all_permissions_details(db: Session) -> list[RolePermissionResponse]:
    """Get all role permissions (kept for compatibility)"""
    from src.models.role_permission import RolePermission
    permissions = db.query(RolePermission).order_by(RolePermission.id.asc()).all()
    return [
        RolePermissionResponse(
            id=p.id,
            role_id=p.role_id,
            resource_id=p.resource_id,
            scope_id=p.scope_id,
            resource=ResourceResponse(id=p.resource.id, name=p.resource.name, is_active=p.resource.is_active),
            scope=ScopeResponse(id=p.scope.id, name=p.scope.name, is_active=p.scope.is_active),
        )
        for p in permissions
    ]


def get_permissions_by_role_id_details(db: Session, role_id: int) -> RolePermissionsByRoleResponse:
    role = get_role_by_id(db, role_id)
    if not role:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Role not found",
        )

    permissions = get_role_permissions(db, role_id)
    return RolePermissionsByRoleResponse(
        role_id=role_id,
        permissions=[
            RolePermissionResponse(
                id=p.id,
                role_id=p.role_id,
                resource_id=p.resource_id,
                scope_id=p.scope_id,
                resource=ResourceResponse(id=p.resource.id, name=p.resource.name, is_active=p.resource.is_active),
                scope=ScopeResponse(id=p.scope.id, name=p.scope.name, is_active=p.scope.is_active),
            )
            for p in permissions
        ],
    )


def get_permissions_by_user_id_details(db: Session, user_id: int) -> RolePermissionsByRoleResponse:
    user = get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    permissions = get_role_permissions(db, user.role_id)
    return RolePermissionsByRoleResponse(
        role_id=user.role_id,
        permissions=[
            RolePermissionResponse(
                id=p.id,
                role_id=p.role_id,
                resource_id=p.resource_id,
                scope_id=p.scope_id,
                resource=ResourceResponse(id=p.resource.id, name=p.resource.name, is_active=p.resource.is_active),
                scope=ScopeResponse(id=p.scope.id, name=p.scope.name, is_active=p.scope.is_active),
            )
            for p in permissions
        ],
    )

