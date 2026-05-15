from fastapi import APIRouter, Depends, HTTPException, status, Request, BackgroundTasks
from sqlalchemy.orm import Session
from sqlalchemy import text
from pydantic import BaseModel, EmailStr
from typing import Optional
import uuid, secrets, re

from app.database_nv import get_db_nv
from app.models_nv import UserNV
from app.auth_nv import get_current_user_nv, require_roles, hash_password

router = APIRouter(prefix="/v1/onboarding", tags=["onboarding"])


# ─── Schemas ─────────────────────────────────────────────────
class RegisterRequest(BaseModel):
    name: str
    ruc: Optional[str] = None
    email: str
    password: str
    phone: Optional[str] = None

class VerifyEmailRequest(BaseModel):
    token: str

class SelectPlanRequest(BaseModel):
    client_id: str
    plan_id: str

class RegisterByAgentRequest(BaseModel):
    name: str
    ruc: Optional[str] = None
    email: str
    phone: Optional[str] = None
    plan_id: Optional[str] = None
    observations: Optional[str] = None

class RegisterByAPIRequest(BaseModel):
    name: str
    ruc: Optional[str] = None
    email: str
    phone: Optional[str] = None
    plan_id: Optional[str] = None
    acceptance_token: Optional[str] = None


# ─── Utilidades ──────────────────────────────────────────────
def _validate_ruc(ruc: str) -> bool:
    if not ruc:
        return True
    return bool(re.match(r'^\d{10,13}$', ruc.strip()))

def _validate_email(email: str) -> bool:
    return bool(re.match(r'^[^@]+@[^@]+\.[^@]+$', email.strip()))

def _generate_verify_token() -> str:
    return secrets.token_urlsafe(32)

def _send_verification_email(email: str, token: str, name: str):
    """Placeholder — integrar con SMTP o SendGrid"""
    import logging
    logging.getLogger("netvoice.email").info(
        f"VERIFY EMAIL → {email} | token: {token[:8]}..."
    )


# ─── CANAL 1: Self-service ───────────────────────────────────
@router.post("/register", status_code=201)
def register_client(
    data: RegisterRequest,
    request: Request,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db_nv)
):
    """Registro self-service — el cliente se registra por su cuenta"""

    # Validaciones
    if not _validate_email(data.email):
        raise HTTPException(400, "Email inválido")
    if data.ruc and not _validate_ruc(data.ruc):
        raise HTTPException(400, "RUC/Cédula inválido — debe tener 10 a 13 dígitos")
    if len(data.password) < 8:
        raise HTTPException(400, "La contraseña debe tener al menos 8 caracteres")

    # Verificar duplicados
    exists = db.execute(
        text("SELECT id FROM clients WHERE email = :email"), {"email": data.email}
    ).fetchone()
    if exists:
        raise HTTPException(400, "Ya existe una cuenta con ese email")

    if data.ruc:
        ruc_exists = db.execute(
            text("SELECT id FROM clients WHERE ruc = :ruc"), {"ruc": data.ruc}
        ).fetchone()
        if ruc_exists:
            raise HTTPException(400, "Ya existe una cuenta con ese RUC/Cédula")

    # Crear cliente
    client_id    = str(uuid.uuid4())
    verify_token = _generate_verify_token()

    db.execute(text("""
        INSERT INTO clients (id, name, ruc, email, phone, status, origin,
                             email_verified, email_verify_token)
        VALUES (:id, :name, :ruc, :email, :phone, 'pending', 'self_service', 0, :token)
    """), {
        "id": client_id, "name": data.name, "ruc": data.ruc,
        "email": data.email, "phone": data.phone, "token": verify_token
    })

    # Crear usuario asociado
    user_id = str(uuid.uuid4())
    db.execute(text("""
        INSERT INTO users (id, email, password_hash, role, status)
        VALUES (:id, :email, :hash, 'client', 'inactive')
    """), {"id": user_id, "email": data.email, "hash": hash_password(data.password)})

    db.commit()

    # Enviar email en background
    background_tasks.add_task(_send_verification_email, data.email, verify_token, data.name)

    return {
        "status": "ok",
        "client_id": client_id,
        "message": "Cuenta creada. Revisa tu email para verificar tu dirección.",
        "next_step": "verify_email"
    }


