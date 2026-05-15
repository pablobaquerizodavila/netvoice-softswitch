from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from sqlalchemy import text
from pydantic import BaseModel
from typing import Optional
import uuid, datetime, secrets, logging

from app.database_nv import get_db_nv
from app.auth_nv import get_current_user_nv, require_roles

router = APIRouter(prefix="/v1/payments", tags=["payments"])
logger = logging.getLogger("netvoice.payments")

# ─── Schemas ─────────────────────────────────────────────────
class InitPaymentRequest(BaseModel):
    client_id: str
    amount: float
    gateway: str = "sandbox"
    concept: str = "activation"

class ConfirmPaymentRequest(BaseModel):
    payment_id: str
    gateway_ref: Optional[str] = None

class SandboxPayRequest(BaseModel):
    payment_id: str
    card_number: str = "4111111111111111"
    result: str = "approved"


# ─── Simulador sandbox ────────────────────────────────────────
SANDBOX_CARDS = {
    "4111111111111111": "approved",
    "4000000000000002": "declined",
    "4000000000000069": "failed",
}

def _sandbox_charge(card: str, amount: float) -> dict:
    result = SANDBOX_CARDS.get(card, "approved")
    return {
        "gateway_ref": f"SANDBOX-{secrets.token_hex(8).upper()}",
        "status":      result,
        "amount":      amount,
        "currency":    "USD",
        "message":     "Transacción aprobada" if result == "approved" else "Tarjeta rechazada"
    }


# ─── ENDPOINTS ───────────────────────────────────────────────

@router.post("/init", status_code=201)
def init_payment(data: InitPaymentRequest, db: Session = Depends(get_db_nv)):
    """Iniciar proceso de pago — crea registro pending"""

    client = db.execute(
        text("SELECT id, name, email, status FROM clients WHERE id = :id"),
        {"id": data.client_id}
    ).fetchone()
    if not client:
        raise HTTPException(404, "Cliente no encontrado")

    contract = db.execute(
        text("SELECT id FROM contracts WHERE client_id = :id"),
        {"id": data.client_id}
    ).fetchone()
    if not contract:
        raise HTTPException(400, "El cliente debe firmar el contrato antes de pagar")

    existing = db.execute(
        text("SELECT id FROM payments WHERE client_id = :id AND status = 'approved'"),
        {"id": data.client_id}
    ).fetchone()
    if existing:
        raise HTTPException(400, "Este cliente ya tiene un pago aprobado")

    if data.gateway not in ("sandbox", "payphone", "stripe", "transfer", "manual"):
        raise HTTPException(400, "Pasarela de pago no válida")

    payment_id = str(uuid.uuid4())
    db.execute(text("""
        INSERT INTO payments (id, client_id, gateway, amount, currency, concept, status)
        VALUES (:id, :client_id, :gateway, :amount, 'USD', :concept, 'pending')
    """), {
        "id": payment_id, "client_id": data.client_id,
        "gateway": data.gateway, "amount": data.amount,
        "concept": data.concept
    })
    db.commit()

    response = {
        "status":     "ok",
        "payment_id": payment_id,
        "amount":     data.amount,
        "currency":   "USD",
        "gateway":    data.gateway,
        "next_step":  "process_payment"
    }

    if data.gateway == "sandbox":
        response["sandbox_info"] = {
            "test_cards": {
                "approved": "4111111111111111",
                "declined": "4000000000000002",
                "failed":   "4000000000000069"
            },
            "endpoint": f"/v1/payments/sandbox/pay"
        }

    return response


