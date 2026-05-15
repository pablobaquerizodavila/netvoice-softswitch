from datetime import datetime, timedelta, timezone
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status, Security
from fastapi.security import OAuth2PasswordBearer, APIKeyHeader
from sqlalchemy.orm import Session
from .database_nv import get_db_nv
from .models_nv import UserNV, Partner
import os
import secrets
import hashlib

SECRET_KEY         = os.getenv("JWT_SECRET_KEY", "netvoice-secret-key-cambiar-produccion")
ALGORITHM          = "HS256"
TOKEN_EXPIRE_HOURS = 8

pwd_context   = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/v1/auth/login", auto_error=False)
api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)


# ─── Utilidades de password ───────────────────────────────────
def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)

def hash_password(plain: str) -> str:
    return pwd_context.hash(plain)


# ─── Generación de credenciales seguras ──────────────────────
def generate_sip_user() -> str:
    """UUID corto de 12 chars para usuario SIP"""
    return secrets.token_hex(6)

def generate_sip_password() -> str:
    """Password SIP de 24 chars alfanumérico + símbolos"""
    alphabet = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$%&*"
    return "".join(secrets.choice(alphabet) for _ in range(24))

def generate_api_key() -> str:
    """API key de 64 chars para partners"""
    return secrets.token_hex(32)

def hash_api_key(api_key: str) -> str:
    """SHA-256 del api_key para almacenamiento"""
    return hashlib.sha256(api_key.encode()).hexdigest()


# ─── JWT ─────────────────────────────────────────────────────
def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    payload = data.copy()
    expire  = datetime.now(timezone.utc) + (expires_delta or timedelta(hours=TOKEN_EXPIRE_HOURS))
    payload["exp"] = expire
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


# ─── Dependencias de autenticación ───────────────────────────
def get_current_user_nv(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db_nv)
) -> UserNV:
    exc = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Token inválido o expirado",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if not token:
        raise exc
    try:
        payload  = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if not user_id:
            raise exc
    except JWTError:
        raise exc
    user = db.query(UserNV).filter(UserNV.id == user_id).first()
    if not user or user.status != "active":
        raise exc
    return user


def get_current_partner(
    api_key: str = Security(api_key_header),
    db: Session = Depends(get_db_nv)
) -> Partner:
    exc = HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="API key inválida")
    if not api_key:
        raise exc
    hashed = hash_api_key(api_key)
    partner = db.query(Partner).filter(
        Partner.api_key == hashed,
        Partner.status == "active"
    ).first()
    if not partner:
        raise exc
    return partner


# ─── Guards de rol ────────────────────────────────────────────
def require_roles(*roles):
    def checker(current_user: UserNV = Depends(get_current_user_nv)) -> UserNV:
        if current_user.role not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Se requiere uno de los roles: {', '.join(roles)}"
            )
        return current_user
    return checker

require_admin_nv   = require_roles("admin")
require_agent_nv   = require_roles("admin", "agent")
require_partner_nv = require_roles("admin", "partner")
