from fastapi import APIRouter, Depends, HTTPException, Request, BackgroundTasks
from sqlalchemy.orm import Session
from sqlalchemy import text
from pydantic import BaseModel
from typing import Optional
import uuid, hashlib, secrets, datetime, logging

from app.database_nv import get_db_nv
from app.models_nv import UserNV
from app.auth_nv import get_current_user_nv, require_roles

router = APIRouter(prefix="/v1/contracts", tags=["contracts"])
logger = logging.getLogger("netvoice.contracts")

DOC_VERSION = "v1.0"

CONTRACT_TEMPLATE = """
CONTRATO DE SERVICIO DE TELEFONÍA IP — NETVOICE / LINKOTEL
Versión: {version}

1. PARTES
   Proveedor: Linkotel S.A. — RUC: XXXXXXXXXX
   Cliente:   {client_name} — RUC/Cédula: {client_ruc}
   Email:     {client_email}

2. OBJETO
   El proveedor se compromete a brindar servicio de telefonía IP
   bajo el plan {plan_name} con las condiciones descritas en el mismo.

3. CONDICIONES DE USO
   - El servicio es de uso exclusivo del cliente contratante.
   - Queda prohibido el uso para tráfico de terminación masiva (SIM Boxing).
   - El cliente es responsable del uso adecuado de sus credenciales SIP.

4. FACTURACIÓN
   - Plan: {plan_name}
   - Tarifa mensual: USD {monthly_fee}
   - Minutos incluidos: {included_minutes}

5. VIGENCIA
   El contrato tiene vigencia indefinida y puede ser rescindido
   por cualquiera de las partes con 30 días de anticipación.

6. ACEPTACIÓN
   Al aceptar este contrato el cliente declara haber leído,
   entendido y aceptado todas las condiciones aquí establecidas.

   Fecha: {signed_at}
   IP:    {ip_address}
"""


# ─── Schemas ─────────────────────────────────────────────────
class RequestOTPRequest(BaseModel):
    client_id: str
    channel: str = "email"

class SignContractRequest(BaseModel):
    client_id: str
    otp_code: str

class SignContractAPIRequest(BaseModel):
    client_id: str
    acceptance_token: str


# ─── OTP en memoria (producción: Redis) ──────────────────────
_otp_store: dict = {}

def _generate_otp() -> str:
    return str(secrets.randbelow(900000) + 100000)

def _store_otp(client_id: str, otp: str):
    expires = datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(minutes=10)
    _otp_store[client_id] = {"otp": otp, "expires": expires}

def _verify_otp(client_id: str, otp: str) -> bool:
    entry = _otp_store.get(client_id)
    if not entry:
        return False
    if datetime.datetime.now(datetime.timezone.utc) > entry["expires"]:
        del _otp_store[client_id]
        return False
    if entry["otp"] != otp:
        return False
    del _otp_store[client_id]
    return True

def _send_otp(email: str, otp: str, name: str):
    import smtplib, os
    from email.mime.multipart import MIMEMultipart
    from email.mime.text import MIMEText

    smtp_host = os.getenv("SMTP_HOST", "")
    smtp_port = int(os.getenv("SMTP_PORT", "587"))
    smtp_user = os.getenv("SMTP_USER", "")
    smtp_pass = os.getenv("SMTP_PASSWORD", "")
    smtp_from = os.getenv("SMTP_FROM", "noreply@linkotel.com")
    smtp_name = os.getenv("SMTP_FROM_NAME", "Netvoice")

    # Siempre loguear para debug
    logger.info(f"OTP → {email} | code: {otp} | name: {name}")

    if not smtp_host or not smtp_user or not smtp_pass:
        logger.warning("SMTP no configurado — OTP solo en log")
        return

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = f"Tu codigo de verificacion Netvoice: {otp}"
        msg["From"]    = f"{smtp_name} <{smtp_from}>"
        msg["To"]      = email

        html = f"""
        <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px;">
          <div style="background:#0b1120;border-radius:12px;padding:28px;text-align:center;">
            <h2 style="color:#1a8cff;margin:0 0 8px">Netvoice</h2>
            <p style="color:#8b97aa;margin:0 0 24px;font-size:13px">Carrier Platform</p>
            <p style="color:#e8edf5;font-size:15px;margin:0 0 20px">Hola <strong>{name}</strong>,</p>
            <p style="color:#8b97aa;font-size:13px;margin:0 0 24px">
              Tu codigo de verificacion para firmar el contrato de servicio es:
            </p>
            <div style="background:#162035;border-radius:10px;padding:20px;margin:0 0 24px;">
              <span style="font-family:monospace;font-size:36px;font-weight:700;letter-spacing:8px;color:#00c98d;">
                {otp}
              </span>
            </div>
            <p style="color:#4a5568;font-size:12px;margin:0">
              Este codigo expira en 10 minutos.<br>
              Si no solicitaste esto, ignora este mensaje.
            </p>
          </div>
          <p style="color:#4a5568;font-size:11px;text-align:center;margin-top:16px;">
            Linkotel S.A. — Servicio de Telefonia IP
          </p>
        </div>
        """

        txt = f"Tu codigo OTP Netvoice: {otp}\n\nEste codigo expira en 10 minutos."
        msg.attach(MIMEText(txt, "plain"))
        msg.attach(MIMEText(html, "html"))

        with smtplib.SMTP(smtp_host, smtp_port) as server:
            server.ehlo()
            server.starttls()
            server.login(smtp_user, smtp_pass)
            server.sendmail(smtp_from, email, msg.as_string())

        logger.info(f"OTP enviado por SMTP a {email}")

    except Exception as e:
        logger.error(f"Error SMTP al enviar OTP a {email}: {e}")


