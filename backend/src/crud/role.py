from sqlalchemy.orm import Session

from src.models.role import Role


DEFAULT_ROLES = (
    {"code": "admin", "name_en": "Administrator", "name_es": "Administrador", "name_fr": "Administrateur"},
    {"code": "manager", "name_en": "Manager", "name_es": "Gerente", "name_fr": "Gestionnaire"},
    {"code": "user", "name_en": "User", "name_es": "Usuario", "name_fr": "Utilisateur"},
)


def get_role_by_code(db: Session, code: str) -> Role | None:
    return db.query(Role).filter(Role.code == code).first()


def get_role_by_id(db: Session, role_id: int) -> Role | None:
    return db.query(Role).filter(Role.id == role_id).first()


def seed_roles(db: Session) -> None:
    existing_codes = {
        role.code for role in db.query(Role).filter(Role.code.in_([role["code"] for role in DEFAULT_ROLES])).all()
    }
    new_roles = [Role(**role_data) for role_data in DEFAULT_ROLES if role_data["code"] not in existing_codes]
    if not new_roles:
        return

    db.add_all(new_roles)
    db.commit()
