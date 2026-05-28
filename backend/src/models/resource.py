from datetime import datetime

from sqlalchemy import BigInteger, Boolean, DateTime, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.db.db_connection import Base


class Resource(Base):
    __tablename__ = "resources"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False, unique=True, index=True)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="true")

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())
    created_by: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    updated_by: Mapped[int | None] = mapped_column(BigInteger, nullable=True)

    permissions = relationship("RolePermission", back_populates="resource", cascade="all, delete-orphan")
