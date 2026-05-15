from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from sqlalchemy import text
from pydantic import BaseModel
from typing import Optional
import uuid, datetime, logging

from app.database_nv import get_db_nv
from app.models_nv import UserNV
from app.auth_nv import get_current_user_nv, require_roles
from app.did_engine import assign_did, release_did, list_available_provinces

router = APIRouter(prefix="/v1/did", tags=["did"])
logger = logging.getLogger("netvoice.did_api")

COOLDOWN_HOURS = 24


# ─── Schemas ─────────────────────────────────────────────────
class EditDIDRequest(BaseModel):
    new_number: str
    reason: Optional[str] = None


# ─── Pool de DIDs ────────────────────────────────────────────
@router.get("/pool")
def get_did_pool(
    status: Optional[str] = None,
    provincia: Optional[str] = None,
    limit: int = 50,
    db: Session = Depends(get_db_nv),
    current_user: UserNV = Depends(get_current_user_nv)
):
    """Ver pool de DIDs — admin ve todo, partner ve solo los suyos"""
    conditions = ["1=1"]
    params = {"limit": limit}

    if current_user.role == "partner":
        conditions.append("(partner_id = :partner_id OR partner_id IS NULL)")
        params["partner_id"] = current_user.partner_id

    if status:
        conditions.append("status = :status")
        params["status"] = status

    if provincia:
        conditions.append("city = :city")
        params["city"] = provincia.upper()

    where = " AND ".join(conditions)
    rows = db.execute(text(f"""
        SELECT id, number, country_code, city, status, reserved_at, created_at
        FROM did_pool WHERE {where}
        ORDER BY created_at DESC LIMIT :limit
    """), params).fetchall()

    return {"total": len(rows), "data": [dict(r._mapping) for r in rows]}


@router.get("/provinces")
def get_provinces():
    """Provincias con DIDs disponibles en ARCOTEL"""
    return {"data": list_available_provinces()}


@router.get("/client/{client_id}")
def get_client_did(
    client_id: str,
    db: Session = Depends(get_db_nv),
    current_user: UserNV = Depends(get_current_user_nv)
):
    """DID actual asignado a un cliente"""
    row = db.execute(text("""
        SELECT da.id, da.assigned_at, da.changed_at, da.changed_by_role,
               da.previous_number, dp.number as current_number,
               dp.city as provincia
        FROM did_assignments da
        JOIN did_pool dp ON dp.id = da.did_id
        WHERE da.client_id = :id AND da.is_current = 1
    """), {"id": client_id}).fetchone()

    if not row:
        return {"client_id": client_id, "did": None}

    r = dict(row._mapping)
    return {
        "client_id":       client_id,
        "did":             r["current_number"],
        "provincia":       r["provincia"],
        "assigned_at":     r["assigned_at"].isoformat() if r["assigned_at"] else None,
        "previous_number": r["previous_number"],
        "last_changed_by": r["changed_by_role"]
    }


