import { useState, useEffect, useCallback } from "react";
import api from "../api";

async function safe(fn) { try { return await fn(); } catch { return null; } }

function fmtDT(d) {
  if (!d) return "—";
  try { return new Date(d).toLocaleString("es-EC",{day:"2-digit",month:"short",year:"numeric",hour12:false}); }
  catch { return d; }
}

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

export default function Revendedores() {
  const [partners, setPartners] = useState([]);
  const [clients,  setClients]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [tab,      setTab]      = useState("lista");
  const [msg,      setMsg]      = useState(null);
  const [selected, setSelected] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [form,     setForm]     = useState({ name:"", contact_email:"", webhook_url:"" });
  const [busy,     setBusy]     = useState(false);
  const [formErr,  setFormErr]  = useState(null);

  const showMsg = (text,type="success") => { setMsg({text,type}); setTimeout(()=>setMsg(null),4000); };
  const setF = (k,v) => setForm(f=>({...f,[k]:v}));

  const load = useCallback(async () => {
    setLoading(true);
    const [p,c] = await Promise.all([
      safe(()=>api.get("/v1/partners")),
      safe(()=>api.get("/clientes?limit=2000")),
    ]);
    setPartners(p?.data?.partners||p?.data||[]);
    setClients(c?.data?.data||[]);
    setLoading(false);
  },[]);

  useEffect(()=>{ load(); },[load]);

  const handleCreate = async () => {
    if (!form.name||!form.contact_email) return setFormErr("Nombre y email requeridos");
    setBusy(true); setFormErr(null);
    try {
      await api.post("/v1/partners", form);
      setShowCreate(false);
      setForm({name:"",contact_email:"",webhook_url:""});
      showMsg("Revendedor creado");
      load();
    } catch(e) { setFormErr(e?.response?.data?.detail||"Error al crear"); }
    finally { setBusy(false); }
  };

  const handleToggle = async (p) => {
    try {
      const status = p.status==="active"?"suspended":"active";
      await api.put("/v1/partners/"+p.id,{status});
      showMsg("Revendedor "+(status==="active"?"activado":"suspendido"));
      load();
    } catch(e) { showMsg(e?.response?.data?.detail||"Error","error"); }
  };

  const partnerClients = (pid) => clients.filter(c=>c.partner_id===pid||c.reseller_id===pid);
  const activos = partners.filter(p=>p.status==="active").length;

  const TABS = [
    { key:"lista",    label:"Revendedores" },
    { key:"clientes", label:"Clientes por revendedor" },
    { key:"config",   label:"White Label" },
  ];

  return (
    <div>
      <div className="nv-page-header">
        <div>
          <div className="nv-page-title">Portal Revendedor</div>
          <div className="nv-page-sub">Gestión de socios comerciales y white label</div>
        </div>
        <div className="nv-page-actions">
          <button className="nv-btn nv-btn-secondary nv-btn-sm" onClick={load} disabled={loading}>
            {loading?<span className="nv-spinner"/>:"↺"} Actualizar
          </button>
          <button className="nv-btn nv-btn-primary" onClick={()=>setShowCreate(true)}>+ Nuevo revendedor</button>
        </div>
      </div>

      <div className="nv-kpi-grid" style={{ marginBottom:16 }}>
        <div className="nv-kpi"><div className="nv-kpi-label">Total</div><div className="nv-kpi-value" style={{ color:"var(--brand)" }}>{partners.length}</div></div>
        <div className="nv-kpi"><div className="nv-kpi-label">Activos</div><div className="nv-kpi-value" style={{ color:"var(--success)" }}>{activos}</div></div>
        <div className="nv-kpi"><div className="nv-kpi-label">Suspendidos</div><div className="nv-kpi-value" style={{ color:"var(--text-muted)" }}>{partners.length-activos}</div></div>
        <div className="nv-kpi"><div className="nv-kpi-label">Clientes totales</div><div className="nv-kpi-value" style={{ color:"var(--info)" }}>{clients.length.toLocaleString()}</div></div>
      </div>

      <Alert msg={msg} onClose={()=>setMsg(null)}/>

      <div className="nv-tabs">
        {TABS.map(t=>(<div key={t.key} className={"nv-tab"+(tab===t.key?" active":"")} onClick={()=>setTab(t.key)}>{t.label}</div>))}
      </div>

      {tab==="lista"&&(
        loading?<div className="nv-loading"><span className="nv-spinner"/></div>:
        partners.length===0?(
          <div className="nv-card" style={{ textAlign:"center",padding:"48px 20px" }}>
            <div style={{ fontSize:32,opacity:.2,marginBottom:12 }}>⌂</div>
            <div style={{ fontSize:13,color:"var(--text-muted)",marginBottom:16 }}>Sin revendedores registrados</div>
            <button className="nv-btn nv-btn-primary" onClick={()=>setShowCreate(true)}>+ Crear primer revendedor</button>
          </div>
        ):(
          <div style={{ display:"flex",flexDirection:"column",gap:12 }}>
            {partners.map(p=>(
              <div key={p.id} className="nv-card">
                <div style={{ display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:14 }}>
                  <div style={{ display:"flex",alignItems:"center",gap:12 }}>
                    <div style={{ width:44,height:44,borderRadius:"var(--r-md)",background:p.status==="active"?"var(--success-bg)":"var(--bg-raised)",
                      display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,fontWeight:700,
                      color:p.status==="active"?"var(--success)":"var(--text-muted)" }}>
                      {(p.name||"?").slice(0,1).toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontSize:14,fontWeight:700,color:"var(--text-primary)" }}>{p.name}</div>
                      <div style={{ fontSize:11,color:"var(--text-muted)" }}>{p.contact_email}</div>
                    </div>
                  </div>
                  <span className={"nv-badge "+(p.status==="active"?"nv-badge-ok":"nv-badge-muted")}>
                    <span className="dot"/>{p.status==="active"?"Activo":"Suspendido"}
                  </span>
                </div>
                <div style={{ display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,marginBottom:12 }}>
                  {[
                    { lbl:"Clientes",  val:String(partnerClients(p.id).length) },
                    { lbl:"Creado",    val:fmtDT(p.created_at) },
                    { lbl:"API Key",   val:p.api_key_preview||"nv_••••••••" },
                  ].map(({lbl,val})=>(
                    <div key={lbl} style={{ background:"var(--bg-raised)",borderRadius:"var(--r-sm)",padding:"7px 10px" }}>
                      <div style={{ fontSize:9,textTransform:"uppercase",letterSpacing:".07em",color:"var(--text-muted)",marginBottom:2 }}>{lbl}</div>
                      <div style={{ fontSize:11,fontWeight:600,color:"var(--text-primary)",fontFamily:"var(--font-mono)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{val}</div>
                    </div>
                  ))}
                </div>
                <div style={{ display:"flex",gap:8 }}>
                  <button className="nv-btn nv-btn-ghost nv-btn-sm" onClick={()=>{ setSelected(p); setTab("clientes"); }}>
                    ▦ Ver {partnerClients(p.id).length} clientes
                  </button>
                  <button className="nv-btn nv-btn-sm" onClick={()=>handleToggle(p)}
                    style={{ background:p.status==="active"?"var(--warning-bg)":"var(--success-bg)",
                      color:p.status==="active"?"var(--warning)":"var(--success)",
                      border:"none",borderRadius:"var(--r-sm)",padding:"4px 10px",fontSize:11,cursor:"pointer" }}>
                    {p.status==="active"?"⏸ Suspender":"▶ Activar"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {tab==="clientes"&&(
        <div>
          {partners.map(p=>(
            <div key={p.id} className="nv-card" style={{ marginBottom:14 }}>
              <div className="nv-card-header">
                <span className="nv-card-title">{p.name}</span>
                <span className="nv-badge nv-badge-info">{partnerClients(p.id).length} clientes</span>
              </div>
              {partnerClients(p.id).length===0?(
                <div style={{ fontSize:12,color:"var(--text-muted)",padding:"12px 0" }}>Sin clientes asignados</div>
              ):(
                <div className="nv-table-wrap">
                  <table className="nv-table">
                    <thead><tr><th>Cliente</th><th>Plan</th><th>Estado</th><th>Ciudad</th></tr></thead>
                    <tbody>
                      {partnerClients(p.id).map(c=>(
                        <tr key={c.id}>
                          <td style={{ fontWeight:500 }}>{c.nombre||c.name||"—"}</td>
                          <td><span className="nv-badge nv-badge-info">{c.plan_nombre||"—"}</span></td>
                          <td><span className={"nv-badge "+(c.status==="active"?"nv-badge-ok":"nv-badge-muted")}>{c.status||"—"}</span></td>
                          <td style={{ fontSize:11,color:"var(--text-muted)" }}>{c.ciudad||"—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))}
          {partners.length===0&&<div className="nv-card" style={{ textAlign:"center",padding:32,color:"var(--text-muted)" }}>Sin revendedores</div>}
        </div>
      )}

      {tab==="config"&&(
        <div className="nv-grid-2">
          <div className="nv-card">
            <div className="nv-card-header"><span className="nv-card-title">◈ White Label</span></div>
            <div style={{ fontSize:12,color:"var(--text-secondary)",lineHeight:1.8,marginBottom:16 }}>
              Cada revendedor puede tener su propio subdominio y marca visual.
            </div>
            {[["Portal URL","https://revendedor.linkotel.com"],["Logo personalizado","Por implementar"],["Colores propios","Por implementar"],["Dominio custom","Por implementar"]].map(([k,v])=>(
              <div key={k} style={{ display:"flex",justifyContent:"space-between",padding:"8px 0",borderBottom:"1px solid var(--border-subtle)",fontSize:12 }}>
                <span style={{ color:"var(--text-muted)" }}>{k}</span>
                <span style={{ color:"var(--text-secondary)",fontFamily:"var(--font-mono)" }}>{v}</span>
              </div>
            ))}
          </div>
          <div className="nv-card">
            <div className="nv-card-header"><span className="nv-card-title">◈ Comisiones</span></div>
            {[["Modelo","Por cliente activo"],["Comisión base","Por definir con Linkotel"],["Pago mínimo","Por definir"],["Ciclo de pago","Mensual"]].map(([k,v])=>(
              <div key={k} style={{ display:"flex",justifyContent:"space-between",padding:"8px 0",borderBottom:"1px solid var(--border-subtle)",fontSize:12 }}>
                <span style={{ color:"var(--text-muted)" }}>{k}</span>
                <span style={{ color:"var(--text-secondary)" }}>{v}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {showCreate&&(
        <div className="nv-modal-overlay" onClick={e=>e.target===e.currentTarget&&setShowCreate(false)}>
          <div className="nv-modal">
            <div className="nv-modal-header">
              <span className="nv-modal-title">Nuevo revendedor</span>
              <button className="nv-modal-close" onClick={()=>setShowCreate(false)}>✕</button>
            </div>
            {formErr&&<div className="nv-alert nv-alert-err" style={{ marginBottom:14 }}>{formErr}</div>}
            <div className="nv-form-row">
              <div className="nv-form-field">
                <label className="nv-label">Nombre / Empresa *</label>
                <input className="nv-input" value={form.name} onChange={e=>setF("name",e.target.value)} placeholder="ej: TelecomXYZ S.A."/>
              </div>
              <div className="nv-form-field">
                <label className="nv-label">Email de contacto *</label>
                <input className="nv-input" type="email" value={form.contact_email} onChange={e=>setF("contact_email",e.target.value)} placeholder="gerencia@empresa.com"/>
              </div>
            </div>
            <div className="nv-form-field" style={{ marginBottom:16 }}>
              <label className="nv-label">Webhook URL (opcional)</label>
              <input className="nv-input" value={form.webhook_url} onChange={e=>setF("webhook_url",e.target.value)} placeholder="https://miempresa.com/webhook" style={{ fontFamily:"var(--font-mono)" }}/>
            </div>
            <div className="nv-modal-footer">
              <button className="nv-btn nv-btn-ghost" onClick={()=>setShowCreate(false)}>Cancelar</button>
              <button className="nv-btn nv-btn-primary" onClick={handleCreate} disabled={busy}>
                {busy?<span className="nv-spinner"/>:"+ Crear revendedor"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
