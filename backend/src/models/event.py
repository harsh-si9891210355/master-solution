from datetime import datetime

from sqlalchemy import BigInteger, DateTime, ForeignKey, Integer, SmallInteger, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.db.db_connection import Base


class Event(Base):
    __tablename__ = "events"

    # PK column stays `id` (exposed as event_id in the API); FKs reference it.
    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    unique_event_id: Mapped[str | None] = mapped_column(String(6), nullable=True)
    camera_id: Mapped[int] = mapped_column(ForeignKey("cameras.id"), nullable=False, index=True)
    location_id: Mapped[int | None] = mapped_column(ForeignKey("locations.id"), nullable=True, index=True)
    usecase_id: Mapped[int | None] = mapped_column(ForeignKey("usecases.id"), nullable=True, index=True)
    # `metadata` is reserved on SQLAlchemy declarative classes, so the Python
    # attribute is `event_metadata` mapped to the actual column named "metadata".
    event_metadata: Mapped[str | None] = mapped_column("metadata", Text, nullable=True)
    # Legacy column kept for backward compatibility; new path is evidence_storage_path.
    evidence_url: Mapped[str | None] = mapped_column(String(255), nullable=True)
    evidence_storage_path: Mapped[str | None] = mapped_column(String(400), nullable=True)
    number_of_frames: Mapped[int | None] = mapped_column(Integer, nullable=True)
    frames_range: Mapped[str | None] = mapped_column(String(400), nullable=True)
    event_timestamp: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    created_date_time: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True, server_default=func.now()
    )
    # Legacy timestamp columns, relaxed to nullable (not in the new schema).
    event_start_time: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    event_end_time: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    is_email_sent: Mapped[int] = mapped_column(SmallInteger, nullable=False, server_default="0", default=0)
    is_notification_sent: Mapped[int] = mapped_column(SmallInteger, nullable=False, server_default="0", default=0)
    is_event_read: Mapped[int] = mapped_column(SmallInteger, nullable=False, server_default="0", default=0)
    event_stream_quality: Mapped[int] = mapped_column(SmallInteger, nullable=False, server_default="1", default=1)
    # NOTE: type assumed SmallInteger (the pasted spec lost its type). Adjust if
    # it should be a string/status code.
    notification_status: Mapped[int | None] = mapped_column(SmallInteger, nullable=True)

    camera = relationship("Camera", back_populates="events")
    location = relationship("Location", back_populates="events")
    usecase = relationship("UseCase", back_populates="events")
    # NOTE: the pasted spec also had `comments = relationship("EventComment", ...)`.
    # Omitted here because no EventComment model/table exists yet — adding the
    # relationship without it would break the mapper. Say the word and I'll add
    # an event_comments table + EventComment model.
