from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from sqlalchemy import text
from pydantic import BaseModel
from typing import Optional
from app.database import get_db
from app.auth import verify_password, create_access_token, get_current_user
from app.models import User

app = FastAPI(title="Netvoice Panel API", version="1.2.0")

app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

class ExtensionCreate(BaseModel):
    id: str
    password: str
    context: str = "internal"
    allow: str = "ulaw,alaw,gsm"

class ExtensionUpdate(BaseModel):
    password: Optional[str] = None
    context: Optional[str] = None
    allow: Optional[str] = None

@app.get("/")
def root():
    return {"status": "ok", "service": "netvoice-panel", "version": "1.2.0"}

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



def sync_asterisk(action, ext_id, password=None, context='internal', allow='ulaw,alaw,gsm'):
    """Sincroniza pjsip.conf en voip-lab-01 via SSH y recarga Asterisk"""
    import subprocess, tempfile, os

    ASTERISK_HOST = "192.168.0.161"
    ASTERISK_USER = "pbaquerizo"
    PJSIP_CONF    = "/etc/asterisk/pjsip.conf"

    try:
        # Leer pjsip.conf actual
        result = subprocess.run(
            ["/usr/bin/ssh", "-o", "StrictHostKeyChecking=no", "-o", "BatchMode=yes",
             f"{ASTERISK_USER}@{ASTERISK_HOST}", f"cat {PJSIP_CONF}"],
            capture_output=True, text=True, timeout=10
        )
        content = result.stdout

        if action == "create":
            block = f"""
[{ext_id}]
type=endpoint
transport=transport-udp
aors={ext_id}
auth=auth{ext_id}
context={context}
disallow=all
allow={allow}
direct_media=no
force_rport=yes
rtp_symmetric=yes
rewrite_contact=yes
[auth{ext_id}]
type=auth
auth_type=userpass
username={ext_id}
password={password}
[{ext_id}]
type=aor
max_contacts=1
remove_existing=yes
qualify_frequency=0
[{ext_id}-webrtc]
type=endpoint
transport=transport-wss
aors={ext_id}
auth=auth{ext_id}
context={context}
disallow=all
allow=opus,ulaw,alaw
direct_media=no
force_rport=yes
rtp_symmetric=yes
rewrite_contact=yes
webrtc=yes
dtls_auto_generate_cert=yes
"""
            content += block

        elif action == "update":
            import re
            if password:
                content = re.sub(
                    rf'(\[auth{ext_id}\][^\[]*password=)[^\n]*',
                    rf'\g<1>{password}',
                    content
                )
            if context:
                content = re.sub(
                    rf'(\[{ext_id}\]\ntype=endpoint[^\[]*context=)[^\n]*',
                    rf'\g<1>{context}',
                    content
                )

        elif action == "delete":
            import re
            content = re.sub(rf'\[{ext_id}-webrtc\][^\[]*', '', content)
            content = re.sub(rf'\[auth{ext_id}\][^\[]*', '', content)
            content = re.sub(rf'\[{ext_id}\]\ntype=aor[^\[]*', '', content)
            content = re.sub(rf'\[{ext_id}\]\ntype=endpoint[^\[]*', '', content)

        # Escribir archivo temporal y enviarlo
        with tempfile.NamedTemporaryFile(mode='w', suffix='.conf', delete=False) as f:
            f.write(content)
            tmp = f.name

        subprocess.run(
            ["/usr/bin/scp", "-o", "StrictHostKeyChecking=no", "-o", "BatchMode=yes",
             tmp, f"{ASTERISK_USER}@{ASTERISK_HOST}:/tmp/pjsip_new.conf"],
            timeout=10
        )
        subprocess.run(
            ["/usr/bin/ssh", "-o", "StrictHostKeyChecking=no", "-o", "BatchMode=yes",
             f"{ASTERISK_USER}@{ASTERISK_HOST}",
             f"sudo cp /tmp/pjsip_new.conf {PJSIP_CONF} && sudo asterisk -rx 'module reload res_pjsip.so'"],
            timeout=15
        )
        os.unlink(tmp)
        return True
    except Exception as e:
        print(f"sync_asterisk error: {e}")
        return False


