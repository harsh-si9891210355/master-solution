from sqlalchemy.orm import Session

from src.models.role import Role
from src.models.user import User


def get_user_by_id(db: Session, user_id: int) -> User | None:
    return db.query(User).filter(User.id == user_id).first()


def get_user_by_email(db: Session, email: str) -> User | None:
    return db.query(User).filter(User.email == email).first()


def get_users_by_role_code(db: Session, role_code: str) -> list[User]:
    return db.query(User).join(Role, User.role_id == Role.id).filter(Role.code == role_code).all()


def get_all_users(db: Session) -> list[User]:
    return db.query(User).order_by(User.id.desc()).all()


def create_user(
    db: Session,
    *,
    email: str,
    first_name: str,
    last_name: str,
    mobile_number: str | None,
    role_id: int,
    hashed_password: str,
    status: bool = True,
    is_active: bool = True,
) -> User:
    user = User(
        email=email,
        first_name=first_name,
        last_name=last_name,
        mobile_number=mobile_number,
        role_id=role_id,
        hashed_password=hashed_password,
        status=status,
        is_active=is_active,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def update_user(
    db: Session,
    *,
    user: User,
    first_name: str | None = None,
    last_name: str | None = None,
    mobile_number: str | None = None,
    role_id: int | None = None,
    is_active: bool | None = None,
    status: bool | None = None,
) -> User:
    if first_name is not None:
        user.first_name = first_name

    if last_name is not None:
        user.last_name = last_name

    if mobile_number is not None:
        user.mobile_number = mobile_number

    if role_id is not None:
        user.role_id = role_id

    if is_active is not None:
        user.is_active = is_active

    if status is not None:
        user.status = status

    db.add(user)
    db.commit()
    db.refresh(user)

    return user


def update_user_password(db: Session, *, user: User, hashed_password: str) -> User:
    user.hashed_password = hashed_password
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def delete_user(db: Session, *, user: User) -> None:
    db.delete(user)
    db.commit()