@router.post("/verify-email")
def verify_email(data: VerifyEmailRequest, db: Session = Depends(get_db_nv)):
    """Verificar email con token recibido"""

    client = db.execute(
        text("SELECT id, email, name FROM clients WHERE email_verify_token = :token AND status = 'pending'"),
        {"token": data.token}
    ).fetchone()

    if not client:
        raise HTTPException(400, "Token inválido o ya utilizado")

    db.execute(text("""
        UPDATE clients SET email_verified = 1, email_verify_token = NULL
        WHERE id = :id
    """), {"id": client.id})

    db.execute(text("""
        UPDATE users SET status = 'active' WHERE email = :email
    """), {"email": client.email})

    db.commit()

    return {
        "status": "ok",
        "client_id": client.id,
        "message": "Email verificado correctamente",
        "next_step": "select_plan"
    }


@router.get("/plans")
def list_plans(db: Session = Depends(get_db_nv)):
    """Planes disponibles para selección"""
    plans = db.execute(
        text("SELECT id, name, description, plan_type, monthly_fee, included_minutes, max_channels FROM plans WHERE status = 'active' ORDER BY monthly_fee")
    ).fetchall()
    return {"data": [dict(r._mapping) for r in plans]}


@router.post("/select-plan")
def select_plan(data: SelectPlanRequest, db: Session = Depends(get_db_nv)):
    """Asignar plan al cliente tras verificar email"""

    client = db.execute(
        text("SELECT id, email_verified, status FROM clients WHERE id = :id"),
        {"id": data.client_id}
    ).fetchone()

    if not client:
        raise HTTPException(404, "Cliente no encontrado")
    if not client.email_verified:
        raise HTTPException(400, "Debes verificar tu email antes de seleccionar un plan")

    plan = db.execute(
        text("SELECT id, name, plan_type FROM plans WHERE id = :id AND status = 'active'"),
        {"id": data.plan_id}
    ).fetchone()
    if not plan:
        raise HTTPException(404, "Plan no encontrado o inactivo")

    db.execute(text("""
        UPDATE clients SET plan_id = :plan_id, plan_type = :plan_type WHERE id = :id
    """), {"plan_id": data.plan_id, "plan_type": plan.plan_type, "id": data.client_id})
    db.commit()

    return {
        "status": "ok",
        "client_id": data.client_id,
        "plan_id": data.plan_id,
        "plan_name": plan.name,
        "message": f"Plan {plan.name} seleccionado",
        "next_step": "sign_contract"
    }


# ─── CANAL 2: Agente SAC ─────────────────────────────────────
@router.post("/agent/register", status_code=201,
             dependencies=[Depends(require_roles("admin", "agent"))])
def agent_register_client(
    data: RegisterByAgentRequest,
    request: Request,
    current_user: UserNV = Depends(get_current_user_nv),
    db: Session = Depends(get_db_nv)
):
    """Registro asistido por agente SAC"""

    if not _validate_email(data.email):
        raise HTTPException(400, "Email inválido")

    exists = db.execute(
        text("SELECT id FROM clients WHERE email = :email"), {"email": data.email}
    ).fetchone()
    if exists:
        raise HTTPException(400, "Ya existe una cuenta con ese email")

    client_id = str(uuid.uuid4())
    db.execute(text("""
        INSERT INTO clients (id, name, ruc, email, phone, plan_id, status,
                             origin, email_verified, created_by_user)
        VALUES (:id, :name, :ruc, :email, :phone, :plan_id, 'pending',
                'agent', 1, :created_by)
    """), {
        "id": client_id, "name": data.name, "ruc": data.ruc,
        "email": data.email, "phone": data.phone,
        "plan_id": data.plan_id, "created_by": current_user.id
    })
    db.commit()

    return {
        "status": "ok",
        "client_id": client_id,
        "created_by": current_user.email,
        "message": f"Cliente {data.name} creado por agente",
        "next_step": "sign_contract"
    }