@app.get("/network/status")
def get_network_status(current_user: User = Depends(get_current_user)):
    """Estado en tiempo real de todos los nodos de la infraestructura"""
    import socket, subprocess, re, time

    result = {
        "timestamp": time.time(),
        "nodes": {}
    }

    # ── Kamailio SBC ──────────────────────────────
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.settimeout(2)
        s.connect(("192.168.0.10", 5060))
        s.close()
        kamailio_up = True
    except:
        kamailio_up = False

    result["nodes"]["sbc"] = {
        "name": "Kamailio SBC",
        "ip": "192.168.0.10",
        "port": 5060,
        "status": "online" if kamailio_up else "offline",
        "role": "Session Border Controller",
        "version": "5.5.4"
    }

    # ── Asterisk ─────────────────────────────────
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        s.settimeout(2)
        s.connect(("192.168.0.161", 5038))
        s.recv(100)
        login = "Action: Login\r\nUsername: netvoice\r\nSecret: Netvoice2024#\r\n\r\n"
        s.send(login.encode())
        s.recv(1024)

        # Canales activos
        s.send(b"Action: Command\r\nCommand: core show channels count\r\n\r\n")
        resp = b""
        for _ in range(10):
            try:
                chunk = s.recv(2048)
                resp += chunk
                if b"Output:" in resp: break
            except: break

        channels = 0
        for line in resp.decode(errors="ignore").split("\n"):
            if "active channel" in line.lower():
                m = re.search(r"(\d+)", line)
                if m: channels = int(m.group(1))

        # Uptime
        s.send(b"Action: Command\r\nCommand: core show uptime seconds\r\n\r\n")
        resp2 = b""
        for _ in range(10):
            try:
                chunk = s.recv(2048)
                resp2 += chunk
                if b"Output:" in resp2: break
            except: break

        uptime = 0
        for line in resp2.decode(errors="ignore").split("\n"):
            if "system uptime" in line.lower():
                m = re.search(r"(\d+)", line)
                if m: uptime = int(m.group(1))

        s.close()
        asterisk_up = True
    except Exception as e:
        asterisk_up = False
        channels = 0
        uptime = 0

    result["nodes"]["asterisk"] = {
        "name": "Asterisk PBX",
        "ip": "192.168.0.161",
        "port": 5060,
        "status": "online" if asterisk_up else "offline",
        "role": "Núcleo SIP / PBX",
        "version": "20.19.0",
        "channels_active": channels,
        "uptime_seconds": uptime
    }


    # ── Asterisk HA (voip-ha-01) ─────────────────
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        s.settimeout(2)
        s.connect(("192.168.0.216", 5038))
        s.recv(1024)
        s.send(f"Action: Login\r\nUsername: netvoice\r\nSecret: Netvoice2024#\r\n\r\n".encode())
        s.recv(2048)
        s.send(b"Action: Command\r\nCommand: core show uptime seconds\r\n\r\n")
        resp = b""
        for _ in range(10):
            try:
                chunk = s.recv(2048)
                resp += chunk
                if b"Output:" in resp: break
            except: break
        uptime_ha = 0
        for line in resp.decode(errors="ignore").split("\n"):
            if "system uptime" in line.lower():
                m = re.search(r"(\d+)", line)
                if m: uptime_ha = int(m.group(1))
        s.close()
        asterisk_ha_up = True
    except:
        asterisk_ha_up = False
        uptime_ha = 0

    result["nodes"]["asterisk_ha"] = {
        "name": "Asterisk HA",
        "ip": "192.168.0.216",
        "port": 5060,
        "status": "online" if asterisk_ha_up else "offline",
        "role": "Nodo HA — Alta Disponibilidad",
        "version": "20.19.0",
        "channels_active": 0,
        "uptime_seconds": uptime_ha
    }

    # ── MySQL ─────────────────────────────────────
    try:
        import subprocess
        r = subprocess.run(
            ["/usr/bin/mysql", "-h", "192.168.0.161", "-u", "netvoice",
             "-pNetvoice2024#", "asterisk", "--connect-timeout=3",
             "-e", "SELECT COUNT(*) FROM cdr WHERE DATE(calldate)=CURDATE();"],
            capture_output=True, text=True, timeout=8
        )
        cdr_today = 0
        for line in r.stdout.strip().split("\n"):
            try:
                val = int(line.strip())
                cdr_today = val
                break
            except: pass
        mysql_up = r.returncode == 0
    except:
        mysql_up = False
        cdr_today = 0

    result["nodes"]["mysql"] = {
        "name": "MySQL",
        "ip": "192.168.0.161",
        "port": 3306,
        "status": "online" if mysql_up else "offline",
        "role": "Base de datos",
        "version": "8.0",
        "cdr_today": cdr_today
    }

    # ── Nginx / Panel ─────────────────────────────
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        s.settimeout(2)
        s.connect(("192.168.0.7", 443))
        s.close()
        nginx_up = True
    except:
        try:
            s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            s.settimeout(2)
            s.connect(("192.168.0.7", 8443))
            s.close()
            nginx_up = True
        except:
            nginx_up = False

    result["nodes"]["nginx"] = {
        "name": "Nginx + Panel",
        "ip": "192.168.0.7",
        "port": 8443,
        "status": "online" if nginx_up else "offline",
        "role": "Web + API Gateway",
        "version": "1.18"
    }

    # ── Extensiones registradas ───────────────────
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        s.settimeout(5)
        s.connect(("192.168.0.161", 5038))
        s.recv(100)
        s.send(f"Action: Login\r\nUsername: netvoice\r\nSecret: Netvoice2024#\r\n\r\n".encode())
        s.recv(2048)
        s.send(b"Action: Command\r\nCommand: pjsip show contacts\r\n\r\n")
        response = b""
        while True:
            try:
                chunk = s.recv(4096)
                if not chunk: break
                response += chunk
                if b"Objects found" in response: break
            except: break
        s.close()
        text = response.decode(errors="ignore")
        import re as _re
        registered = set()
        for line in text.split("\n"):
            if "Contact:" in line and "sip:" in line:
                m = _re.search(r"(\d{4})/", line)
                if m: registered.add(m.group(1))
        result["extensions_registered"] = list(registered)
        result["extensions_count"] = len(registered)
    except:
        result["extensions_registered"] = []
        result["extensions_count"] = 0

    return result

@app.get("/extensions/status")
def get_extensions_status(current_user: User = Depends(get_current_user)):
    import socket, re as _re
    AMI_HOST = "192.168.0.161"
    AMI_PORT = 5038
    AMI_USER = "netvoice"
    AMI_SECRET = "Netvoice2024#"
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        s.settimeout(5)
        s.connect((AMI_HOST, AMI_PORT))
        s.recv(1024)
        s.send(f"Action: Login\r\nUsername: {AMI_USER}\r\nSecret: {AMI_SECRET}\r\n\r\n".encode())
        s.recv(2048)
        s.send(b"Action: Command\r\nCommand: pjsip show contacts\r\n\r\n")
        response = b""
        while True:
            try:
                chunk = s.recv(4096)
                if not chunk: break
                response += chunk
                if b"Objects found" in response: break
            except: break
        s.close()
        text = response.decode(errors="ignore")
        registered = set()
        for line in text.split("\n"):
            if "Contact:" in line and "sip:" in line:
                m = _re.search(r"(\d{4})/", line)
                if m: registered.add(m.group(1))
        return {"status": "ok", "registered": list(registered)}
    except Exception as e:
        return {"status": "error", "registered": [], "detail": str(e)}

@app.get("/extensions")
def get_extensions(db: Session = Depends(get_db)):
    result = db.execute(text("SELECT id, aors, auth, context, allow FROM ps_endpoints WHERE context = 'internal'"))
    rows = result.fetchall()
    return {"total": len(rows), "data": [dict(r._mapping) for r in rows]}

