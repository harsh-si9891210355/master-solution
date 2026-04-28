from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.db.db_connection import Base


class Location(Base):
    __tablename__ = "locations"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    name_en: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    name_es: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    name_fr: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)

    cameras = relationship("Camera", back_populates="location")
    events = relationship("Event", back_populates="location")