# ─── CANAL 3: API Partner ────────────────────────────────────
@router.post("/api/register", status_code=201)
def api_register_client(
    data: RegisterByAPIRequest,
    request: Request,
    db: Session = Depends(get_db_nv)
):
    """Registro via API para partners/integradores"""

    api_key = request.headers.get("X-API-Key")
    if not api_key:
        raise HTTPException(401, "Se requiere X-API-Key")

    from app.auth_nv import hash_api_key
    hashed = hash_api_key(api_key)
    partner = db.execute(
        text("SELECT id, name FROM partners WHERE api_key = :key AND status = 'active'"),
        {"key": hashed}
    ).fetchone()
    if not partner:
        raise HTTPException(401, "API key inválida o partner inactivo")

    if not _validate_email(data.email):
        raise HTTPException(400, "Email inválido")

    exists = db.execute(
        text("SELECT id FROM clients WHERE email = :email"), {"email": data.email}
    ).fetchone()
    if exists:
        raise HTTPException(400, "Ya existe una cuenta con ese email")

    client_id = str(uuid.uuid4())
    db.execute(text("""
        INSERT INTO clients (id, name, ruc, email, phone, plan_id, status,
                             origin, email_verified, partner_id)
        VALUES (:id, :name, :ruc, :email, :phone, :plan_id, 'pending',
                'api', 1, :partner_id)
    """), {
        "id": client_id, "name": data.name, "ruc": data.ruc,
        "email": data.email, "phone": data.phone,
        "plan_id": data.plan_id, "partner_id": partner.id
    })
    db.commit()

    return {
        "status": "created",
        "client_id": client_id,
        "partner": partner.name,
        "message": f"Cliente {data.name} registrado via API",
        "next_step": "sign_contract"
    }


# ─── STATUS del proceso ──────────────────────────────────────
@router.get("/status/{client_id}")
def onboarding_status(client_id: str, db: Session = Depends(get_db_nv)):
    """Estado del proceso de onboarding de un cliente"""

    client = db.execute(text("""
        SELECT c.id, c.name, c.email, c.status, c.origin,
               c.email_verified, c.plan_id, c.partner_id,
               p.name as plan_name,
               ct.signed_at as contract_signed,
               py.status as payment_status,
               sc.sip_user
        FROM clients c
        LEFT JOIN plans p       ON p.id = c.plan_id
        LEFT JOIN contracts ct  ON ct.client_id = c.id
        LEFT JOIN payments py   ON py.client_id = c.id AND py.status = 'approved'
        LEFT JOIN sip_credentials sc ON sc.client_id = c.id
        WHERE c.id = :id
    """), {"id": client_id}).fetchone()

    if not client:
        raise HTTPException(404, "Cliente no encontrado")

    r = dict(client._mapping)

    steps = {
        "registered":        True,
        "email_verified":    bool(r["email_verified"]),
        "plan_selected":     bool(r["plan_id"]),
        "contract_signed":   bool(r["contract_signed"]),
        "payment_approved":  bool(r["payment_status"]),
        "line_activated":    bool(r["sip_user"])
    }

    completed = sum(steps.values())
    next_step = next((k for k, v in steps.items() if not v), "completed")

    return {
        "client_id":   client_id,
        "name":        r["name"],
        "status":      r["status"],
        "origin":      r["origin"],
        "plan":        r["plan_name"],
        "steps":       steps,
        "progress":    f"{completed}/{len(steps)}",
        "next_step":   next_step
    }