@app.post("/extensions")
def create_extension(ext: ExtensionCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    exists = db.execute(text("SELECT id FROM ps_endpoints WHERE id = :id"), {"id": ext.id}).fetchone()
    if exists:
        raise HTTPException(status_code=400, detail=f"La extensión {ext.id} ya existe")
    try:
        db.execute(text("INSERT INTO ps_auths (id, auth_type, password, username, realm) VALUES (:id, 'userpass', :password, :id, 'voip-lab-01')"), {"id": ext.id, "password": ext.password})
        db.execute(text("INSERT INTO ps_aors (id, max_contacts, remove_existing) VALUES (:id, 5, 'yes')"), {"id": ext.id})
        db.execute(text("INSERT INTO ps_endpoints (id, aors, auth, context, disallow, allow, direct_media, transport) VALUES (:id, :id, :id, :context, 'all', :allow, 'no', 'transport-udp')"), {"id": ext.id, "context": ext.context, "allow": ext.allow})
        db.commit()
        sync_asterisk("create", ext.id, ext.password, ext.context, ext.allow)
        db.execute(text("INSERT INTO audit_log (user_id, username, accion, modulo, detalle, ip) VALUES (:uid,:un,:a,:m,:d,:ip)"),
            {"uid":current_user.id,"un":current_user.username,"a":"crear_extension","m":"extensiones","d":f"Creada extensión {ext.id}","ip":getattr(request.client,"host","?")})
        db.commit()
        return {"status": "ok", "message": f"Extensión {ext.id} creada correctamente"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/extensions/{ext_id}")
def update_extension(ext_id: str, ext: ExtensionUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    exists = db.execute(text("SELECT id FROM ps_endpoints WHERE id = :id"), {"id": ext_id}).fetchone()
    if not exists:
        raise HTTPException(status_code=404, detail="Extensión no encontrada")
    try:
        if ext.password:
            db.execute(text("UPDATE ps_auths SET password = :p WHERE id = :id"), {"p": ext.password, "id": ext_id})
        if ext.context:
            db.execute(text("UPDATE ps_endpoints SET context = :c WHERE id = :id"), {"c": ext.context, "id": ext_id})
        if ext.allow:
            db.execute(text("UPDATE ps_endpoints SET allow = :a WHERE id = :id"), {"a": ext.allow, "id": ext_id})
        db.commit()
        sync_asterisk("update", ext_id, ext.password, ext.context)
        db.execute(text("INSERT INTO audit_log (user_id, username, accion, modulo, detalle, ip) VALUES (:uid,:un,:a,:m,:d,:ip)"),
            {"uid":current_user.id,"un":current_user.username,"a":"editar_extension","m":"extensiones","d":f"Editada extensión {ext_id}","ip":getattr(request.client,"host","?")})
        db.commit()
        return {"status": "ok", "message": f"Extensión {ext_id} actualizada"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/extensions/{ext_id}")
def delete_extension(ext_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    exists = db.execute(text("SELECT id FROM ps_endpoints WHERE id = :id"), {"id": ext_id}).fetchone()
    if not exists:
        raise HTTPException(status_code=404, detail="Extensión no encontrada")
    try:
        db.execute(text("DELETE FROM ps_endpoints WHERE id = :id"), {"id": ext_id})
        db.execute(text("DELETE FROM ps_auths WHERE id = :id"), {"id": ext_id})
        db.execute(text("DELETE FROM ps_aors WHERE id = :id"), {"id": ext_id})
        db.commit()
        sync_asterisk("delete", ext_id)
        db.execute(text("INSERT INTO audit_log (user_id, username, accion, modulo, detalle, ip) VALUES (:uid,:un,:a,:m,:d,:ip)"),
            {"uid":current_user.id,"un":current_user.username,"a":"eliminar_extension","m":"extensiones","d":f"Eliminada extensión {ext_id}","ip":getattr(request.client,"host","?")})
        db.commit()
        return {"status": "ok", "message": f"Extensión {ext_id} eliminada"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

class PasswordChange(BaseModel):
    current_password: str
    new_password: str

@app.post("/auth/change-password")
def change_password(data: PasswordChange, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    from app.auth import hash_password
    if not verify_password(data.current_password, current_user.password_hash):
        raise HTTPException(status_code=400, detail="Password actual incorrecta")
    if len(data.new_password) < 8:
        raise HTTPException(status_code=400, detail="La nueva password debe tener al menos 8 caracteres")
    db.execute(
        text("UPDATE users SET password_hash = :hash WHERE id = :id"),
        {"hash": hash_password(data.new_password), "id": current_user.id}
    )
    db.commit()
    return {"status": "ok", "message": "Password actualizada correctamente"}

# ─── TRUNKS ───────────────────────────────────────────
class TrunkCreate(BaseModel):
    nombre: str
    proveedor: Optional[str] = None
    host: str
    usuario: Optional[str] = None
    password: Optional[str] = None
    prefijo_salida: str = "0"
    canales_max: int = 30
    transporte: str = "udp"

class TrunkUpdate(BaseModel):
    nombre: Optional[str] = None
    proveedor: Optional[str] = None
    host: Optional[str] = None
    usuario: Optional[str] = None
    password: Optional[str] = None
    prefijo_salida: Optional[str] = None
    canales_max: Optional[int] = None
    transporte: Optional[str] = None
    activo: Optional[str] = None

@app.get("/trunks")
def get_trunks(db: Session = Depends(get_db)):
    result = db.execute(text("SELECT * FROM trunks ORDER BY id"))
    return {"data": [dict(r._mapping) for r in result.fetchall()]}

@app.post("/trunks")
def create_trunk(t: TrunkCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    db.execute(text("""
        INSERT INTO trunks (nombre,proveedor,host,usuario,password,prefijo_salida,canales_max,transporte)
        VALUES (:nombre,:proveedor,:host,:usuario,:password,:prefijo_salida,:canales_max,:transporte)
    """), t.dict())
    db.commit()
    return {"status": "ok", "message": f"Trunk {t.nombre} creado"}

@app.put("/trunks/{trunk_id}")
def update_trunk(trunk_id: int, t: TrunkUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    fields = {k:v for k,v in t.dict().items() if v is not None}
    if not fields:
        raise HTTPException(status_code=400, detail="Sin campos para actualizar")
    sets = ", ".join([f"{k} = :{k}" for k in fields])
    fields["id"] = trunk_id
    db.execute(text(f"UPDATE trunks SET {sets} WHERE id = :id"), fields)
    db.commit()
    return {"status": "ok", "message": "Trunk actualizado"}

@app.delete("/trunks/{trunk_id}")
def delete_trunk(trunk_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    db.execute(text("UPDATE trunks SET activo='no' WHERE id = :id"), {"id": trunk_id})
    db.commit()
    return {"status": "ok", "message": "Trunk desactivado"}

# ─── PLANES ───────────────────────────────────────────
class PlanCreate(BaseModel):
    nombre: str
    descripcion: Optional[str] = None
    pension_mensual: float = 0
    minutos_incluidos: int = 0
    minutos_onnet: int = 0
    tarifa_local: float = 0
    tarifa_regional: float = 0
    tarifa_nacional: float = 0
    tarifa_celular: float = 0
    tarifa_onnet: float = 0
    tarifa_internacional: float = 0

@app.get("/planes")
def get_planes(db: Session = Depends(get_db)):
    result = db.execute(text("SELECT * FROM planes ORDER BY id"))
    return {"data": [dict(r._mapping) for r in result.fetchall()]}

@app.post("/planes")
def create_plan(p: PlanCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    db.execute(text("INSERT INTO planes (nombre,descripcion,pension_mensual,minutos_incluidos,minutos_onnet,tarifa_local,tarifa_regional,tarifa_nacional,tarifa_celular,tarifa_onnet,tarifa_internacional) VALUES (:nombre,:descripcion,:pension_mensual,:minutos_incluidos,:minutos_onnet,:tarifa_local,:tarifa_regional,:tarifa_nacional,:tarifa_celular,:tarifa_onnet,:tarifa_internacional)"), p.dict())
    db.commit()
    return {"status": "ok", "message": f"Plan {p.nombre} creado"}

@app.delete("/planes/{plan_id}")
def delete_plan(plan_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    db.execute(text("UPDATE planes SET activo='no' WHERE id = :id"), {"id": plan_id})
    db.commit()
    return {"status": "ok", "message": "Plan desactivado"}

# ─── CLIENTES ─────────────────────────────────────────
class ClienteCreate(BaseModel):
    nombre: str
    ruc: Optional[str] = None
    email: Optional[str] = None
    telefono: Optional[str] = None
    plan_id: Optional[int] = None
    credito_limite: float = 0


@app.post("/planes/{plan_id}/activar")
def activar_plan(plan_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    db.execute(text("UPDATE planes SET activo='yes' WHERE id = :id"), {"id": plan_id})
    db.commit()
    return {"status": "ok", "message": "Plan activado"}

@app.get("/clientes")
def get_clientes(db: Session = Depends(get_db), page: int = 1, limit: int = 50, search: str = "", plan_id: str = "", activo: str = "", tipo_identificacion: str = "", tipo_cuenta: str = "", ciudad: str = ""):
    offset = (page - 1) * limit
    conditions = []
    params = {"limit": limit, "offset": offset}
    if search:
        conditions.append("(c.nombre LIKE :search OR c.ruc LIKE :search OR c.email LIKE :search)")
        params["search"] = f"%{search}%"
    if plan_id == "null":
        conditions.append("c.plan_id IS NULL")
    elif plan_id:
        conditions.append("c.plan_id = :plan_id")
        params["plan_id"] = int(plan_id)
    if activo:
        conditions.append("c.activo = :activo")
        params["activo"] = activo
    if tipo_identificacion:
        conditions.append("c.tipo_identificacion = :tipo_id")
        params["tipo_id"] = tipo_identificacion
    if tipo_cuenta:
        conditions.append("c.tipo_cuenta = :tipo_cuenta")
        params["tipo_cuenta"] = tipo_cuenta
    if ciudad:
        conditions.append("c.ciudad_codigo = :ciudad")
        params["ciudad"] = ciudad
    where = "WHERE " + " AND ".join(conditions) if conditions else ""
    total = db.execute(text(f"SELECT COUNT(*) FROM clientes c {where}"), params).scalar()
    result = db.execute(text(f"SELECT c.*, p.nombre as plan_nombre FROM clientes c LEFT JOIN planes p ON c.plan_id = p.id {where} ORDER BY c.nombre LIMIT :limit OFFSET :offset"), params)
    return {"data": [dict(r._mapping) for r in result.fetchall()], "total": total, "page": page, "limit": limit, "pages": (total + limit - 1) // limit}
@app.post("/clientes")
def create_cliente(c: ClienteCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    db.execute(text("""
        INSERT INTO clientes (nombre,ruc,email,telefono,plan_id,credito_limite)
        VALUES (:nombre,:ruc,:email,:telefono,:plan_id,:credito_limite)
    """), c.dict())
    db.commit()
    return {"status": "ok", "message": f"Cliente {c.nombre} creado"}

@app.delete("/clientes/{cliente_id}")
def delete_cliente(cliente_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    db.execute(text("UPDATE clientes SET activo='no' WHERE id = :id"), {"id": cliente_id})
    db.commit()
    return {"status": "ok", "message": "Cliente desactivado"}


@app.put("/clientes/{cliente_id}")
def update_cliente(cliente_id: int, data: dict, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    fields = {k:v for k,v in data.items() if v is not None}
    if not fields:
        raise HTTPException(status_code=400, detail="Sin campos para actualizar")
    sets = ", ".join([f"{k} = :{k}" for k in fields])
    fields["id"] = cliente_id
    db.execute(text(f"UPDATE clientes SET {sets} WHERE id = :id"), fields)
    db.commit()
    return {"status": "ok", "message": "Cliente actualizado"}


@app.put("/clientes/{cliente_id}")
def update_cliente(cliente_id: int, data: dict, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    fields = {k:v for k,v in data.items() if v is not None}
    if not fields:
        raise HTTPException(status_code=400, detail="Sin campos para actualizar")
    sets = ", ".join([f"{k} = :{k}" for k in fields])
    fields["id"] = cliente_id
    db.execute(text(f"UPDATE clientes SET {sets} WHERE id = :id"), fields)
    db.commit()
    return {"status": "ok", "message": "Cliente actualizado"}

# ─── DID SERIES ───────────────────────────────────────
class DIDCreate(BaseModel):
    trunk_id: Optional[int] = None
    cliente_id: Optional[int] = None
    numero_inicio: str
    numero_fin: Optional[str] = None
    ciudad: Optional[str] = None
    pais: str = "Ecuador"

@app.get("/did-series")
def get_did_series(db: Session = Depends(get_db)):
    result = db.execute(text("""
        SELECT d.*, t.nombre as trunk_nombre, c.nombre as cliente_nombre
        FROM did_series d
        LEFT JOIN trunks t ON d.trunk_id = t.id
        LEFT JOIN clientes c ON d.cliente_id = c.id
        ORDER BY d.id
    """))
    return {"data": [dict(r._mapping) for r in result.fetchall()]}

@app.post("/did-series")
def create_did(d: DIDCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    db.execute(text("""
        INSERT INTO did_series (trunk_id,cliente_id,numero_inicio,numero_fin,ciudad,pais)
        VALUES (:trunk_id,:cliente_id,:numero_inicio,:numero_fin,:ciudad,:pais)
    """), d.dict())
    db.commit()
    return {"status": "ok", "message": "Serie DID creada"}

@app.delete("/did-series/{did_id}")
def delete_did(did_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    db.execute(text("UPDATE did_series SET activo='no' WHERE id = :id"), {"id": did_id})
    db.commit()
    return {"status": "ok", "message": "DID desactivado"}

# ─── DID RANGES ───────────────────────────────────────
@app.get("/did-ranges")
def get_did_ranges(db: Session = Depends(get_db)):
    result = db.execute(text("""
        SELECT *, (cantidad_total - cantidad_usada) as disponibles
        FROM did_ranges ORDER BY provincia, codigo_area, serie_inicio
    """))
    return {"data": [dict(r._mapping) for r in result.fetchall()]}

@app.post("/did-ranges")
def create_did_range(data: dict, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    db.execute(text("""
        INSERT INTO did_ranges (provincia,cod_provincia,codigo_area,serie_inicio,serie_fin,cantidad_total,resolucion_arcotel,fecha_resolucion)
        VALUES (:provincia,:cod_provincia,:codigo_area,:serie_inicio,:serie_fin,:cantidad_total,:resolucion_arcotel,:fecha_resolucion)
    """), data)
    db.commit()
    return {"status": "ok", "message": "Rango agregado"}

# ─── DID ASIGNADOS ────────────────────────────────────
@app.get("/did-asignados")
def get_did_asignados(db: Session = Depends(get_db)):
    result = db.execute(text("""
        SELECT d.*, c.nombre as cliente_nombre, t.nombre as trunk_nombre,
               r.provincia, r.codigo_area
        FROM did_asignados d
        LEFT JOIN clientes c ON d.cliente_id = c.id
        LEFT JOIN trunks t ON d.trunk_id = t.id
        LEFT JOIN did_ranges r ON d.range_id = r.id
        ORDER BY d.fecha_asignacion DESC
    """))
    return {"data": [dict(r._mapping) for r in result.fetchall()]}

@app.post("/did-asignados/asignar")
def asignar_did(data: dict, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    provincia = data.get("provincia")
    codigo_area = data.get("codigo_area")
    cliente_id = data.get("cliente_id")
    trunk_id = data.get("trunk_id")
    did_especifico = data.get("did_especifico")

    if did_especifico:
        # Verificar que no esté asignado
        existe = db.execute(text("SELECT id FROM did_asignados WHERE did_completo = :did"), {"did": did_especifico}).fetchone()
        if existe:
            raise HTTPException(status_code=400, detail=f"El DID {did_especifico} ya está asignado")
        # Buscar el rango al que pertenece
        numero = did_especifico[3:]  # quitar el 593
        area = numero[0]
        serie = numero[1:]
        rango = db.execute(text("""
            SELECT id FROM did_ranges
            WHERE codigo_area = :area AND serie_inicio <= :serie AND serie_fin >= :serie AND activo = 'yes'
            LIMIT 1
        """), {"area": area, "serie": serie}).fetchone()
        range_id = rango[0] if rango else None
        did_final = did_especifico
    else:
        # Buscar siguiente DID disponible del rango solicitado
        if not provincia and not codigo_area:
            raise HTTPException(status_code=400, detail="Debe especificar provincia o codigo_area")
        
        query = "SELECT id, codigo_area, serie_inicio, serie_fin FROM did_ranges WHERE activo='yes' AND cantidad_usada < cantidad_total"
        params = {}
        if provincia:
            query += " AND provincia = :provincia"
            params["provincia"] = provincia.upper()
        if codigo_area:
            query += " AND codigo_area = :codigo_area"
            params["codigo_area"] = codigo_area
        query += " ORDER BY serie_inicio LIMIT 1"
        
        rango = db.execute(text(query), params).fetchone()
        if not rango:
            raise HTTPException(status_code=404, detail="No hay DIDs disponibles para esa provincia")
        
        range_id = rango[0]
        area = rango[1]
        
        # Encontrar el siguiente número libre en ese rango
        inicio = int(rango[2])
        fin = int(rango[3])
        usados = db.execute(text("""
            SELECT did_completo FROM did_asignados
            WHERE range_id = :rid
        """), {"rid": range_id}).fetchall()
        usados_set = {r[0] for r in usados}
        
        did_final = None
        for num in range(inicio, fin + 1):
            candidato = f"593{area}{num}"
            if candidato not in usados_set:
                did_final = candidato
                break
        
        if not did_final:
            raise HTTPException(status_code=404, detail="No hay DIDs disponibles en ese rango")

    # Insertar asignación
    db.execute(text("""
        INSERT INTO did_asignados (did_completo, range_id, cliente_id, trunk_id, estado)
        VALUES (:did, :range_id, :cliente_id, :trunk_id, 'asignado')
    """), {"did": did_final, "range_id": range_id, "cliente_id": cliente_id, "trunk_id": trunk_id})
    
    # Actualizar contador del rango
    db.execute(text("UPDATE did_ranges SET cantidad_usada = cantidad_usada + 1 WHERE id = :id"), {"id": range_id})
    db.commit()
    
    return {"status": "ok", "did_asignado": did_final, "message": f"DID {did_final} asignado correctamente"}

@app.delete("/did-asignados/{did_id}")
def liberar_did(did_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    did = db.execute(text("SELECT range_id FROM did_asignados WHERE id = :id"), {"id": did_id}).fetchone()
    if not did:
        raise HTTPException(status_code=404, detail="DID no encontrado")
    db.execute(text("UPDATE did_asignados SET estado='disponible', fecha_liberacion=NOW() WHERE id = :id"), {"id": did_id})
    db.execute(text("UPDATE did_ranges SET cantidad_usada = cantidad_usada - 1 WHERE id = :id"), {"id": did[0]})
    db.commit()
    return {"status": "ok", "message": "DID liberado"}

# ─── METRICAS ─────────────────────────────────────────
@app.get("/metricas/resumen")
def get_metricas_resumen(meses: int = 6, db: Session = Depends(get_db)):
    result = db.execute(text("""
        SELECT
            COUNT(*) as total_llamadas,
            SUM(CASE WHEN dcontext != 'internal' AND channel LIKE 'PJSIP/%' AND dstchannel LIKE 'PJSIP/trunk%' THEN 1 ELSE 0 END) as salientes,
            SUM(CASE WHEN dcontext != 'internal' AND dstchannel NOT LIKE 'PJSIP/trunk%' THEN 1 ELSE 0 END) as entrantes,
            SUM(CASE WHEN dcontext = 'internal' THEN 1 ELSE 0 END) as onnet,
            ROUND(SUM(billsec)/60, 2) as total_minutos,
            SUM(CASE WHEN disposition = 'ANSWERED' THEN 1 ELSE 0 END) as contestadas,
            SUM(CASE WHEN disposition != 'ANSWERED' THEN 1 ELSE 0 END) as no_contestadas
        FROM cdr
        WHERE calldate >= DATE_SUB(NOW(), INTERVAL :meses MONTH)
    """), {"meses": meses})
    return dict(result.fetchone()._mapping)

@app.get("/metricas/por-mes")
def get_metricas_por_mes(meses: int = 6, db: Session = Depends(get_db)):
    result = db.execute(text("""
        SELECT
            DATE_FORMAT(calldate, '%Y-%m') as mes,
            COUNT(*) as llamadas,
            ROUND(SUM(billsec)/60, 2) as minutos,
            SUM(CASE WHEN dcontext = 'CEL' THEN billsec ELSE 0 END)/60 as min_cel,
            SUM(CASE WHEN dcontext = 'LOC' THEN billsec ELSE 0 END)/60 as min_loc,
            SUM(CASE WHEN dcontext = 'NAC' THEN billsec ELSE 0 END)/60 as min_nac,
            SUM(CASE WHEN dcontext = 'internal' THEN billsec ELSE 0 END)/60 as min_onnet
        FROM cdr
        WHERE calldate >= DATE_SUB(NOW(), INTERVAL :meses MONTH)
        GROUP BY DATE_FORMAT(calldate, '%Y-%m')
        ORDER BY mes
    """), {"meses": meses})
    return {"data": [dict(r._mapping) for r in result.fetchall()]}

@app.get("/metricas/por-contexto")
def get_metricas_por_contexto(meses: int = 6, db: Session = Depends(get_db)):
    result = db.execute(text("""
        SELECT
            dcontext as contexto,
            COUNT(*) as llamadas,
            ROUND(SUM(billsec)/60, 2) as minutos
        FROM cdr
        WHERE calldate >= DATE_SUB(NOW(), INTERVAL :meses MONTH)
        GROUP BY dcontext
        ORDER BY minutos DESC
    """), {"meses": meses})
    return {"data": [dict(r._mapping) for r in result.fetchall()]}

@app.get("/metricas/top-origenes")
def get_top_origenes(meses: int = 6, limit: int = 10, db: Session = Depends(get_db)):
    result = db.execute(text("""
        SELECT src as numero, COUNT(*) as llamadas, ROUND(SUM(billsec)/60,2) as minutos
        FROM cdr
        WHERE calldate >= DATE_SUB(NOW(), INTERVAL :meses MONTH)
        GROUP BY src ORDER BY minutos DESC LIMIT :limit
    """), {"meses": meses, "limit": limit})
    return {"data": [dict(r._mapping) for r in result.fetchall()]}

@app.get("/metricas/top-destinos")
def get_top_destinos(meses: int = 6, limit: int = 10, db: Session = Depends(get_db)):
    result = db.execute(text("""
        SELECT dst as numero, COUNT(*) as llamadas, ROUND(SUM(billsec)/60,2) as minutos
        FROM cdr
        WHERE calldate >= DATE_SUB(NOW(), INTERVAL :meses MONTH)
        GROUP BY dst ORDER BY minutos DESC LIMIT :limit
    """), {"meses": meses, "limit": limit})
    return {"data": [dict(r._mapping) for r in result.fetchall()]}

# ─── USUARIOS Y PERMISOS ──────────────────────────────
from fastapi import Request

class UserCreate(BaseModel):
    username: str
    password: str
    role: str = "admin"
    nombre_completo: Optional[str] = None

class PermisosUpdate(BaseModel):
    permisos: dict

@app.get("/usuarios")
def get_usuarios(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role not in ['superadmin']:
        raise HTTPException(status_code=403, detail="Sin permisos")
    result = db.execute(text("""
        SELECT u.id, u.username, u.role, u.activo, u.nombre_completo, u.created_at,
               u2.username as creado_por
        FROM users u LEFT JOIN users u2 ON u.created_by = u2.id
        ORDER BY u.id
    """))
    users_list = [dict(r._mapping) for r in result.fetchall()]
    for user in users_list:
        perms = db.execute(text("SELECT modulo, puede_ver, puede_editar, puede_crear, puede_eliminar FROM user_permissions WHERE user_id = :id"), {"id": user["id"]})
        user["permisos"] = {r.modulo: dict(r._mapping) for r in perms.fetchall()}
    return {"data": users_list}

@app.post("/usuarios")
def create_usuario(data: UserCreate, request: Request, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    from app.auth import hash_password
    if current_user.role not in ['superadmin']:
        perm = db.execute(text("SELECT puede_crear FROM user_permissions WHERE user_id=:uid AND modulo='usuarios'"), {"uid": current_user.id}).fetchone()
        if not perm or perm.puede_crear != 'yes':
            raise HTTPException(status_code=403, detail="Sin permisos para crear usuarios")
    exists = db.execute(text("SELECT id FROM users WHERE username=:u"), {"u": data.username}).fetchone()
    if exists:
        raise HTTPException(status_code=400, detail="El usuario ya existe")
    db.execute(text("INSERT INTO users (username, password_hash, role, nombre_completo, created_by) VALUES (:u,:p,:r,:n,:cb)"),
        {"u": data.username, "p": hash_password(data.password), "r": data.role, "n": data.nombre_completo, "cb": current_user.id})
    db.commit()
    new_user = db.execute(text("SELECT id FROM users WHERE username=:u"), {"u": data.username}).fetchone()
    db.execute(text("INSERT INTO audit_log (user_id, username, accion, modulo, detalle, ip) VALUES (:uid,:un,:a,:m,:d,:ip)"),
        {"uid": current_user.id, "un": current_user.username, "a": "crear_usuario", "m": "usuarios", "d": f"Creado usuario {data.username}", "ip": request.client.host})
    db.commit()
    return {"status": "ok", "message": f"Usuario {data.username} creado", "id": new_user.id}


@app.put("/usuarios/{user_id}")
def update_usuario(user_id: int, data: dict, request: Request, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    from app.auth import hash_password
    if current_user.role not in ['superadmin']:
        raise HTTPException(status_code=403, detail="Sin permisos")
    user = db.execute(text("SELECT id, username, role FROM users WHERE id=:id"), {"id": user_id}).fetchone()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    updates = []
    params = {"id": user_id}
    if "nombre_completo" in data:
        updates.append("nombre_completo=:nombre_completo")
        params["nombre_completo"] = data["nombre_completo"]
    if "role" in data:
        updates.append("role=:role")
        params["role"] = data["role"]
    if "password" in data and data["password"]:
        updates.append("password_hash=:password_hash")
        params["password_hash"] = hash_password(data["password"])
    if not updates:
        raise HTTPException(status_code=400, detail="Sin datos para actualizar")
    db.execute(text(f"UPDATE users SET {', '.join(updates)} WHERE id=:id"), params)
    db.execute(text("INSERT INTO audit_log (user_id, username, accion, modulo, detalle, ip) VALUES (:uid,:un,:a,:m,:d,:ip)"),
        {"uid": current_user.id, "un": current_user.username, "a": "editar_usuario", "m": "usuarios",
         "d": f"Editado usuario {user.username}", "ip": request.client.host})
    db.commit()
    return {"status": "ok", "message": f"Usuario {user.username} actualizado"}

@app.put("/usuarios/{user_id}/permisos")
def update_permisos(user_id: int, data: PermisosUpdate, request: Request, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role not in ['superadmin']:
        raise HTTPException(status_code=403, detail="Sin permisos")
    for modulo, perms in data.permisos.items():
        db.execute(text("""
            INSERT INTO user_permissions (user_id, modulo, puede_ver, puede_editar, puede_crear, puede_eliminar)
            VALUES (:uid, :mod, :ver, :edi, :cre, :eli)
            ON DUPLICATE KEY UPDATE puede_ver=:ver, puede_editar=:edi, puede_crear=:cre, puede_eliminar=:eli
        """), {"uid": user_id, "mod": modulo, "ver": perms.get("puede_ver","no"), "edi": perms.get("puede_editar","no"), "cre": perms.get("puede_crear","no"), "eli": perms.get("puede_eliminar","no")})
    db.execute(text("INSERT INTO audit_log (user_id, username, accion, modulo, detalle, ip) VALUES (:uid,:un,:a,:m,:d,:ip)"),
        {"uid": current_user.id, "un": current_user.username, "a": "actualizar_permisos", "m": "usuarios", "d": f"Permisos actualizados para user_id {user_id}", "ip": request.client.host})
    db.commit()
    return {"status": "ok", "message": "Permisos actualizados"}

@app.put("/usuarios/{user_id}/toggle")
def toggle_usuario(user_id: int, request: Request, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role not in ['superadmin']:
        raise HTTPException(status_code=403, detail="Sin permisos")
    user = db.execute(text("SELECT username, activo FROM users WHERE id=:id"), {"id": user_id}).fetchone()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    new_status = 'no' if user.activo == 'yes' else 'yes'
    db.execute(text("UPDATE users SET activo=:a WHERE id=:id"), {"a": new_status, "id": user_id})
    db.execute(text("INSERT INTO audit_log (user_id, username, accion, modulo, detalle, ip) VALUES (:uid,:un,:a,:m,:d,:ip)"),
        {"uid": current_user.id, "un": current_user.username, "a": "toggle_usuario", "m": "usuarios", "d": f"Usuario {user.username} -> {new_status}", "ip": request.client.host})
    db.commit()
    return {"status": "ok", "message": f"Usuario {user.username} {'activado' if new_status=='yes' else 'desactivado'}"}

@app.get("/audit-log")
def get_audit_log(
    modulo: str = None,
    username: str = None,
    limit: int = 200,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role not in ['superadmin']:
        raise HTTPException(status_code=403, detail="Sin permisos")
    query = """
        SELECT a.id, a.user_id, a.username, a.accion, a.modulo, a.detalle, a.ip, a.created_at,
               COALESCE(u.role, 'admin') AS user_role
        FROM audit_log a
        LEFT JOIN users u ON a.user_id = u.id
        WHERE 1=1
    """
    params = {}
    if modulo:
        query += " AND a.modulo = :modulo"
        params["modulo"] = modulo
    if username:
        query += " AND a.username LIKE :username"
        params["username"] = f"%{username}%"
    query += " ORDER BY a.created_at DESC LIMIT :limit"
    params["limit"] = limit
    result = db.execute(text(query), params)
    rows = result.fetchall()
    return {"total": len(rows), "data": [dict(r._mapping) for r in rows]}


# ─── API v1 — Netvoice Softswitch ────────────────────────────
from app.routers import auth_v1
app.include_router(auth_v1.router)


# ─── Gateway Middleware v1 ────────────────────────────────────
from app.middleware_nv import NetvoiceGatewayMiddleware
app.add_middleware(NetvoiceGatewayMiddleware)
from app.routers import onboarding_v1
app.include_router(onboarding_v1.router)
from app.routers import contracts_v1
app.include_router(contracts_v1.router)
from app.routers import payments_v1
app.include_router(payments_v1.router)
from app.routers import activation_v1
app.include_router(activation_v1.router)
from app.routers import did_v1
app.include_router(did_v1.router)
from app.routers import partners_v1
app.include_router(partners_v1.router)

# ─── NOC / HEALTH ─────────────────────────────────────────────
import psutil as _psutil
import time as _time

@app.get("/noc/health")
def noc_health():
    cpu  = _psutil.cpu_percent(interval=0.5)
    mem  = _psutil.virtual_memory()
    disk = _psutil.disk_usage("/")
    up   = int(_time.time() - _psutil.boot_time())
    d,h,m = up//86400, (up%86400)//3600, (up%3600)//60
    return {
        "status":       "online",
        "cpu_pct":      round(cpu, 1),
        "mem_total_mb": round(mem.total/1024/1024),
        "mem_used_mb":  round(mem.used/1024/1024),
        "mem_pct":      round(mem.percent, 1),
        "disk_total_gb":round(disk.total/1024/1024/1024, 1),
        "disk_used_gb": round(disk.used/1024/1024/1024, 1),
        "disk_pct":     round(disk.percent, 1),
        "uptime_sec":   up,
        "uptime_str":   f"{d}d {h}h {m}m",
        "load_avg":     [round(x,2) for x in _psutil.getloadavg()],
    }

@app.get("/noc/db")
def noc_db(db: Session = Depends(get_db)):
    try:
        from sqlalchemy import text as _text
        cdr_hoy = db.execute(_text(
            "SELECT COUNT(*) FROM cdr WHERE calldate >= CURDATE()"
        )).scalar() or 0
        row = db.execute(_text(
            "SHOW STATUS LIKE \'Threads_connected\'"
        )).fetchone()
        threads = int(row[1]) if row else 0
        cdr_mes = db.execute(_text(
            "SELECT COUNT(*) FROM cdr WHERE calldate >= DATE_SUB(NOW(),INTERVAL 30 DAY)"
        )).scalar() or 0
        return {"status":"online","cdr_today":cdr_hoy,"cdr_month":cdr_mes,"connections":threads}
    except Exception as e:
        return {"status":"error","error":str(e)}

@app.get("/noc/network")
def noc_network():
    try:
        net   = _psutil.net_io_counters()
        conns = len(_psutil.net_connections())
        procs = len(_psutil.pids())
        return {
            "status":        "online",
            "bytes_sent_mb": round(net.bytes_sent/1024/1024, 1),
            "bytes_recv_mb": round(net.bytes_recv/1024/1024, 1),
            "connections":   conns,
            "processes":     procs,
        }
    except Exception as e:
        return {"status":"error","error":str(e)}

# ─── ANTIFRAUDE ───────────────────────────────────────────────
from sqlalchemy import text as _text2

@app.get("/fraud/blacklist")
def get_blacklist(db: Session = Depends(get_db)):
    r = db.execute(_text2("SELECT * FROM fraud_blacklist ORDER BY created_at DESC"))
    return {"data": [dict(x._mapping) for x in r.fetchall()]}

@app.post("/fraud/blacklist")
def add_blacklist(data: dict, db: Session = Depends(get_db), u=Depends(get_current_user)):
    db.execute(_text2("INSERT IGNORE INTO fraud_blacklist (tipo,valor,motivo,created_by) VALUES (:tipo,:valor,:motivo,:by)"),
        {"tipo":data.get("tipo","numero"),"valor":data["valor"],"motivo":data.get("motivo",""),"by":u.username})
    db.commit()
    return {"status":"ok"}

@app.delete("/fraud/blacklist/{id}")
def del_blacklist(id: int, db: Session = Depends(get_db), u=Depends(get_current_user)):
    db.execute(_text2("UPDATE fraud_blacklist SET activo='no' WHERE id=:id"),{"id":id})
    db.commit()
    return {"status":"ok"}

@app.get("/fraud/whitelist")
def get_whitelist(db: Session = Depends(get_db)):
    r = db.execute(_text2("SELECT * FROM fraud_whitelist ORDER BY created_at DESC"))
    return {"data": [dict(x._mapping) for x in r.fetchall()]}

@app.post("/fraud/whitelist")
def add_whitelist(data: dict, db: Session = Depends(get_db), u=Depends(get_current_user)):
    db.execute(_text2("INSERT IGNORE INTO fraud_whitelist (tipo,valor,motivo) VALUES (:tipo,:valor,:motivo)"),
        {"tipo":data.get("tipo","numero"),"valor":data["valor"],"motivo":data.get("motivo","")})
    db.commit()
    return {"status":"ok"}

@app.delete("/fraud/whitelist/{id}")
def del_whitelist(id: int, db: Session = Depends(get_db), u=Depends(get_current_user)):
    db.execute(_text2("UPDATE fraud_whitelist SET activo='no' WHERE id=:id"),{"id":id})
    db.commit()
    return {"status":"ok"}

@app.get("/fraud/alerts")
def get_alerts(db: Session = Depends(get_db)):
    r = db.execute(_text2("SELECT * FROM fraud_alerts ORDER BY created_at DESC LIMIT 100"))
    return {"data": [dict(x._mapping) for x in r.fetchall()]}

@app.put("/fraud/alerts/{id}/revisar")
def revisar_alert(id: int, db: Session = Depends(get_db), u=Depends(get_current_user)):
    db.execute(_text2("UPDATE fraud_alerts SET revisado='yes' WHERE id=:id"),{"id":id})
    db.commit()
    return {"status":"ok"}

@app.get("/fraud/stats")
def fraud_stats(db: Session = Depends(get_db)):
    bl  = db.execute(_text2("SELECT COUNT(*) FROM fraud_blacklist WHERE activo='yes'")).scalar() or 0
    wl  = db.execute(_text2("SELECT COUNT(*) FROM fraud_whitelist WHERE activo='yes'")).scalar() or 0
    al  = db.execute(_text2("SELECT COUNT(*) FROM fraud_alerts WHERE revisado='no'")).scalar() or 0
    crit= db.execute(_text2("SELECT COUNT(*) FROM fraud_alerts WHERE nivel='critical' AND revisado='no'")).scalar() or 0
    # Numeros con alto consumo en las ultimas 24h (posible fraude)
    suspicious = db.execute(_text2("""
        SELECT src, COUNT(*) as llamadas, ROUND(SUM(billsec)/60,1) as minutos
        FROM cdr
        WHERE calldate >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
        GROUP BY src HAVING llamadas > 20 OR minutos > 60
        ORDER BY minutos DESC LIMIT 10
    """)).fetchall()
    return {
        "blacklist_count": bl,
        "whitelist_count": wl,
        "alerts_pending":  al,
        "alerts_critical": crit,
        "suspicious": [dict(x._mapping) for x in suspicious],
    }
