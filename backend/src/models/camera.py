from datetime import datetime

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.db.db_connection import Base


class Camera(Base):
    __tablename__ = "cameras"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    name_en: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    name_es: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    name_fr: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    location_id: Mapped[int] = mapped_column("locationid", ForeignKey("locations.id"), nullable=False, index=True)
    codec: Mapped[str] = mapped_column(String(255), nullable=False)
    resolution: Mapped[str] = mapped_column(String(255), nullable=False)
    height: Mapped[float | None] = mapped_column(Float, nullable=True)
    fps: Mapped[str] = mapped_column(String(50), default="5", nullable=False)
    rtsp_url: Mapped[str | None] = mapped_column("rtspurl", String(255), nullable=True)
    status: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    status_modified_by: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT", onupdate="CASCADE"),
        nullable=False,
        index=True,
    )
    last_modified_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        onupdate=func.now(),
    )
    created_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        server_default=func.now(),
    )

    location = relationship("Location", back_populates="cameras")
    camera_usecases = relationship("CameraUsecase", back_populates="camera", cascade="all, delete-orphan")
    user = relationship("User", back_populates="cameras")
    events = relationship("Event", back_populates="camera")
