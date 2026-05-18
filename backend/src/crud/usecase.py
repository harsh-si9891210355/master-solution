from sqlalchemy.orm import Session, selectinload

from src.models.usecase import UseCase, UseCaseTranslation


def get_usecase_by_id(db: Session, usecase_id: int) -> UseCase | None:
    return (
        db.query(UseCase)
        .options(selectinload(UseCase.translations))
        .filter(UseCase.id == usecase_id)
        .first()
    )
def get_all_usecases(db: Session) -> list[UseCase]:
    return db.query(UseCase).options(selectinload(UseCase.translations)).order_by(UseCase.id.asc()).all()


def create_usecase(
    db: Session,
    *,
    code: str,
    status: bool,
):
    usecase = UseCase(
        code=code,
        status=status,
    )

    db.add(usecase)
    db.flush()

    return usecase


def create_usecase_translation(
    db: Session,
    *,
    usecase_id: int,
    language_code: str,
    name: str,
    description: str | None,
):
    translation = UseCaseTranslation(
        usecase_id=usecase_id,
        language_code=language_code,
        name=name,
        description=description,
    )

    db.add(translation)

    return translation

def get_translation(
    db: Session,
    *,
    usecase_id: int,
    language_code: str,
):
    return (
        db.query(UseCaseTranslation)
        .filter(
            UseCaseTranslation.usecase_id == usecase_id,
            UseCaseTranslation.language_code == language_code,
        )
        .first()
    )

def delete_usecase(
    db: Session,
    usecase: UseCase,
):
    db.delete(usecase)
    db.commit()