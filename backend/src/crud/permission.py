from sqlalchemy.orm import Session

from src.models.resource import Resource
from src.models.role_permission import RolePermission
from src.models.scope import Scope


def get_resource_by_id(db: Session, resource_id: int) -> Resource | None:
    return db.query(Resource).filter(Resource.id == resource_id).first()


def get_resource_by_name(db: Session, name: str) -> Resource | None:
    return db.query(Resource).filter(Resource.name == name).first()


def get_all_resources(db: Session) -> list[Resource]:
    return db.query(Resource).order_by(Resource.id.asc()).all()


def create_resource(db: Session, *, name: str, created_by: int | None = None) -> Resource:
    resource = Resource(name=name, created_by=created_by)
    db.add(resource)
    db.commit()
    db.refresh(resource)
    return resource


def update_resource(db: Session, resource_id: int, *, name: str | None = None, is_active: bool | None = None, updated_by: int | None = None) -> Resource | None:
    resource = get_resource_by_id(db, resource_id)
    if resource:
        if name is not None:
            resource.name = name
        if is_active is not None:
            resource.is_active = is_active
        if updated_by is not None:
            resource.updated_by = updated_by
        db.add(resource)
        db.commit()
        db.refresh(resource)
    return resource


def delete_resource(db: Session, resource_id: int) -> None:
    resource = get_resource_by_id(db, resource_id)
    if resource:
        db.delete(resource)
        db.commit()


def get_scope_by_id(db: Session, scope_id: int) -> Scope | None:
    return db.query(Scope).filter(Scope.id == scope_id).first()


def get_scope_by_name(db: Session, name: str) -> Scope | None:
    return db.query(Scope).filter(Scope.name == name).first()


def get_all_scopes(db: Session) -> list[Scope]:
    return db.query(Scope).order_by(Scope.id.asc()).all()


def create_scope(db: Session, *, name: str, created_by: int | None = None) -> Scope:
    scope = Scope(name=name, created_by=created_by)
    db.add(scope)
    db.commit()
    db.refresh(scope)
    return scope


def update_scope(db: Session, scope_id: int, *, name: str | None = None, is_active: bool | None = None, updated_by: int | None = None) -> Scope | None:
    scope = get_scope_by_id(db, scope_id)
    if scope:
        if name is not None:
            scope.name = name
        if is_active is not None:
            scope.is_active = is_active
        if updated_by is not None:
            scope.updated_by = updated_by
        db.add(scope)
        db.commit()
        db.refresh(scope)
    return scope


def delete_scope(db: Session, scope_id: int) -> None:
    scope = get_scope_by_id(db, scope_id)
    if scope:
        db.delete(scope)
        db.commit()


