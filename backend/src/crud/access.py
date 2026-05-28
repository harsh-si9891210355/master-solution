from sqlalchemy.orm import Session

from src.models.resource import Resource
from src.models.role_permission import RolePermission
from src.models.scope import Scope


def get_role_permissions(db: Session, role_id: int) -> list[RolePermission]:
    return (
        db.query(RolePermission)
        .filter(RolePermission.role_id == role_id)
        .order_by(RolePermission.id.asc())
        .all()
    )


def get_role_permissions_by_resource(db: Session, role_id: int, resource_id: int) -> list[RolePermission]:
    return (
        db.query(RolePermission)
        .filter(RolePermission.role_id == role_id, RolePermission.resource_id == resource_id)
        .order_by(RolePermission.id.asc())
        .all()
    )


def get_role_permission(db: Session, role_id: int, resource_id: int, scope_id: int) -> RolePermission | None:
    return (
        db.query(RolePermission)
        .filter(
            RolePermission.role_id == role_id,
            RolePermission.resource_id == resource_id,
            RolePermission.scope_id == scope_id,
        )
        .first()
    )


def create_role_permission(
    db: Session, *, role_id: int, resource_id: int, scope_id: int, created_by: int | None = None
) -> RolePermission:
    role_permission = RolePermission(role_id=role_id, resource_id=resource_id, scope_id=scope_id, created_by=created_by)
    db.add(role_permission)
    db.commit()
    db.refresh(role_permission)
    return role_permission


def delete_role_permission(db: Session, role_id: int, resource_id: int, scope_id: int) -> None:
    role_permission = get_role_permission(db, role_id, resource_id, scope_id)
    if role_permission:
        db.delete(role_permission)
        db.commit()


def delete_role_permissions_by_role(db: Session, role_id: int) -> None:
    db.query(RolePermission).filter(RolePermission.role_id == role_id).delete()
    db.commit()


def delete_role_permissions_by_resource(db: Session, resource_id: int) -> None:
    db.query(RolePermission).filter(RolePermission.resource_id == resource_id).delete()
    db.commit()


def delete_role_permissions_by_scope(db: Session, scope_id: int) -> None:
    db.query(RolePermission).filter(RolePermission.scope_id == scope_id).delete()
    db.commit()

