from datetime import datetime

from sqlalchemy import BigInteger, Boolean, DateTime, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.db.db_connection import Base


class EscalationRule(Base):
    """A named escalation policy. When an alert it matches is not acknowledged
    within a step's wait window, the notification-service escalates to the
    step's role over the step's channels."""

    __tablename__ = "escalation_rules"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    alias_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    # null usecase_id = applies to any use-case.
    usecase_id: Mapped[int | None] = mapped_column(ForeignKey("usecases.id"), nullable=True, index=True)
    event_type: Mapped[str | None] = mapped_column(String(255), nullable=True)
    # null severity_filter = applies to any severity.
    severity_filter: Mapped[str | None] = mapped_column(String(20), nullable=True)
    enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="true")
    created_by: Mapped[int | None] = mapped_column(BigInteger, ForeignKey("users.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True, server_default=func.now(), onupdate=func.now()
    )

    usecase = relationship("UseCase", foreign_keys=[usecase_id])
    steps = relationship(
        "EscalationStep", back_populates="rule", cascade="all, delete-orphan",
        order_by="EscalationStep.step_order",
    )


class EscalationStep(Base):
    __tablename__ = "escalation_steps"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    rule_id: Mapped[int] = mapped_column(ForeignKey("escalation_rules.id"), nullable=False, index=True)
    step_order: Mapped[int] = mapped_column(Integer, nullable=False)
    wait_seconds: Mapped[int] = mapped_column(Integer, nullable=False, server_default="60")
    escalate_to_role_id: Mapped[int | None] = mapped_column(
        ForeignKey("roles.id"), nullable=True, index=True
    )
    # Comma-separated channels for this step, e.g. "IN_APP,EMAIL".
    channels: Mapped[str] = mapped_column(String(255), nullable=False, server_default="IN_APP")

    rule = relationship("EscalationRule", back_populates="steps")
    escalate_to_role = relationship("Role", foreign_keys=[escalate_to_role_id])
