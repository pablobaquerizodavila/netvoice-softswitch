import { useState, useEffect, useCallback } from "react";
import api from "../api";

async function safe(fn) { try { return await fn(); } catch { return null; } }

const TRANSPORTES = ["udp","tcp","tls","ws","wss"];

function Alert({ msg, onClose }) {
  if (!msg) return null;
  const cls = {success:"nv-alert-ok",error:"nv-alert-err",warn:"nv-alert-warn"}[msg.type]||"nv-alert-ok";
  return (
    <div className={"nv-alert "+cls} style={{ marginBottom:14 }}>
      <span style={{ flex:1 }}>{msg.text}</span>
      <button onClick={onClose} style={{ background:"none",border:"none",cursor:"pointer",color:"inherit",fontSize:14 }}>✕</button>
    </div>
  );
}

function TrunkModal({ trunk, onClose, onSave }) {
  const isEdit = !!trunk?.id;
  const empty = { nombre:"",proveedor:"",host:"",usuario:"",password:"",prefijo_salida:"0",canales_max:30,transporte:"udp" };
  const [form,setForm] = useState(isEdit ? {...empty,...trunk} : empty);
  const [busy,setBusy] = useState(false);
  const [err,setErr]   = useState(null);
  const [showPwd,setShowPwd] = useState(false);
  const set = (k,v) => setForm(f=>({...f,[k]:v}));

  const submit = async () => {
    if (!form.nombre || !form.host) return setErr("Nombre y host son requeridos");
    setBusy(true); setErr(null);
    try {
      if (isEdit) await api.put("/trunks/"+trunk.id, form);
      else        await api.post("/trunks", form);
      onSave();
    } catch(e) { setErr(e?.response?.data?.detail||"Error al guardar"); }
    finally { setBusy(false); }
  };

  return (
    <div className="nv-modal-overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="nv-modal" style={{ maxWidth:580 }}>
        <div className="nv-modal-header">
          <span className="nv-modal-title">{isEdit?"Editar trunk "+trunk.nombre:"Nuevo trunk SIP"}</span>
          <button className="nv-modal-close" onClick={onClose}>✕</button>
        </div>
        {err && <div className="nv-alert nv-alert-err" style={{ marginBottom:14 }}>{err}</div>}
        <div className="nv-form-row">
          <div className="nv-form-field">
            <label className="nv-label">Nombre *</label>
            <input className="nv-input" value={form.nombre} onChange={e=>set("nombre",e.target.value)} placeholder="ej: CNT-Principal"/>
          </div>
          <div className="nv-form-field">
            <label className="nv-label">Proveedor</label>
            <input className="nv-input" value={form.proveedor||""} onChange={e=>set("proveedor",e.target.value)} placeholder="ej: CNT EP"/>
          </div>
        </div>
        <div className="nv-form-row">
          <div className="nv-form-field">
            <label className="nv-label">Host / IP *</label>
            <input className="nv-input" value={form.host} onChange={e=>set("host",e.target.value)} placeholder="ej: sip.proveedor.com" style={{ fontFamily:"var(--font-mono)" }}/>
          </div>
          <div className="nv-form-field">
            <label className="nv-label">Transporte</label>
            <select className="nv-select" value={form.transporte} onChange={e=>set("transporte",e.target.value)}>
              {TRANSPORTES.map(t=><option key={t} value={t}>{t.toUpperCase()}</option>)}
            </select>
          </div>
        </div>
        <div className="nv-form-row">
          <div className="nv-form-field">
            <label className="nv-label">Usuario SIP</label>
            <input className="nv-input" value={form.usuario||""} onChange={e=>set("usuario",e.target.value)} placeholder="Autenticación"/>
          </div>
          <div className="nv-form-field">
            <label className="nv-label">Password SIP</label>
            <div style={{ position:"relative" }}>
              <input className="nv-input" type={showPwd?"text":"password"} value={form.password||""} onChange={e=>set("password",e.target.value)} style={{ paddingRight:36 }}/>
              <button type="button" onClick={()=>setShowPwd(p=>!p)} style={{ position:"absolute",right:8,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",color:"var(--text-muted)",cursor:"pointer",fontSize:13 }}>{showPwd?"○":"●"}</button>
            </div>
          </div>
        </div>
        <div className="nv-form-row">
          <div className="nv-form-field">
            <label className="nv-label">Prefijo salida</label>
            <input className="nv-input" value={form.prefijo_salida} onChange={e=>set("prefijo_salida",e.target.value)} placeholder="0" style={{ fontFamily:"var(--font-mono)" }}/>
          </div>
          <div className="nv-form-field">
            <label className="nv-label">Canales máx.</label>
            <input className="nv-input" type="number" min="1" max="9999" value={form.canales_max} onChange={e=>set("canales_max",parseInt(e.target.value)||30)}/>
          </div>
        </div>
        <div className="nv-modal-footer">
          <button className="nv-btn nv-btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="nv-btn nv-btn-primary" onClick={submit} disabled={busy}>
            {busy?<span className="nv-spinner"/>:(isEdit?"✓ Guardar cambios":"+ Crear trunk")}
          </button>
        </div>
      </div>
    </div>
  );
}

function TrunkCard({ trunk, cdrStats, onEdit, onToggle, onDelete }) {
  const activo = trunk.activo === "yes";
  const calls  = cdrStats?.llamadas || 0;
  const mins   = cdrStats?.minutos  || 0;
  return (
    <div style={{
      background:"var(--bg-surface)", border:"1px solid var(--border)",
      borderRadius:"var(--r-lg)", padding:"16px 18px",
      borderLeft:"3px solid "+(activo?"var(--success)":"var(--border)"),
      transition:"all var(--t)",
    }}>
      <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:12 }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <div style={{
            width:40, height:40, borderRadius:"var(--r-sm)",
            background:activo?"var(--success-bg)":"var(--bg-raised)",
            display:"flex", alignItems:"center", justifyContent:"center",
            fontSize:18, flexShrink:0,
          }}>{activo?"⊕":"⊝"}</div>
          <div>
            <div style={{ fontSize:13, fontWeight:700, color:"var(--text-primary)" }}>{trunk.nombre}</div>
            <div style={{ fontSize:10, color:"var(--text-muted)", fontFamily:"var(--font-mono)", marginTop:1 }}>{trunk.host}</div>
          </div>
        </div>
        <span className={"nv-badge "+(activo?"nv-badge-ok":"nv-badge-muted")}>
          <span className="dot"/>{activo?"Activo":"Inactivo"}
        </span>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8, marginBottom:14 }}>
        {[
          { lbl:"Proveedor", val:trunk.proveedor||"—" },
          { lbl:"Transporte", val:(trunk.transporte||"udp").toUpperCase() },
          { lbl:"Canales máx.", val:trunk.canales_max||"—" },
          { lbl:"Prefijo", val:trunk.prefijo_salida||"0" },
          { lbl:"Llamadas (30d)", val:calls.toLocaleString() },
          { lbl:"Minutos (30d)", val:Math.round(mins)+" min" },
        ].map(({lbl,val})=>(
          <div key={lbl} style={{ background:"var(--bg-raised)", borderRadius:"var(--r-sm)", padding:"8px 10px" }}>
            <div style={{ fontSize:9, textTransform:"uppercase", letterSpacing:".07em", color:"var(--text-muted)", marginBottom:2 }}>{lbl}</div>
            <div style={{ fontSize:12, fontWeight:600, color:"var(--text-primary)", fontFamily:lbl==="Canales máx."||lbl==="Prefijo"?"var(--font-mono)":"inherit" }}>{val}</div>
          </div>
        ))}
      </div>

      <div style={{ display:"flex", gap:6 }}>
        <button className="nv-btn nv-btn-ghost nv-btn-sm" style={{ flex:1 }} onClick={()=>onEdit(trunk)}>✎ Editar</button>
        <button className={"nv-btn nv-btn-sm "+(activo?"nv-btn-warning":"nv-btn-secondary")} onClick={()=>onToggle(trunk)}
          style={{ background:activo?"var(--warning-bg)":"var(--bg-raised)", color:activo?"var(--warning)":"var(--text-secondary)", borderColor:activo?"rgba(245,166,35,.3)":"var(--border)" }}>
          {activo?"⏸ Desactivar":"▶ Activar"}
        </button>
        <button className="nv-btn nv-btn-danger nv-btn-sm" onClick={()=>onDelete(trunk)} title="Eliminar">✕</button>
      </div>
    </div>
  );
}

