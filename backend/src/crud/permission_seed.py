"""Idempotently seed the notification feature's RBAC entries.

Ensures the alert / notification / escalation resources and the standard scopes
exist, and grants every combination to the admin and manager roles so the new
endpoints are usable out of the box.
"""

from sqlalchemy.orm import Session

from src.crud.role import get_role_by_code
from src.models.resource import Resource
from src.models.role_permission import RolePermission
from src.models.scope import Scope

NOTIFICATION_RESOURCES = ("alert", "notification", "escalation")
NOTIFICATION_SCOPES = ("read", "create", "update", "delete")
GRANT_ROLES = ("admin", "manager")


def _get_or_create(db: Session, model, name: str):
    row = db.query(model).filter(model.name == name).first()
    if not row:
        row = model(name=name)
        db.add(row)
        db.flush()
    return row


def seed_notification_permissions(db: Session) -> None:
    resources = {name: _get_or_create(db, Resource, name) for name in NOTIFICATION_RESOURCES}
    scopes = {name: _get_or_create(db, Scope, name) for name in NOTIFICATION_SCOPES}
    db.flush()

    for role_code in GRANT_ROLES:
        role = get_role_by_code(db, role_code)
        if not role:
            continue
        for resource in resources.values():
            for scope in scopes.values():
                exists = (
                    db.query(RolePermission)
                    .filter(
                        RolePermission.role_id == role.id,
                        RolePermission.resource_id == resource.id,
                        RolePermission.scope_id == scope.id,
                    )
                    .first()
                )
                if not exists:
                    db.add(
                        RolePermission(
                            role_id=role.id, resource_id=resource.id, scope_id=scope.id
                        )
                    )
    db.commit()
