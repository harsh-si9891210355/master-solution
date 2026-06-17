from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.db.db_connection import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    first_name: Mapped[str] = mapped_column(String(255), nullable=False)
    last_name: Mapped[str] = mapped_column(String(255), nullable=False)
    mobile_number: Mapped[str | None] = mapped_column(String(20), nullable=True)
    role_id: Mapped[int] = mapped_column(ForeignKey("roles.id"), nullable=False, index=True)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    status: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    # False until the user finishes the first-login profile step. Existing rows
    # default to True (server_default) so current users aren't re-onboarded.
    profile_completed: Mapped[bool] = mapped_column(
        Boolean, default=True, server_default="true", nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    role = relationship("Role", back_populates="users")
    cameras = relationship("Camera", back_populates="user")
    tokens = relationship("UsersToken", back_populates="user", cascade="all, delete-orphan")
    incidents = relationship("Incident", back_populates="user", cascade="all, delete-orphan")
    incidentcomments = relationship("IncidentComment", back_populates="user", cascade="all, delete-orphan")