export default function Carriers() {
  const [data,   setData]   = useState([]);
  const [stats,  setStats]  = useState({});
  const [loading,setLoading]= useState(true);
  const [modal,  setModal]  = useState(null);
  const [target, setTarget] = useState(null);
  const [msg,    setMsg]    = useState(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [delConf,setDelConf]= useState(null);

  const showMsg = (text,type="success") => { setMsg({text,type}); setTimeout(()=>setMsg(null),4000); };

  const load = useCallback(async () => {
    setLoading(true);
    const [tr, cdr] = await Promise.all([
      safe(()=>api.get("/trunks")),
      safe(()=>api.get("/metricas/por-contexto?meses=1")),
    ]);
    setData(tr?.data?.data||[]);
    const st = {};
    (cdr?.data?.data||[]).forEach(r=>{ st[r.contexto]={llamadas:r.llamadas,minutos:r.minutos}; });
    setStats(st);
    setLoading(false);
  }, []);

  useEffect(()=>{ load(); },[load]);

  const handleToggle = async (trunk) => {
    try {
      await api.put("/trunks/"+trunk.id, { activo: trunk.activo==="yes"?"no":"yes" });
      showMsg("Trunk "+(trunk.activo==="yes"?"desactivado":"activado"));
      load();
    } catch(e) { showMsg(e?.response?.data?.detail||"Error","error"); }
  };

  const handleDelete = async (trunk) => {
    try {
      await api.delete("/trunks/"+trunk.id);
      showMsg("Trunk "+trunk.nombre+" eliminado");
      load();
    } catch(e) { showMsg(e?.response?.data?.detail||"Error al eliminar","error"); }
    setDelConf(null);
  };

  const filtered = data.filter(t=>{
    const q = search.toLowerCase();
    const matchQ = !q||t.nombre?.toLowerCase().includes(q)||t.host?.toLowerCase().includes(q)||t.proveedor?.toLowerCase().includes(q);
    const matchF = filter==="all"||(filter==="active"&&t.activo==="yes")||(filter==="inactive"&&t.activo!=="yes");
    return matchQ&&matchF;
  });

  const activos   = data.filter(t=>t.activo==="yes").length;
  const inactivos = data.length - activos;
  const totalCanales = data.filter(t=>t.activo==="yes").reduce((s,t)=>s+(t.canales_max||0),0);

  return (
    <div>
      <div className="nv-page-header">
        <div>
          <div className="nv-page-title">Carriers / Troncales SIP</div>
          <div className="nv-page-sub">{data.length} trunks configurados · {activos} activos</div>
        </div>
        <div className="nv-page-actions">
          <button className="nv-btn nv-btn-secondary nv-btn-sm" onClick={load} disabled={loading}>
            {loading?<span className="nv-spinner"/>:"↺"} Actualizar
          </button>
          <button className="nv-btn nv-btn-primary" onClick={()=>setModal("crear")}>+ Nuevo trunk</button>
        </div>
      </div>

      <div className="nv-kpi-grid" style={{ marginBottom:16 }}>
        <div className="nv-kpi">
          <div className="nv-kpi-label">Total trunks</div>
          <div className="nv-kpi-value" style={{ color:"var(--brand)" }}>{data.length}</div>
        </div>
        <div className="nv-kpi">
          <div className="nv-kpi-label">Activos</div>
          <div className="nv-kpi-value" style={{ color:"var(--success)" }}>{activos}</div>
          <div className="nv-kpi-sub">SIP trunks online</div>
        </div>
        <div className="nv-kpi">
          <div className="nv-kpi-label">Inactivos</div>
          <div className="nv-kpi-value" style={{ color:"var(--text-muted)" }}>{inactivos}</div>
        </div>
        <div className="nv-kpi">
          <div className="nv-kpi-label">Canales totales</div>
          <div className="nv-kpi-value" style={{ color:"var(--info)" }}>{totalCanales}</div>
          <div className="nv-kpi-sub">En trunks activos</div>
        </div>
      </div>

      <Alert msg={msg} onClose={()=>setMsg(null)}/>

      <div style={{ display:"flex", gap:10, marginBottom:16, flexWrap:"wrap", alignItems:"center" }}>
        <div className="nv-search" style={{ flex:1, minWidth:200 }}>
          <span style={{ color:"var(--text-muted)", fontSize:12 }}>⌕</span>
          <input placeholder="Buscar por nombre, host o proveedor..." value={search} onChange={e=>setSearch(e.target.value)}/>
          {search&&<button onClick={()=>setSearch("")} style={{ background:"none",border:"none",color:"var(--text-muted)",cursor:"pointer" }}>✕</button>}
        </div>
        <div style={{ display:"flex", gap:4 }}>
          {[["all","Todos"],["active","Activos"],["inactive","Inactivos"]].map(([k,l])=>(
            <button key={k} className={"nv-btn nv-btn-sm "+(filter===k?"nv-btn-secondary":"nv-btn-ghost")} onClick={()=>setFilter(k)}>{l}</button>
          ))}
        </div>
      </div>

      {loading&&!data.length ? (
        <div className="nv-loading"><span className="nv-spinner"/><span>Cargando trunks...</span></div>
      ) : filtered.length===0 ? (
        <div className="nv-card" style={{ textAlign:"center", padding:"48px 20px" }}>
          <div style={{ fontSize:32, opacity:.2, marginBottom:12 }}>⊕</div>
          <div style={{ fontSize:13, color:"var(--text-muted)", marginBottom:16 }}>{search?"Sin resultados":"Sin trunks configurados"}</div>
          {!search&&<button className="nv-btn nv-btn-primary" onClick={()=>setModal("crear")}>+ Crear primer trunk</button>}
        </div>
      ) : (
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(340px,1fr))", gap:14 }}>
          {filtered.map(t=>(
            <TrunkCard key={t.id} trunk={t} cdrStats={stats[t.nombre]}
              onEdit={t=>{ setTarget(t); setModal("editar"); }}
              onToggle={handleToggle}
              onDelete={t=>setDelConf(t)}/>
          ))}
        </div>
      )}

      {(modal==="crear"||modal==="editar") && (
        <TrunkModal
          trunk={modal==="editar"?target:null}
          onClose={()=>setModal(null)}
          onSave={()=>{ setModal(null); load(); showMsg(modal==="crear"?"Trunk creado":"Trunk actualizado"); }}/>
      )}

      {delConf&&(
        <div className="nv-modal-overlay" onClick={()=>setDelConf(null)}>
          <div className="nv-modal" style={{ maxWidth:380 }} onClick={e=>e.stopPropagation()}>
            <div className="nv-modal-header">
              <span className="nv-modal-title">Eliminar trunk</span>
              <button className="nv-modal-close" onClick={()=>setDelConf(null)}>✕</button>
            </div>
            <p style={{ fontSize:13, color:"var(--text-secondary)", lineHeight:1.6 }}>
              ¿Eliminar el trunk <span style={{ fontFamily:"var(--font-mono)", color:"var(--danger)" }}>{delConf.nombre}</span>? Esta acción no se puede deshacer.
            </p>
            <div className="nv-modal-footer">
              <button className="nv-btn nv-btn-ghost" onClick={()=>setDelConf(null)}>Cancelar</button>
              <button className="nv-btn nv-btn-danger" onClick={()=>handleDelete(delConf)}>Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