# ─── Generar contenido del contrato ──────────────────────────
def _build_contract_text(client: dict, plan: dict, ip: str) -> str:
    return CONTRACT_TEMPLATE.format(
        version          = DOC_VERSION,
        client_name      = client["name"],
        client_ruc       = client["ruc"] or "N/A",
        client_email     = client["email"],
        plan_name        = plan["name"] if plan else "Sin plan",
        monthly_fee      = plan["monthly_fee"] if plan else "0.00",
        included_minutes = plan["included_minutes"] if plan else 0,
        signed_at        = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        ip_address       = ip
    )

def _hash_contract(text: str) -> str:
    return hashlib.sha256(text.encode()).hexdigest()


# ─── ENDPOINTS ───────────────────────────────────────────────

@router.get("/preview/{client_id}")
def preview_contract(client_id: str, request: Request, db: Session = Depends(get_db_nv)):
    """Ver el contrato antes de firmar"""
    row = db.execute(text("""
        SELECT c.id, c.name, c.ruc, c.email, c.email_verified, c.plan_id,
               p.name as plan_name, p.monthly_fee, p.included_minutes
        FROM clients c
        LEFT JOIN plans p ON p.id = c.plan_id
        WHERE c.id = :id
    """), {"id": client_id}).fetchone()

    if not row:
        raise HTTPException(404, "Cliente no encontrado")
    if not row.email_verified:
        raise HTTPException(400, "Debes verificar tu email antes de ver el contrato")
    if not row.plan_id:
        raise HTTPException(400, "Debes seleccionar un plan antes de ver el contrato")

    client = dict(row._mapping)
    plan   = {"name": row.plan_name, "monthly_fee": row.monthly_fee,
               "included_minutes": row.included_minutes}

    ip = request.headers.get("X-Real-IP") or \
         (request.client.host if request.client else "unknown")

    contract_text = _build_contract_text(client, plan, ip)
    doc_hash      = _hash_contract(contract_text)

    return {
        "client_id":    client_id,
        "doc_version":  DOC_VERSION,
        "doc_hash":     doc_hash,
        "contract":     contract_text,
        "plan":         row.plan_name
    }


@router.post("/request-otp")
def request_otp(
    data: RequestOTPRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db_nv)
):
    """Solicitar OTP para firma digital"""
    client = db.execute(
        text("SELECT id, name, email, email_verified, plan_id FROM clients WHERE id = :id"),
        {"id": data.client_id}
    ).fetchone()

    if not client:
        raise HTTPException(404, "Cliente no encontrado")
    if not client.email_verified:
        raise HTTPException(400, "Email no verificado")
    if not client.plan_id:
        raise HTTPException(400, "Plan no seleccionado")

    already = db.execute(
        text("SELECT id FROM contracts WHERE client_id = :id"),
        {"id": data.client_id}
    ).fetchone()
    if already:
        raise HTTPException(400, "El contrato ya fue firmado")

    otp = _generate_otp()
    _store_otp(data.client_id, otp)
    background_tasks.add_task(_send_otp, client.email, otp, client.name)

    return {
        "status": "ok",
        "message": f"OTP enviado a {client.email}",
        "expires_in": "10 minutos"
    }


