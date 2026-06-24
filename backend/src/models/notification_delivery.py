from datetime import datetime

from sqlalchemy import BigInteger, DateTime, Enum, ForeignKey, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.db.db_connection import Base


CHANNEL_VALUES = ("IN_APP", "WEB_PUSH", "EMAIL")
DELIVERY_STATUS_VALUES = ("QUEUED", "SENT", "DELIVERED", "READ", "FAILED", "SUPPRESSED")


class NotificationDelivery(Base):
    """Audit row per (alert × recipient × channel). Idempotency key prevents dupes
    from RabbitMQ at-least-once redelivery."""

    __tablename__ = "notification_deliveries"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    alert_id: Mapped[int] = mapped_column(ForeignKey("alerts.id"), nullable=False, index=True)
    user_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("users.id"), nullable=False, index=True
    )
    channel: Mapped[str] = mapped_column(
        Enum(*CHANNEL_VALUES, name="notification_channel_enum"), nullable=False
    )
    status: Mapped[str] = mapped_column(
        Enum(*DELIVERY_STATUS_VALUES, name="notification_delivery_status_enum"),
        nullable=False,
        server_default="QUEUED",
    )
    suppressed_reason: Mapped[str | None] = mapped_column(String(100), nullable=True)
    error: Mapped[str | None] = mapped_column(Text, nullable=True)
    idempotency_key: Mapped[str] = mapped_column(String(200), nullable=False, unique=True, index=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True, server_default=func.now(), onupdate=func.now()
    )

    alert = relationship("Alert", back_populates="deliveries")
    user = relationship("User", foreign_keys=[user_id])
