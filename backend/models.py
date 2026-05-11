from sqlalchemy import Column, Integer, String, Enum, DateTime
from sqlalchemy.sql import func
from .database import Base


class User(Base):
    __tablename__ = "users"

    id            = Column(Integer, primary_key=True, autoincrement=True)
    username      = Column(String(50), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    role          = Column(Enum("admin", "viewer"), nullable=False, default="viewer")
    created_at    = Column(DateTime, server_default=func.now())