@router.post("/sign")
def sign_contract(
    data: SignContractRequest,
    request: Request,
    db: Session = Depends(get_db_nv)
):
    """Firmar contrato con OTP — canal self-service o agente"""

    if not _verify_otp(data.client_id, data.otp_code):
        raise HTTPException(400, "OTP inválido o expirado")

    row = db.execute(text("""
        SELECT c.id, c.name, c.ruc, c.email, c.plan_id,
               p.name as plan_name, p.monthly_fee, p.included_minutes
        FROM clients c
        LEFT JOIN plans p ON p.id = c.plan_id
        WHERE c.id = :id
    """), {"id": data.client_id}).fetchone()

    if not row:
        raise HTTPException(404, "Cliente no encontrado")

    already = db.execute(
        text("SELECT id FROM contracts WHERE client_id = :id"),
        {"id": data.client_id}
    ).fetchone()
    if already:
        raise HTTPException(400, "El contrato ya fue firmado")

    ip = request.headers.get("X-Real-IP") or \
         request.headers.get("X-Forwarded-For", "").split(",")[0].strip() or \
         (request.client.host if request.client else "unknown")

    client  = dict(row._mapping)
    plan    = {"name": row.plan_name, "monthly_fee": row.monthly_fee,
                "included_minutes": row.included_minutes}

    contract_text = _build_contract_text(client, plan, ip)
    doc_hash      = _hash_contract(contract_text)
    contract_id   = str(uuid.uuid4())
    signed_at     = datetime.datetime.now()

    db.execute(text("""
        INSERT INTO contracts (id, client_id, doc_version, doc_hash,
                               signed_via, ip_address, signed_at)
        VALUES (:id, :client_id, :version, :hash, 'otp_email', :ip, :signed_at)
    """), {
        "id": contract_id, "client_id": data.client_id,
        "version": DOC_VERSION, "hash": doc_hash,
        "ip": ip, "signed_at": signed_at
    })

    db.execute(text("""
        UPDATE clients SET status = 'pending' WHERE id = :id
    """), {"id": data.client_id})

    db.commit()

    logger.info(f"CONTRACT SIGNED | client:{data.client_id} | hash:{doc_hash[:16]}... | ip:{ip}")

    return {
        "status": "ok",
        "contract_id": contract_id,
        "doc_hash":    doc_hash,
        "signed_at":   signed_at.isoformat(),
        "message":     "Contrato firmado correctamente",
        "next_step":   "payment"
    }


@router.post("/sign-api")
def sign_contract_api(
    data: SignContractAPIRequest,
    request: Request,
    db: Session = Depends(get_db_nv)
):
    """Firmar contrato via API — el partner envía acceptance_token"""

    api_key = request.headers.get("X-API-Key")
    if not api_key:
        raise HTTPException(401, "Se requiere X-API-Key")

    from app.auth_nv import hash_api_key
    partner = db.execute(
        text("SELECT id, name FROM partners WHERE api_key = :key AND status = 'active'"),
        {"key": hash_api_key(api_key)}
    ).fetchone()
    if not partner:
        raise HTTPException(401, "API key inválida")

    row = db.execute(text("""
        SELECT c.id, c.name, c.ruc, c.email, c.plan_id, c.partner_id,
               p.name as plan_name, p.monthly_fee, p.included_minutes
        FROM clients c
        LEFT JOIN plans p ON p.id = c.plan_id
        WHERE c.id = :id AND c.partner_id = :partner_id
    """), {"id": data.client_id, "partner_id": partner.id}).fetchone()

    if not row:
        raise HTTPException(404, "Cliente no encontrado o no pertenece a este partner")

    already = db.execute(
        text("SELECT id FROM contracts WHERE client_id = :id"),
        {"id": data.client_id}
    ).fetchone()
    if already:
        raise HTTPException(400, "Contrato ya firmado")

    ip = request.headers.get("X-Real-IP") or \
         (request.client.host if request.client else "unknown")

    client  = dict(row._mapping)
    plan    = {"name": row.plan_name, "monthly_fee": row.monthly_fee,
                "included_minutes": row.included_minutes}

    contract_text = _build_contract_text(client, plan, ip)
    doc_hash      = _hash_contract(contract_text)
    contract_id   = str(uuid.uuid4())
    signed_at     = datetime.datetime.now()

    db.execute(text("""
        INSERT INTO contracts (id, client_id, doc_version, doc_hash,
                               acceptance_token, signed_via, ip_address, signed_at)
        VALUES (:id, :client_id, :version, :hash, :token, 'api_token', :ip, :signed_at)
    """), {
        "id": contract_id, "client_id": data.client_id,
        "version": DOC_VERSION, "hash": doc_hash,
        "token": data.acceptance_token, "ip": ip, "signed_at": signed_at
    })
    db.commit()

    return {
        "status": "ok",
        "contract_id": contract_id,
        "doc_hash":    doc_hash,
        "signed_at":   signed_at.isoformat(),
        "next_step":   "payment"
    }


@router.get("/status/{client_id}")
def contract_status(client_id: str, db: Session = Depends(get_db_nv)):
    """Estado del contrato de un cliente"""
    contract = db.execute(text("""
        SELECT id, doc_version, doc_hash, signed_via, ip_address, signed_at
        FROM contracts WHERE client_id = :id
    """), {"id": client_id}).fetchone()

    if not contract:
        return {"client_id": client_id, "signed": False}

    r = dict(contract._mapping)
    return {
        "client_id":   client_id,
        "signed":      True,
        "contract_id": r["id"],
        "doc_version": r["doc_version"],
        "doc_hash":    r["doc_hash"],
        "signed_via":  r["signed_via"],
        "ip_address":  r["ip_address"],
        "signed_at":   r["signed_at"].isoformat() if r["signed_at"] else None
    }

@router.get("/debug/otp/{client_id}")
def debug_otp(client_id: str):
    """SOLO DESARROLLO — eliminar en producción"""
    entry = _otp_store.get(client_id)
    if not entry:
        return {"otp": None, "message": "No hay OTP activo"}
    return {"otp": entry["otp"], "expires": entry["expires"].isoformat()}
