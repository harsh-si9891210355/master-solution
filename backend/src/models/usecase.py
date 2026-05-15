from sqlalchemy import Boolean, ForeignKey, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.db.db_connection import Base


class UseCase(Base):
    __tablename__ = "usecases"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    code: Mapped[str] = mapped_column(String(100), unique=True, nullable=False, index=True)
    status: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    translations = relationship("UseCaseTranslation", back_populates="usecase", cascade="all, delete-orphan")
    camera_usecases = relationship("CameraUsecase", back_populates="usecase", cascade="all, delete-orphan")
    events = relationship("Event", back_populates="usecase")


class UseCaseTranslation(Base):
    __tablename__ = "usecase_translations"
    __table_args__ = (UniqueConstraint("usecase_id", "language_code", name="uq_usecase_translation_language"),)

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    usecase_id: Mapped[int] = mapped_column(ForeignKey("usecases.id", ondelete="CASCADE"), nullable=False, index=True)
    language_code: Mapped[str] = mapped_column(String(10), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    usecase = relationship("UseCase", back_populates="translations")

    @property
    def language(self) -> str:
        return self.language_code
