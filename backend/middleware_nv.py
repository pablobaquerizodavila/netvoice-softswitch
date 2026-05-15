from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse
from collections import defaultdict
from datetime import datetime, timezone
import time
import logging

logger = logging.getLogger("netvoice.gateway")

# ─── Rate limiter simple en memoria ──────────────────────────
# Producción: reemplazar con Redis
_rate_buckets: dict = defaultdict(list)
RATE_LIMIT_V1   = 120   # requests por minuto para /v1/
RATE_LIMIT_API  = 300   # requests por minuto para partners con API key

def _is_rate_limited(key: str, limit: int, window: int = 60) -> bool:
    now = time.time()
    bucket = _rate_buckets[key]
    _rate_buckets[key] = [t for t in bucket if now - t < window]
    if len(_rate_buckets[key]) >= limit:
        return True
    _rate_buckets[key].append(now)
    return False


class NetvoiceGatewayMiddleware(BaseHTTPMiddleware):
    """
    Middleware del API Gateway para rutas /v1/
    - Detecta canal de origen: self_service | agent | partner | api
    - Aplica rate limiting por IP y por API key
    - Inyecta headers de contexto para los endpoints
    - Registra log de cada request
    """

    async def dispatch(self, request: Request, call_next):
        path = request.url.path

        # Solo procesar rutas /v1/
        if not path.startswith("/v1/"):
            return await call_next(request)

        start_time  = time.time()
        client_ip   = request.headers.get("X-Real-IP") or \
                      request.headers.get("X-Forwarded-For", "").split(",")[0].strip() or \
                      (request.client.host if request.client else "unknown")

        # ─── Detectar canal de origen ─────────────────────
        api_key    = request.headers.get("X-API-Key")
        user_agent = request.headers.get("User-Agent", "")

        if api_key:
            channel = "api"
            rate_key = f"apikey:{api_key[:16]}"
            rate_limit = RATE_LIMIT_API
        elif "agent-panel" in user_agent.lower() or \
             request.headers.get("X-Channel") == "agent":
            channel = "agent"
            rate_key = f"ip:{client_ip}"
            rate_limit = RATE_LIMIT_V1
        else:
            channel = "self_service"
            rate_key = f"ip:{client_ip}"
            rate_limit = RATE_LIMIT_V1

        # ─── Rate limiting ────────────────────────────────
        if _is_rate_limited(rate_key, rate_limit):
            logger.warning(f"Rate limit exceeded | {channel} | {client_ip} | {path}")
            return JSONResponse(
                status_code=429,
                content={"detail": "Demasiadas solicitudes. Intenta en un momento."}
            )

        # ─── Inyectar contexto en headers ─────────────────
        request.state.channel   = channel
        request.state.client_ip = client_ip

        # ─── Procesar request ─────────────────────────────
        response = await call_next(request)

        # ─── Log ──────────────────────────────────────────
        duration = round((time.time() - start_time) * 1000, 1)
        logger.info(
            f"{request.method} {path} | {response.status_code} | "
            f"{duration}ms | {channel} | {client_ip}"
        )

        # ─── Headers de respuesta ─────────────────────────
        response.headers["X-Channel"]      = channel
        response.headers["X-Process-Time"] = str(duration)

        return response