# ─── Edición de DID por rol ───────────────────────────────────
@router.patch("/client/{client_id}")
def edit_client_did(
    client_id: str,
    data: EditDIDRequest,
    request: Request,
    current_user: UserNV = Depends(get_current_user_nv),
    db: Session = Depends(get_db_nv)
):
    """
    Editar DID asignado a un cliente.
    - Admin: puede editar cualquier DID, sin cooldown
    - Partner: solo sus clientes, solo su pool, cooldown 24h
    - Agente: no puede editar DIDs
    """

    # ── Verificar permisos ────────────────────────────────────
    if current_user.role not in ("admin", "partner"):
        raise HTTPException(403, "Solo admin o partner pueden editar DIDs")

    # ── Verificar que el cliente existe ───────────────────────
    client = db.execute(
        text("SELECT id, partner_id, status FROM clients WHERE id = :id"),
        {"id": client_id}
    ).fetchone()
    if not client:
        raise HTTPException(404, "Cliente no encontrado")

    # ── Partner solo puede editar sus propios clientes ────────
    if current_user.role == "partner":
        if client.partner_id != current_user.partner_id:
            raise HTTPException(403, "No puedes editar clientes de otro partner")

    # ── Cooldown para partners ────────────────────────────────
    if current_user.role == "partner":
        last_change = db.execute(text("""
            SELECT changed_at FROM did_assignments
            WHERE client_id = :id
            AND changed_by_role = 'partner'
            AND changed_at IS NOT NULL
            ORDER BY changed_at DESC LIMIT 1
        """), {"id": client_id}).fetchone()

        if last_change and last_change.changed_at:
            elapsed = datetime.datetime.now() - last_change.changed_at
            if elapsed.total_seconds() < COOLDOWN_HOURS * 3600:
                remaining = COOLDOWN_HOURS - int(elapsed.total_seconds() / 3600)
                raise HTTPException(429,
                    f"Cooldown activo — puedes cambiar el DID en {remaining} horas")

    # ── Verificar que el nuevo número existe en el pool ───────
    new_did = db.execute(
        text("SELECT id, number, partner_id, status FROM did_pool WHERE number = :num"),
        {"num": data.new_number}
    ).fetchone()

    if not new_did:
        raise HTTPException(404, f"El número {data.new_number} no existe en el pool")

    if new_did.status == "assigned":
        raise HTTPException(400, f"El número {data.new_number} ya está asignado a otro cliente")

    # ── Partner solo puede usar números de su pool ────────────
    if current_user.role == "partner":
        if new_did.partner_id and new_did.partner_id != current_user.partner_id:
            raise HTTPException(403, "No puedes usar números de otro partner")

    # ── Obtener asignación actual ─────────────────────────────
    current_assignment = db.execute(text("""
        SELECT da.id, da.did_id, dp.number as current_number
        FROM did_assignments da
        JOIN did_pool dp ON dp.id = da.did_id
        WHERE da.client_id = :id AND da.is_current = 1
    """), {"id": client_id}).fetchone()

    previous_number = current_assignment.current_number if current_assignment else None

    # ── Liberar DID anterior ──────────────────────────────────
    if current_assignment:
        db.execute(text("""
            UPDATE did_pool SET status = 'available'
            WHERE id = :id
        """), {"id": current_assignment.did_id})

        db.execute(text("""
            UPDATE did_assignments
            SET is_current = 0, changed_at = NOW()
            WHERE id = :id
        """), {"id": current_assignment.id})

        # Liberar en did_asignados de asterisk
        if previous_number:
            release_did(previous_number.lstrip("+"))

    # ── Asignar nuevo DID ─────────────────────────────────────
    db.execute(text("""
        UPDATE did_pool SET status = 'assigned' WHERE id = :id
    """), {"id": new_did.id})

    role_str = current_user.role
    new_assignment_id = str(uuid.uuid4())
    db.execute(text("""
        INSERT INTO did_assignments
        (id, client_id, did_id, changed_by, changed_by_role,
         previous_number, is_current, assigned_at)
        VALUES (:id, :client_id, :did_id, :changed_by, :role,
                :prev, 1, NOW())
    """), {
        "id":         new_assignment_id,
        "client_id":  client_id,
        "did_id":     new_did.id,
        "changed_by": current_user.id,
        "role":       role_str,
        "prev":       previous_number
    })

    db.commit()

    # ── Notificar admin si fue un partner ─────────────────────
    if current_user.role == "partner":
        logger.info(
            f"DID CHANGE by partner | client:{client_id} | "
            f"{previous_number} → {data.new_number} | partner:{current_user.partner_id}"
        )

    return {
        "status":           "ok",
        "client_id":        client_id,
        "previous_number":  previous_number,
        "new_number":       data.new_number,
        "changed_by":       current_user.role,
        "message":          f"DID actualizado a {data.new_number}"
    }


@router.get("/history/{client_id}")
def did_history(
    client_id: str,
    db: Session = Depends(get_db_nv),
    current_user: UserNV = Depends(get_current_user_nv)
):
    """Historial completo de cambios de DID de un cliente"""
    rows = db.execute(text("""
        SELECT da.id, dp.number, da.changed_by_role,
               da.previous_number, da.is_current,
               da.assigned_at, da.changed_at
        FROM did_assignments da
        JOIN did_pool dp ON dp.id = da.did_id
        WHERE da.client_id = :id
        ORDER BY da.assigned_at DESC
    """), {"id": client_id}).fetchall()

    return {
        "client_id": client_id,
        "total":     len(rows),
        "history":   [dict(r._mapping) for r in rows]
    }
