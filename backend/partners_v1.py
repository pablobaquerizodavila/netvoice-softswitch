from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from sqlalchemy import text
from pydantic import BaseModel
from typing import Optional
import uuid, logging

from app.database_nv import get_db_nv
from app.models_nv import UserNV, Partner
from app.auth_nv import (
    get_current_user_nv, require_roles,
    generate_api_key, hash_api_key, hash_password
)

router = APIRouter(prefix="/v1/partners", tags=["partners"])
logger = logging.getLogger("netvoice.partners")


class PartnerCreate(BaseModel):
    name: str
    webhook_url: Optional[str] = None
    contact_email: str

class PartnerUpdate(BaseModel):
    name: Optional[str] = None
    webhook_url: Optional[str] = None
    status: Optional[str] = None


@router.post("", status_code=201, dependencies=[Depends(require_roles("admin"))])
def create_partner(data: PartnerCreate, db: Session = Depends(get_db_nv)):
    """Crear nuevo partner — genera API key automáticamente"""

    exists = db.execute(
        text("SELECT id FROM partners WHERE name = :name"), {"name": data.name}
    ).fetchone()
    if exists:
        raise HTTPException(400, "Ya existe un partner con ese nombre")

    raw_key   = generate_api_key()
    hashed    = hash_api_key(raw_key)
    partner_id = str(uuid.uuid4())

    db.execute(text("""
        INSERT INTO partners (id, name, api_key, webhook_url, status)
        VALUES (:id, :name, :key, :webhook, 'active')
    """), {"id": partner_id, "name": data.name, "key": hashed, "webhook": data.webhook_url})

    user_id = str(uuid.uuid4())
    db.execute(text("""
        INSERT INTO users (id, partner_id, email, password_hash, role, status)
        VALUES (:id, :partner_id, :email, :hash, 'partner', 'active')
    """), {
        "id": user_id, "partner_id": partner_id,
        "email": data.contact_email,
        "hash": hash_password(raw_key[:16])
    })

    db.commit()
    logger.info(f"PARTNER CREATED | {data.name} | id:{partner_id}")

    return {
        "status":     "created",
        "partner_id": partner_id,
        "name":       data.name,
        "api_key":    raw_key,
        "warning":    "Guarda esta API key — no se mostrará de nuevo"
    }


@router.get("", dependencies=[Depends(require_roles("admin"))])
def list_partners(db: Session = Depends(get_db_nv)):
    rows = db.execute(text("""
        SELECT p.id, p.name, p.webhook_url, p.status, p.created_at,
               COUNT(c.id) as total_clients
        FROM partners p
        LEFT JOIN clients c ON c.partner_id = p.id
        GROUP BY p.id ORDER BY p.created_at DESC
    """)).fetchall()
    return {"total": len(rows), "data": [dict(r._mapping) for r in rows]}


@router.get("/{partner_id}", dependencies=[Depends(require_roles("admin"))])
def get_partner(partner_id: str, db: Session = Depends(get_db_nv)):
    partner = db.execute(
        text("SELECT id, name, webhook_url, status, created_at FROM partners WHERE id = :id"),
        {"id": partner_id}
    ).fetchone()
    if not partner:
        raise HTTPException(404, "Partner no encontrado")

    clients = db.execute(text("""
        SELECT id, name, email, status, created_at FROM clients
        WHERE partner_id = :id ORDER BY created_at DESC LIMIT 20
    """), {"id": partner_id}).fetchall()

    dids = db.execute(text("""
        SELECT id, number, status FROM did_pool
        WHERE partner_id = :id
    """), {"id": partner_id}).fetchall()

    return {
        **dict(partner._mapping),
        "clients":      [dict(r._mapping) for r in clients],
        "did_pool":     [dict(r._mapping) for r in dids],
        "total_clients": len(clients),
        "total_dids":   len(dids)
    }


