from sqlalchemy import Column, String, Enum, DateTime, Text
from sqlalchemy.sql import func
from .database_nv import BaseNV

class UserNV(BaseNV):
    __tablename__ = "users"
    id           = Column(String(36), primary_key=True)
    partner_id   = Column(String(36), nullable=True)
    email        = Column(String(180), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    role         = Column(Enum("admin","agent","partner","client"), nullable=False)
    status       = Column(Enum("active","inactive","suspended"), default="active")
    created_at   = Column(DateTime, server_default=func.now())
    updated_at   = Column(DateTime, server_default=func.now(), onupdate=func.now())

class Partner(BaseNV):
    __tablename__ = "partners"
    id          = Column(String(36), primary_key=True)
    name        = Column(String(120), nullable=False)
    api_key     = Column(String(64), unique=True, nullable=False)
    webhook_url = Column(String(500), nullable=True)
    status      = Column(Enum("active","suspended","deleted"), default="active")
    created_at  = Column(DateTime, server_default=func.now())
    updated_at  = Column(DateTime, server_default=func.now(), onupdate=func.now())
