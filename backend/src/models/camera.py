from datetime import datetime

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, String, UniqueConstraint, func, LargeBinary
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.db.db_connection import Base


class Camera(Base):
    __tablename__ = "cameras"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    location_id: Mapped[int] = mapped_column("locationid", ForeignKey("locations.id"), nullable=False, index=True)
    codec: Mapped[str] = mapped_column(String(255), nullable=False)
    resolution: Mapped[str] = mapped_column(String(255), nullable=False)
    height: Mapped[float | None] = mapped_column(Float, nullable=True)
    fps: Mapped[str] = mapped_column(String(50), default="5", nullable=False)
    roi: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    roi_frame_blob: Mapped[bytes | None] = mapped_column(LargeBinary, nullable=True)
    rtsp_url: Mapped[str | None] = mapped_column("rtspurl", String(255), nullable=True)
    # Optional low-quality substream URL. When set, recordings are pulled from it
    # directly (no transcode) instead of re-encoding the main rtsp_url.
    substream_rtsp_url: Mapped[str | None] = mapped_column("substream_rtspurl", String(255), nullable=True)
    status: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    # Soft-delete flag used by the ROI endpoints (rest of the app hard-deletes).
    is_delete: Mapped[bool] = mapped_column(
        Boolean, default=False, server_default="false", nullable=False
    )
    status_modified_by: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT", onupdate="CASCADE"),
        nullable=False,
        index=True,
    )
    # Who last modified the camera/ROI (set by the ROI service).
    updated_by: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL", onupdate="CASCADE"),
        nullable=True,
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
    translations = relationship("CameraTranslation", back_populates="camera", cascade="all, delete-orphan")
    camera_usecases = relationship("CameraUsecase", back_populates="camera", cascade="all, delete-orphan")
    user = relationship("User", back_populates="cameras", foreign_keys=[status_modified_by])
    events = relationship("Event", back_populates="camera")


class CameraTranslation(Base):
    __tablename__ = "camera_translations"
    __table_args__ = (UniqueConstraint("camera_id", "language_code", name="uq_camera_translation_language"),)

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    camera_id: Mapped[int] = mapped_column(ForeignKey("cameras.id", ondelete="CASCADE"), nullable=False, index=True)
    language_code: Mapped[str] = mapped_column(String(10), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)

    camera = relationship("Camera", back_populates="translations")

    @property
    def language(self) -> str:
        return self.language_code
