from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from pydantic import BaseModel
from . import database, models
from .auth import verify_password, create_access_token, get_current_user, hash_password, require_admin
from .database import get_db
from .models import User

models.Base.metadata.create_all(bind=database.engine)

app = FastAPI(title="Netvoice Panel API", version="1.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://192.168.0.7:3000", "http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Auth ──────────────────────────────────────────────────────────────────────

@app.post("/auth/login")
def login(form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == form.username).first()
    if not user or not verify_password(form.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Credenciales incorrectas")
    token = create_access_token({"sub": user.username, "role": user.role})
    return {"access_token": token, "token_type": "bearer"}


@app.get("/auth/me")
def me(current_user: User = Depends(get_current_user)):
    return {"username": current_user.username, "role": current_user.role}


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str


@app.post("/auth/change-password")
def change_password(
    body: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not verify_password(body.current_password, current_user.password_hash):
        raise HTTPException(status_code=400, detail="Contraseña actual incorrecta")
    current_user.password_hash = hash_password(body.new_password)
    db.commit()
    return {"message": "Contraseña actualizada"}


# ── Endpoints existentes (ahora protegidos) ───────────────────────────────────

@app.get("/")
def status():
    return {"status": "ok", "service": "netvoice-panel", "version": "1.1.0"}


@app.get("/cdr")
def get_cdr(
    limit: int = 50,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    result = db.execute(
        "SELECT calldate, src, dst, duration, billsec, disposition "
        "FROM cdr ORDER BY calldate DESC LIMIT :limit",
        {"limit": limit},
    )
    return [dict(row._mapping) for row in result.fetchall()]


@app.get("/extensions")
def get_extensions(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    result = db.execute(
        "SELECT id, transport, aors, auth, context FROM ps_endpoints"
    )
    return [dict(row._mapping) for row in result.fetchall()]


# ── Gestión de usuarios (solo admin) ─────────────────────────────────────────

class CreateUserRequest(BaseModel):
    username: str
    password: str
    role: str = "viewer"


@app.get("/users", dependencies=[Depends(require_admin)])
def list_users(db: Session = Depends(get_db)):
    users = db.query(User).all()
    return [{"id": u.id, "username": u.username, "role": u.role, "created_at": u.created_at} for u in users]


@app.post("/users", dependencies=[Depends(require_admin)], status_code=201)
def create_user(body: CreateUserRequest, db: Session = Depends(get_db)):
    if db.query(User).filter(User.username == body.username).first():
        raise HTTPException(status_code=409, detail="El usuario ya existe")
    user = User(username=body.username, password_hash=hash_password(body.password), role=body.role)
    db.add(user)
    db.commit()
    db.refresh(user)
    return {"id": user.id, "username": user.username, "role": user.role}


@app.delete("/users/{user_id}", dependencies=[Depends(require_admin)])
def delete_user(user_id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    db.delete(user)
    db.commit()
    return {"message": "Usuario eliminado"}
