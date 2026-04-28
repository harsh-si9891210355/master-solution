from sqlalchemy import Boolean, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.db.db_connection import Base


class CameraUsecase(Base):
    __tablename__ = "camera_usecase"

    camera_id: Mapped[int] = mapped_column(
        "cameraid",
        ForeignKey("cameras.id", ondelete="CASCADE"),
        primary_key=True,
        nullable=False,
    )
    usecase_id: Mapped[int] = mapped_column(
        "usecaseid",
        ForeignKey("usecases.id", ondelete="CASCADE"),
        primary_key=True,
        nullable=False,
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    camera = relationship("Camera", back_populates="camera_usecases")
    usecase = relationship("UseCase", back_populates="camera_usecases")
