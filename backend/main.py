from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.database import get_db
from app.auth import verify_password, create_access_token, get_current_user
from app.models import User

app = FastAPI(title="Netvoice Panel API", version="1.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def root():
    return {"status": "ok", "service": "netvoice-panel", "version": "1.1.0"}

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

@app.get("/cdr")
def get_cdr(limit: int = 50, db: Session = Depends(get_db)):
    result = db.execute(text(f"SELECT * FROM cdr ORDER BY calldate DESC LIMIT {limit}"))
    rows = result.fetchall()
    return {"total": len(rows), "data": [dict(r._mapping) for r in rows]}

@app.get("/extensions")
def get_extensions(db: Session = Depends(get_db)):
    result = db.execute(text("SELECT id, aors, auth, context, allow FROM ps_endpoints"))
    rows = result.fetchall()
    return {"total": len(rows), "data": [dict(r._mapping) for r in rows]}
