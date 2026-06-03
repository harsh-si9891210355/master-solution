from sqlalchemy import Boolean, String
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    pass


class Camera(Base):
    """Read-only mirror of the backend cameras table — only the fields we need."""

    __tablename__ = "cameras"

    id:       Mapped[int]       = mapped_column(primary_key=True)
    rtsp_url: Mapped[str | None] = mapped_column("rtspurl", String(255), nullable=True)
    status:   Mapped[bool]      = mapped_column(Boolean, default=True, nullable=False)
