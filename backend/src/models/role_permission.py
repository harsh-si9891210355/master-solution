from datetime import datetime

from sqlalchemy import BigInteger, DateTime, ForeignKey, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.db.db_connection import Base


class RolePermission(Base):
    __tablename__ = "role_permissions"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, index=True)

    role_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("roles.id"), nullable=False, index=True)
    resource_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("resources.id"), nullable=False, index=True)
    scope_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("scopes.id"), nullable=False, index=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())
    created_by: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    updated_by: Mapped[int | None] = mapped_column(BigInteger, nullable=True)

    __table_args__ = (
        UniqueConstraint("role_id", "resource_id", "scope_id", name="uq_role_permissions"),
    )

    role = relationship("Role", back_populates="permissions")
    resource = relationship("Resource", back_populates="permissions")
    scope = relationship("Scope", back_populates="permissions")
