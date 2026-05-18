from sqlalchemy.orm import Session, selectinload

from src.models.usecase import UseCase


def get_usecase_by_id(db: Session, usecase_id: int) -> UseCase | None:
    return (
        db.query(UseCase)
        .options(selectinload(UseCase.translations))
        .filter(UseCase.id == usecase_id)
        .first()
    )
def get_all_usecases(db: Session) -> list[UseCase]:
    return db.query(UseCase).options(selectinload(UseCase.translations)).order_by(UseCase.id.asc()).all()
