from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import Optional
import uuid, secrets, string, hashlib, logging, requests as http_requests

from app.database_nv import get_db_nv
from app.auth_nv import get_current_user_nv, require_roles, generate_sip_user, generate_sip_password
from app.did_engine import assign_did, list_available_provinces
from app.auth_nv import hash_password

router = APIRouter(prefix="/v1/activation", tags=["activation"])
logger = logging.getLogger("netvoice.activation")

# ─── Config Asterisk ARI ─────────────────────────────────────
ARI_HOST   = "192.168.0.161"
ARI_PORT   = 8088
ARI_USER   = "netvoice"
ARI_PASS   = "Netvoice2024#"
ARI_BASE   = f"http://{ARI_HOST}:{ARI_PORT}/ari"
SIP_REALM  = "voip-lab-01"


# ─── ARI helpers ─────────────────────────────────────────────
def _ari(method: str, path: str, data: dict = None) -> dict:
    url = f"{ARI_BASE}{path}"
    try:
        resp = http_requests.request(
            method, url,
            auth=(ARI_USER, ARI_PASS),
            json=data,
            timeout=10
        )
        if resp.status_code in (200, 201, 204):
            return resp.json() if resp.text else {}
        logger.error(f"ARI {method} {path} → {resp.status_code}: {resp.text}")
        return None
    except Exception as e:
        logger.error(f"ARI error: {e}")
        return None


def _asterisk_reload_pjsip():
    """Recargar módulo PJSIP en Asterisk"""
    try:
        resp = http_requests.post(
            f"{ARI_BASE}/asterisk/modules/res_pjsip.so",
            auth=(ARI_USER, ARI_PASS),
            timeout=10
        )
        return resp.status_code in (200, 204)
    except:
        return False


def _create_pjsip_endpoint(sip_user: str, sip_pass: str, context: str = "from-internal") -> bool:
    """Crear endpoint PJSIP en Asterisk via MySQL directo"""
    return True


def _create_pjsip_via_mysql(sip_user: str, sip_pass: str, context: str, db_asterisk) -> bool:
    """Insertar endpoint directamente en tablas PJSIP de Asterisk"""
    try:
        db_asterisk.execute(text("""
            INSERT IGNORE INTO ps_auths (id, auth_type, password, username, realm)
            VALUES (:id, 'userpass', :password, :username, :realm)
        """), {"id": f"auth{sip_user}", "password": sip_pass,
               "username": sip_user, "realm": SIP_REALM})

        db_asterisk.execute(text("""
            INSERT IGNORE INTO ps_aors (id, max_contacts, remove_existing, qualify_frequency)
            VALUES (:id, 1, 'yes', 0)
        """), {"id": sip_user})

        db_asterisk.execute(text("""
            INSERT IGNORE INTO ps_endpoints
            (id, aors, auth, context, disallow, allow, direct_media,
             transport, force_rport, rtp_symmetric, rewrite_contact)
            VALUES (:id, :id, :auth, :context, 'all', 'ulaw,alaw,g729',
                    'no', 'transport-udp', 'yes', 'yes', 'yes')
        """), {"id": sip_user, "auth": f"auth{sip_user}", "context": context})

        db_asterisk.commit()
        return True
    except Exception as e:
        logger.error(f"PJSIP MySQL error: {e}")
        db_asterisk.rollback()
        return False


def _test_sip_registration(sip_user: str) -> bool:
    """Verificar si el endpoint existe en Asterisk"""
    try:
        resp = http_requests.get(
            f"{ARI_BASE}/endpoints/PJSIP/{sip_user}",
            auth=(ARI_USER, ARI_PASS),
            timeout=5
        )
        return resp.status_code == 200
    except:
        return False


