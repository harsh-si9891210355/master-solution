from datetime import datetime

from sqlalchemy import BigInteger, DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.db.db_connection import Base


class IncidentComment(Base):
    __tablename__ = "incident_comments"

    comment_id: Mapped[int] = mapped_column(primary_key=True, index=True)
    incident_id: Mapped[int] = mapped_column(ForeignKey("incident.id"), nullable=False, index=True)
    user_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("users.id"), nullable=False, index=True)
    comment_text: Mapped[str] = mapped_column(Text, nullable=False)
    file_attachment: Mapped[str | None] = mapped_column(String(255), nullable=True)
    feedback: Mapped[int | None] = mapped_column(Integer, nullable=True)
    created_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        server_default=func.now(),
    )

    incident = relationship("Incident", back_populates="comments")
    user = relationship("User", back_populates="incidentcomments")
