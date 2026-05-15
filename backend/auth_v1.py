from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from sqlalchemy import text
from pydantic import BaseModel, EmailStr
from typing import Optional
from app.database_nv import get_db_nv
from app.models_nv import UserNV
from app.auth_nv import (
    verify_password, hash_password, create_access_token,
    get_current_user_nv, require_roles
)
import uuid

router = APIRouter(prefix="/v1/auth", tags=["auth-v1"])


class LoginResponse(BaseModel):
    access_token: str
    token_type: str
    role: str
    user_id: str
    email: str

class PasswordChange(BaseModel):
    current_password: str
    new_password: str

class UserCreate(BaseModel):
    email: str
    password: str
    role: str = "agent"
    partner_id: Optional[str] = None


@router.post("/login", response_model=LoginResponse)
def login(form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db_nv)):
    user = db.query(UserNV).filter(UserNV.email == form.username).first()
    if not user or not verify_password(form.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales incorrectas"
        )
    if user.status != "active":
        raise HTTPException(status_code=403, detail="Usuario inactivo o suspendido")

    token = create_access_token({"sub": user.id, "role": user.role, "email": user.email})
    return {
        "access_token": token,
        "token_type": "bearer",
        "role": user.role,
        "user_id": user.id,
        "email": user.email
    }


@router.get("/me")
def me(current_user: UserNV = Depends(get_current_user_nv)):
    return {
        "user_id":    current_user.id,
        "email":      current_user.email,
        "role":       current_user.role,
        "partner_id": current_user.partner_id,
        "status":     current_user.status
    }


@router.post("/change-password")
def change_password(
    data: PasswordChange,
    current_user: UserNV = Depends(get_current_user_nv),
    db: Session = Depends(get_db_nv)
):
    if not verify_password(data.current_password, current_user.password_hash):
        raise HTTPException(status_code=400, detail="Password actual incorrecta")
    if len(data.new_password) < 10:
        raise HTTPException(status_code=400, detail="La nueva password debe tener al menos 10 caracteres")
    db.execute(
        text("UPDATE users SET password_hash = :h WHERE id = :id"),
        {"h": hash_password(data.new_password), "id": current_user.id}
    )
    db.commit()
    return {"status": "ok", "message": "Password actualizada"}


@router.post("/users", dependencies=[Depends(require_roles("admin"))])
def create_user(data: UserCreate, db: Session = Depends(get_db_nv)):
    exists = db.query(UserNV).filter(UserNV.email == data.email).first()
    if exists:
        raise HTTPException(status_code=400, detail="El email ya existe")
    if data.role not in ("admin", "agent", "partner", "client"):
        raise HTTPException(status_code=400, detail="Rol inválido")
    new_user = UserNV(
        id            = str(uuid.uuid4()),
        email         = data.email,
        password_hash = hash_password(data.password),
        role          = data.role,
        partner_id    = data.partner_id,
        status        = "active"
    )
    db.add(new_user)
    db.commit()
    return {"status": "ok", "user_id": new_user.id, "email": new_user.email, "role": new_user.role}


@router.get("/users", dependencies=[Depends(require_roles("admin"))])
def list_users(db: Session = Depends(get_db_nv)):
    users = db.query(UserNV).all()
    return {"total": len(users), "data": [
        {"id": u.id, "email": u.email, "role": u.role, "status": u.status, "partner_id": u.partner_id}
        for u in users
    ]}
