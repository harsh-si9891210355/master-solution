from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.db.db_connection import Base


class Event(Base):
    __tablename__ = "events"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    camera_id: Mapped[int] = mapped_column(ForeignKey("cameras.id"), nullable=False, index=True)
    location_id: Mapped[int] = mapped_column(ForeignKey("locations.id"), nullable=False, index=True)
    usecase_id: Mapped[int] = mapped_column(ForeignKey("usecases.id"), nullable=False, index=True)
    evidence_url: Mapped[str | None] = mapped_column(String(255), nullable=True)
    created_date_time: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )
    event_start_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    event_end_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    camera = relationship("Camera", back_populates="events")
    location = relationship("Location", back_populates="events")
    usecase = relationship("UseCase", back_populates="events")