@router.patch("/{partner_id}", dependencies=[Depends(require_roles("admin"))])
def update_partner(partner_id: str, data: PartnerUpdate, db: Session = Depends(get_db_nv)):
    fields = {k:v for k,v in data.dict().items() if v is not None}
    if not fields:
        raise HTTPException(400, "Sin campos para actualizar")
    sets = ", ".join([f"{k} = :{k}" for k in fields])
    fields["id"] = partner_id
    db.execute(text(f"UPDATE partners SET {sets} WHERE id = :id"), fields)
    db.commit()
    return {"status": "ok", "message": "Partner actualizado"}


@router.post("/{partner_id}/rotate-key", dependencies=[Depends(require_roles("admin"))])
def rotate_api_key(partner_id: str, db: Session = Depends(get_db_nv)):
    """Rotar API key de un partner"""
    partner = db.execute(
        text("SELECT id, name FROM partners WHERE id = :id"), {"id": partner_id}
    ).fetchone()
    if not partner:
        raise HTTPException(404, "Partner no encontrado")

    raw_key = generate_api_key()
    hashed  = hash_api_key(raw_key)

    db.execute(text("UPDATE partners SET api_key = :key WHERE id = :id"),
               {"key": hashed, "id": partner_id})
    db.commit()

    logger.info(f"API KEY ROTATED | partner:{partner_id}")
    return {
        "status":  "ok",
        "api_key": raw_key,
        "warning": "Nueva API key generada — guárdala, no se mostrará de nuevo"
    }


@router.post("/{partner_id}/did-pool", dependencies=[Depends(require_roles("admin"))])
def assign_did_pool_to_partner(
    partner_id: str,
    data: dict,
    db: Session = Depends(get_db_nv)
):
    """Asignar rango de DIDs a un partner desde el pool global"""
    numbers = data.get("numbers", [])
    if not numbers:
        raise HTTPException(400, "Debes enviar una lista de números")

    updated = db.execute(text("""
        UPDATE did_pool SET partner_id = :partner_id
        WHERE number IN :numbers AND (partner_id IS NULL OR partner_id = :partner_id)
    """), {"partner_id": partner_id, "numbers": tuple(numbers)})

    db.commit()
    return {"status": "ok", "assigned": updated.rowcount}


@router.get("/docs/openapi-info")
def openapi_info():
    """Información de la API pública para partners"""
    return {
        "version":     "v1",
        "base_url":    "/v1",
        "auth":        "X-API-Key header",
        "docs":        "/docs",
        "sandbox":     True,
        "endpoints": {
            "register_client":   "POST /v1/onboarding/api/register",
            "sign_contract":     "POST /v1/contracts/sign-api",
            "list_clients":      "GET  /v1/onboarding/agent/list",
            "client_status":     "GET  /v1/onboarding/status/{client_id}",
            "edit_did":          "PATCH /v1/did/client/{client_id}",
            "activation_status": "GET  /v1/activation/status/{client_id}",
            "did_provinces":     "GET  /v1/activation/did/provinces"
        },
        "webhooks": {
            "client_activated":  "POST {webhook_url} body: {event, client_id, sip_user, did_number}",
            "did_changed":       "POST {webhook_url} body: {event, client_id, old_did, new_did}",
            "payment_approved":  "POST {webhook_url} body: {event, client_id, amount, ref}"
        }
    }


@router.post("/{partner_id}/webhook-test", dependencies=[Depends(require_roles("admin"))])
def test_webhook(partner_id: str, db: Session = Depends(get_db_nv)):
    """Enviar webhook de prueba al partner"""
    from app.webhook_engine import fire_webhook
    partner = db.execute(
        text("SELECT id, name, webhook_url FROM partners WHERE id = :id"),
        {"id": partner_id}
    ).fetchone()
    if not partner:
        raise HTTPException(404, "Partner no encontrado")
    if not partner.webhook_url:
        raise HTTPException(400, "El partner no tiene webhook_url configurado")

    fire_webhook(db, partner_id, "test.ping", {
        "message": "Webhook de prueba desde Netvoice",
        "partner_name": partner.name
    })
    return {"status": "ok", "message": f"Webhook enviado a {partner.webhook_url}"}