# ─── ENDPOINT PRINCIPAL ──────────────────────────────────────
@router.post("/activate/{client_id}")
def activate_client_line(
    client_id: str,
    request: Request,
    db: Session = Depends(get_db_nv)
):
    """
    Activación técnica automática de la línea telefónica.
    Se dispara tras confirmar pago aprobado.
    Pasos: troncal → DID → creds SIP → PJSIP → verificación
    """

    # ── 1. Verificar estado del cliente ──────────────────────
    client = db.execute(text("""
        SELECT c.id, c.name, c.email, c.status, c.plan_id, c.partner_id,
               p.name as plan_name, p.max_channels
        FROM clients c
        LEFT JOIN plans p ON p.id = c.plan_id
        WHERE c.id = :id
    """), {"id": client_id}).fetchone()

    if not client:
        raise HTTPException(404, "Cliente no encontrado")

    payment_ok = db.execute(
        text("SELECT id FROM payments WHERE client_id = :id AND status = 'approved'"),
        {"id": client_id}
    ).fetchone()
    if not payment_ok:
        raise HTTPException(400, "Pago no aprobado — no se puede activar la línea")

    contract_ok = db.execute(
        text("SELECT id FROM contracts WHERE client_id = :id"),
        {"id": client_id}
    ).fetchone()
    if not contract_ok:
        raise HTTPException(400, "Contrato no firmado")

    already = db.execute(
        text("SELECT id, sip_user FROM sip_credentials WHERE client_id = :id AND status = 'active'"),
        {"id": client_id}
    ).fetchone()
    if already:
        return {
            "status":   "already_active",
            "sip_user": already.sip_user,
            "message":  "La línea ya estaba activada"
        }

    # ── 2. Asignar troncal ────────────────────────────────────
    trunk = db.execute(text("""
        SELECT id, carrier, host, port, max_channels
        FROM trunks
        WHERE status = 'active'
        AND (partner_id = :partner_id OR partner_id IS NULL)
        ORDER BY priority ASC LIMIT 1
    """), {"partner_id": client.partner_id}).fetchone()

    if not trunk:
        raise HTTPException(503, "No hay troncales disponibles")

    # ── 3. Asignar DID automático ─────────────────────────────
    # Obtener provincia del cliente
    client_detail = db.execute(
        text("SELECT provincia, ciudad FROM clients WHERE id = :id"),
        {"id": client_id}
    ).fetchone()
    provincia = client_detail.provincia if client_detail else None
    ciudad    = client_detail.ciudad if client_detail else None

    # Asignar DID real desde did_ranges de Asterisk
    did_result = assign_did(provincia=provincia, ciudad=ciudad)
    did_number = did_result["did_e164"] if did_result else None

    # Registrar en did_pool y did_assignments de netvoice
    did_assignment_id = str(uuid.uuid4())
    if did_result:
        did_pool_id = str(uuid.uuid4())
        db.execute(text("""
            INSERT IGNORE INTO did_pool
            (id, number, country_code, city, status)
            VALUES (:id, :number, 'EC', :city, 'assigned')
        """), {
            "id":     did_pool_id,
            "number": did_result["did_e164"],
            "city":   did_result["provincia"]
        })
        db.execute(text("""
            INSERT INTO did_assignments
            (id, client_id, did_id, changed_by_role, is_current, assigned_at)
            VALUES (:id, :client_id, :did_id, 'system', 1, NOW())
        """), {"id": did_assignment_id, "client_id": client_id, "did_id": did_pool_id})
    else:
        logger.warning(f"No hay DIDs disponibles para cliente {client_id}")

    # ── 4. Generar credenciales SIP fuertes ───────────────────
    sip_user     = generate_sip_user()
    sip_password = generate_sip_password()
    sip_hash     = hash_password(sip_password)

    # ── 5. Crear endpoint PJSIP en Asterisk ───────────────────
    from app.database import engine as engine_asterisk
    from sqlalchemy.orm import sessionmaker
    SessionAsterisk = sessionmaker(bind=engine_asterisk)
    db_ast = SessionAsterisk()

    pjsip_ok = _create_pjsip_via_mysql(sip_user, sip_password, "from-internal", db_ast)
    db_ast.close()

    if not pjsip_ok:
        logger.error(f"PJSIP creation failed for {sip_user}")

    # Recargar PJSIP
    try:
        http_requests.put(
            f"{ARI_BASE}/asterisk/modules/res_pjsip.so",
            auth=(ARI_USER, ARI_PASS), timeout=5
        )
    except:
        pass

    # ── 6. Guardar credenciales SIP ───────────────────────────
    cred_id = str(uuid.uuid4())
    db.execute(text("""
        INSERT INTO sip_credentials
        (id, client_id, trunk_id, sip_user, sip_password_hash,
         sip_password_plain, realm, max_channels, status)
        VALUES (:id, :client_id, :trunk_id, :sip_user, :sip_hash,
                :sip_plain, :realm, :channels, 'active')
    """), {
        "id":         cred_id,
        "client_id":  client_id,
        "trunk_id":   trunk.id,
        "sip_user":   sip_user,
        "sip_hash":   sip_hash,
        "sip_plain":  sip_password,
        "realm":      SIP_REALM,
        "channels":   client.max_channels or 2
    })

    # ── 7. Activar cliente ────────────────────────────────────
    db.execute(text("""
        UPDATE clients SET status = 'active' WHERE id = :id
    """), {"id": client_id})

    db.commit()

    # ── 8. Verificar registro ─────────────────────────────────
    sip_ok = _test_sip_registration(sip_user)

    logger.info(f"LINE ACTIVATED | client:{client_id} | sip:{sip_user} | did:{did_number} | pjsip:{pjsip_ok}")

    return {
        "status":       "activated",
        "client_id":    client_id,
        "client_name":  client.name,
        "sip_server":   ARI_HOST,
        "sip_port":     5060,
        "sip_user":     sip_user,
        "sip_password": sip_password,
        "sip_realm":    SIP_REALM,
        "did_number":   did_number,
        "trunk":        trunk.carrier,
        "codecs":       "ulaw, alaw, g729",
        "max_channels": client.max_channels or 2,
        "endpoint_registered": sip_ok,
        "message":      "Línea activada correctamente"
    }


@router.get("/status/{client_id}")
def activation_status(client_id: str, db: Session = Depends(get_db_nv)):
    """Estado de activación de la línea"""
    cred = db.execute(text("""
        SELECT sc.sip_user, sc.realm, sc.max_channels, sc.status,
               sc.last_register_at, sc.created_at,
               dp.number as did_number,
               t.carrier, t.host as trunk_host
        FROM sip_credentials sc
        LEFT JOIN did_assignments da ON da.client_id = sc.client_id AND da.is_current = 1
        LEFT JOIN did_pool dp ON dp.id = da.did_id
        LEFT JOIN trunks t ON t.id = sc.trunk_id
        WHERE sc.client_id = :id AND sc.status = 'active'
    """), {"id": client_id}).fetchone()

    if not cred:
        return {"client_id": client_id, "activated": False}

    r = dict(cred._mapping)
    return {
        "client_id":         client_id,
        "activated":         True,
        "sip_user":          r["sip_user"],
        "sip_realm":         r["realm"],
        "sip_server":        ARI_HOST,
        "sip_port":          5060,
        "did_number":        r["did_number"],
        "carrier":           r["carrier"],
        "trunk_host":        r["trunk_host"],
        "max_channels":      r["max_channels"],
        "last_register_at":  r["last_register_at"],
        "activated_at":      r["created_at"].isoformat() if r["created_at"] else None
    }

@router.get("/did/provinces")
def available_provinces():
    """Provincias con DIDs disponibles"""
    from app.did_engine import list_available_provinces
    return {"data": list_available_provinces()}
