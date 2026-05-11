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

@app.get("/extensions")
def get_extensions(db: Session = Depends(get_db)):
    result = db.execute(text("SELECT id, aors, auth, context, allow FROM ps_endpoints"))
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

@app.get("/clientes")
def get_clientes(db: Session = Depends(get_db)):
    result = db.execute(text("""
        SELECT c.*, p.nombre as plan_nombre
        FROM clientes c LEFT JOIN planes p ON c.plan_id = p.id
        ORDER BY c.id
    """))
    return {"data": [dict(r._mapping) for r in result.fetchall()]}

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
