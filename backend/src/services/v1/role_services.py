from sqlalchemy.orm import Session
from src.models.role import Role


def get_all_roles_details(db: Session, lang: str):
    roles = db.query(Role).all()

    result = []
    for role in roles:
        if lang == "es":
            name = role.name_es
        elif lang == "fr":
            name = role.name_fr
        else:
            name = role.name_en

        result.append({
            "id": role.id,
            "code": role.code,
            "name": name
        })

    return result