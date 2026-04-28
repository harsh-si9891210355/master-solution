from sqlalchemy.orm import Session

from src.models.usecase import UseCase


def get_usecase_by_id(db: Session, usecase_id: int) -> UseCase | None:
    return db.query(UseCase).filter(UseCase.id == usecase_id).first()


def get_usecase_by_code(db: Session, code: str) -> UseCase | None:
    return db.query(UseCase).filter(UseCase.code == code).first()


def get_all_usecases(db: Session) -> list[UseCase]:
    return db.query(UseCase).order_by(UseCase.id.asc()).all()

