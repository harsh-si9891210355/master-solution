from datetime import datetime, time

from sqlalchemy import BigInteger, Boolean, DateTime, Enum, ForeignKey, String, Time, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.db.db_connection import Base
from src.models.alert import SEVERITY_VALUES


class NotificationPreference(Base):
    """Per-user delivery preferences. Channels: in-app, web push, email."""

    __tablename__ = "notification_preferences"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("users.id"), nullable=False, unique=True, index=True
    )

    in_app_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="true")
    web_push_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="false")
    email_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="true")

    min_severity: Mapped[str] = mapped_column(
        # Distinct enum type name to avoid a duplicate CREATE TYPE alongside
        # alerts.severity during create_all.
        Enum(*SEVERITY_VALUES, name="preference_min_severity_enum"),
        nullable=False,
        server_default="LOW",
    )

    quiet_hours_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="false")
    quiet_hours_start: Mapped[time | None] = mapped_column(Time, nullable=True)
    quiet_hours_end: Mapped[time | None] = mapped_column(Time, nullable=True)
    quiet_hours_timezone: Mapped[str] = mapped_column(String(64), nullable=False, server_default="UTC")
    override_critical: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="true")

    muted_until: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    sound_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="true")
    sound_name: Mapped[str] = mapped_column(String(64), nullable=False, server_default="default")

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True, server_default=func.now(), onupdate=func.now()
    )

    user = relationship("User", foreign_keys=[user_id])
