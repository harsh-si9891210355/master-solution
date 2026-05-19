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
    status: bool,
) -> UseCase:

    usecase = UseCase(
        status=status,
    )

    db.add(usecase)
    db.flush()

    return usecase


def update_usecase(
    db: Session,
    usecase: UseCase,
    status: bool,
) -> UseCase:

    usecase.status = status

    db.add(usecase)
    db.flush()

    return usecase


def create_usecase_translation(
    db: Session,
    usecase_id: int,
    language_code: str,
    name: str,
    description: str | None = None,
) -> UseCaseTranslation:

    translation = UseCaseTranslation(
        usecase_id=usecase_id,
        language_code=language_code,
        name=name,
        description=description,
    )

    db.add(translation)
    db.flush()

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