@router.post("/sandbox/pay")
def sandbox_pay(data: SandboxPayRequest, db: Session = Depends(get_db_nv)):
    """Simular pago con tarjeta — solo modo sandbox"""

    payment = db.execute(
        text("SELECT id, client_id, amount, gateway, status FROM payments WHERE id = :id"),
        {"id": data.payment_id}
    ).fetchone()

    if not payment:
        raise HTTPException(404, "Pago no encontrado")
    if payment.gateway != "sandbox":
        raise HTTPException(400, "Este endpoint es solo para pagos sandbox")
    if payment.status != "pending":
        raise HTTPException(400, f"El pago ya fue procesado: {payment.status}")

    result = _sandbox_charge(data.card_number, payment.amount)

    db.execute(text("""
        UPDATE payments
        SET status = :status, gateway_ref = :ref,
            gateway_payload = :payload, paid_at = :paid_at
        WHERE id = :id
    """), {
        "status":  result["status"],
        "ref":     result["gateway_ref"],
        "payload": __import__("json").dumps(result, default=str),
        "paid_at": datetime.datetime.now() if result["status"] == "approved" else None,
        "id":      data.payment_id
    })

    if result["status"] == "approved":
        db.execute(text("""
            UPDATE clients SET status = 'pending' WHERE id = :id
        """), {"id": payment.client_id})

    db.commit()

    logger.info(f"SANDBOX PAYMENT | {data.payment_id} | {result['status']} | ref:{result['gateway_ref']}")

    return {
        "status":      result["status"],
        "payment_id":  data.payment_id,
        "gateway_ref": result["gateway_ref"],
        "amount":      payment.amount,
        "message":     result["message"],
        "next_step":   "activate_line" if result["status"] == "approved" else "retry_payment"
    }


@router.post("/webhook/payphone")
async def webhook_payphone(request: Request, db: Session = Depends(get_db_nv)):
    """Webhook de confirmación PayPhone — para cuando se integre"""
    body = await request.json()
    logger.info(f"PAYPHONE WEBHOOK: {body}")

    transaction_id = body.get("transactionId")
    status_code    = body.get("statusCode")
    client_txid    = body.get("clientTransactionId")

    if not client_txid:
        return {"status": "ignored"}

    payment = db.execute(
        text("SELECT id, client_id FROM payments WHERE id = :id"),
        {"id": client_txid}
    ).fetchone()

    if not payment:
        return {"status": "not_found"}

    new_status = "approved" if status_code == 3 else "failed"

    db.execute(text("""
        UPDATE payments SET status = :status, gateway_ref = :ref,
               gateway_payload = :payload, paid_at = :paid_at
        WHERE id = :id
    """), {
        "status":  new_status,
        "ref":     str(transaction_id),
        "payload": str(body),
        "paid_at": datetime.datetime.now() if new_status == "approved" else None,
        "id":      payment.id
    })

    if new_status == "approved":
        db.execute(text("""
            UPDATE clients SET status = 'pending' WHERE id = :id
        """), {"id": payment.client_id})

    db.commit()
    return {"status": "ok", "payment_status": new_status}


@router.post("/webhook/stripe")
async def webhook_stripe(request: Request, db: Session = Depends(get_db_nv)):
    """Webhook de confirmación Stripe — para cuando se integre"""
    body = await request.json()
    logger.info(f"STRIPE WEBHOOK: {body}")

    event_type = body.get("type")
    if event_type == "payment_intent.succeeded":
        metadata   = body.get("data", {}).get("object", {}).get("metadata", {})
        payment_id = metadata.get("netvoice_payment_id")
        if payment_id:
            payment = db.execute(
                text("SELECT id, client_id FROM payments WHERE id = :id"),
                {"id": payment_id}
            ).fetchone()
            if payment:
                db.execute(text("""
                    UPDATE payments SET status = 'approved', paid_at = NOW(),
                           gateway_ref = :ref WHERE id = :id
                """), {"ref": body.get("id", ""), "id": payment_id})
                db.execute(text("""
                    UPDATE clients SET status = 'pending' WHERE id = :id
                """), {"id": payment.client_id})
                db.commit()

    return {"status": "ok"}


@router.get("/status/{client_id}")
def payment_status(client_id: str, db: Session = Depends(get_db_nv)):
    """Estado de pagos de un cliente"""
    payments = db.execute(text("""
        SELECT id, gateway, gateway_ref, amount, currency,
               concept, status, paid_at, created_at
        FROM payments WHERE client_id = :id
        ORDER BY created_at DESC
    """), {"id": client_id}).fetchall()

    return {
        "client_id": client_id,
        "payments":  [dict(r._mapping) for r in payments],
        "approved":  any(p.status == "approved" for p in payments)
    }
