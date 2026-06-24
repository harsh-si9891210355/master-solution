from datetime import datetime

from sqlalchemy import BigInteger, DateTime, Enum, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.db.db_connection import Base


# Severity, category and lifecycle status are stored as named Postgres enums,
# mirroring the style used by the Incident model. The notification-service
# writes alert rows with these exact string values.
SEVERITY_VALUES = ("LOW", "MEDIUM", "HIGH", "CRITICAL")
CATEGORY_VALUES = ("SAFETY_VIOLATION", "SECURITY", "INTRUSION", "PPE", "CROWD", "OTHER")
STATUS_VALUES = ("NEW", "ACK", "INVESTIGATING", "INCIDENT", "RESOLVED", "CLOSED")


class Alert(Base):
    __tablename__ = "alerts"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    event_id: Mapped[int | None] = mapped_column(ForeignKey("events.id"), nullable=True, index=True)
    camera_id: Mapped[int] = mapped_column(ForeignKey("cameras.id"), nullable=False, index=True)
    location_id: Mapped[int] = mapped_column(ForeignKey("locations.id"), nullable=False, index=True)
    usecase_id: Mapped[int] = mapped_column(ForeignKey("usecases.id"), nullable=False, index=True)

    title: Mapped[str] = mapped_column(String(255), nullable=False)
    severity: Mapped[str] = mapped_column(
        Enum(*SEVERITY_VALUES, name="alert_severity_enum"),
        nullable=False,
        server_default="MEDIUM",
        index=True,
    )
    category: Mapped[str] = mapped_column(
        Enum(*CATEGORY_VALUES, name="alert_category_enum"),
        nullable=False,
        server_default="OTHER",
        index=True,
    )
    status: Mapped[str] = mapped_column(
        Enum(*STATUS_VALUES, name="alert_status_enum"),
        nullable=False,
        server_default="NEW",
        index=True,
    )

    evidence_url: Mapped[str | None] = mapped_column(String(512), nullable=True)
    event_start_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    event_end_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    occurrence_count: Mapped[int] = mapped_column(Integer, nullable=False, server_default="1")

    acknowledged_by: Mapped[int | None] = mapped_column(
        BigInteger, ForeignKey("users.id"), nullable=True, index=True
    )
    acknowledged_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    incident_id: Mapped[int | None] = mapped_column(ForeignKey("incident.id"), nullable=True, index=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True, server_default=func.now(), onupdate=func.now()
    )

    # One-directional relationships — no back_populates so existing models stay untouched.
    camera = relationship("Camera", foreign_keys=[camera_id])
    location = relationship("Location", foreign_keys=[location_id])
    usecase = relationship("UseCase", foreign_keys=[usecase_id])
    acknowledger = relationship("User", foreign_keys=[acknowledged_by])
    incident = relationship("Incident", foreign_keys=[incident_id])
    timeline = relationship(
        "AlertTimeline", back_populates="alert", cascade="all, delete-orphan",
        order_by="AlertTimeline.created_at",
    )
    deliveries = relationship(
        "NotificationDelivery", back_populates="alert", cascade="all, delete-orphan"
    )


class AlertTimeline(Base):
    """Append-only lifecycle log for an alert (created → ack → investigating → …)."""

    __tablename__ = "alert_timeline"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    alert_id: Mapped[int] = mapped_column(ForeignKey("alerts.id"), nullable=False, index=True)
    action: Mapped[str] = mapped_column(String(50), nullable=False)
    from_status: Mapped[str | None] = mapped_column(String(50), nullable=True)
    to_status: Mapped[str | None] = mapped_column(String(50), nullable=True)
    note: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    actor_id: Mapped[int | None] = mapped_column(BigInteger, ForeignKey("users.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    alert = relationship("Alert", back_populates="timeline")
    actor = relationship("User", foreign_keys=[actor_id])
