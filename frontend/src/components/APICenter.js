import { useState, useEffect, useCallback } from "react";
import api from "../api";

async function safe(fn) { try { return await fn(); } catch { return null; } }

function fmtDT(d) {
  if (!d) return "—";
  try { return new Date(d).toLocaleString("es-EC",{day:"2-digit",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit",hour12:false}); }
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

function CopyBtn({ value }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(value).then(()=>{ setCopied(true); setTimeout(()=>setCopied(false),2000); });
    }
  };
  return (
    <button className="nv-btn nv-btn-ghost nv-btn-sm" onClick={copy} style={{ flexShrink:0 }}>
      {copied?"✓ Copiado":"Copiar"}
    </button>
  );
}

const ENDPOINTS = [
  { method:"GET",  path:"/v1/partners",           desc:"Listar partners" },
  { method:"POST", path:"/v1/partners",           desc:"Crear partner" },
  { method:"GET",  path:"/v1/partners/{id}",      desc:"Detalle partner" },
  { method:"PUT",  path:"/v1/partners/{id}",      desc:"Actualizar partner" },
  { method:"POST", path:"/v1/partners/{id}/regenerate-key", desc:"Regenerar API key" },
  { method:"GET",  path:"/cdr",                   desc:"CDRs (con token)" },
  { method:"GET",  path:"/clientes",              desc:"Listar clientes" },
  { method:"GET",  path:"/metricas/resumen",      desc:"Metricas resumen" },
  { method:"GET",  path:"/did-asignados",         desc:"DIDs asignados" },
  { method:"POST", path:"/did-asignados/asignar", desc:"Asignar DID" },
  { method:"GET",  path:"/noc/health",            desc:"Health check" },
  { method:"GET",  path:"/fraud/stats",           desc:"Stats antifraude" },
  { method:"GET",  path:"/trunks",                desc:"Listar trunks" },
];

const MC = { GET:"var(--success)", POST:"var(--brand)", PUT:"var(--warning)", DELETE:"var(--danger)" };

export default function APICenter() {
  const [partners, setPartners] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [tab,      setTab]      = useState("partners");
  const [msg,      setMsg]      = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newKey,   setNewKey]   = useState(null);
  const [form,     setForm]     = useState({ name:"", contact_email:"", webhook_url:"" });
  const [busy,     setBusy]     = useState(false);
  const [formErr,  setFormErr]  = useState(null);

  const showMsg = (text,type="success") => { setMsg({text,type}); setTimeout(()=>setMsg(null),5000); };
  const setF = (k,v) => setForm(f=>({...f,[k]:v}));

  const load = useCallback(async () => {
    setLoading(true);
    const r = await safe(()=>api.get("/v1/partners"));
    setPartners(r?.data?.partners||r?.data||[]);
    setLoading(false);
  },[]);

  useEffect(()=>{ load(); },[load]);

  const handleCreate = async () => {
    if (!form.name||!form.contact_email) return setFormErr("Nombre y email son requeridos");
    setBusy(true); setFormErr(null);
    try {
      const r = await api.post("/v1/partners", form);
      setShowCreate(false);
      setForm({ name:"", contact_email:"", webhook_url:"" });
      if (r.data?.api_key) setNewKey(r.data.api_key);
      showMsg("Partner creado");
      load();
    } catch(e) { setFormErr(e?.response?.data?.detail||"Error al crear"); }
    finally { setBusy(false); }
  };

  const handleRegen = async (id) => {
    if (!window.confirm("Regenerar la API key invalida la anterior. Continuar?")) return;
    try {
      const r = await api.post("/v1/partners/"+id+"/regenerate-key");
      if (r.data?.api_key) setNewKey(r.data.api_key);
      showMsg("API key regenerada");
    } catch(e) { showMsg(e?.response?.data?.detail||"Error","error"); }
  };

  const handleToggle = async (p) => {
    try {
      const status = p.status==="active"?"suspended":"active";
      await api.put("/v1/partners/"+p.id,{ status });
      showMsg("Partner "+(status==="active"?"activado":"suspendido"));
      load();
    } catch(e) { showMsg(e?.response?.data?.detail||"Error","error"); }
  };

  const activos = partners.filter(p=>p.status==="active").length;

  return (
    <div>
      <div className="nv-page-header">
        <div>
          <div className="nv-page-title">API Center</div>
          <div className="nv-page-sub">Gestión de tokens, partners e integraciones</div>
        </div>
        <div className="nv-page-actions">
          <button className="nv-btn nv-btn-secondary nv-btn-sm" onClick={load} disabled={loading}>
            {loading?<span className="nv-spinner"/>:"↺"} Actualizar
          </button>
          <button className="nv-btn nv-btn-primary" onClick={()=>setShowCreate(true)}>+ Nuevo partner</button>
        </div>
      </div>

      <div className="nv-kpi-grid" style={{ marginBottom:16 }}>
        <div className="nv-kpi"><div className="nv-kpi-label">Total partners</div><div className="nv-kpi-value" style={{ color:"var(--brand)" }}>{partners.length}</div></div>
        <div className="nv-kpi"><div className="nv-kpi-label">Activos</div><div className="nv-kpi-value" style={{ color:"var(--success)" }}>{activos}</div></div>
        <div className="nv-kpi"><div className="nv-kpi-label">Suspendidos</div><div className="nv-kpi-value" style={{ color:"var(--text-muted)" }}>{partners.length-activos}</div></div>
        <div className="nv-kpi"><div className="nv-kpi-label">Endpoints</div><div className="nv-kpi-value" style={{ color:"var(--info)" }}>{ENDPOINTS.length}</div></div>
      </div>

      <Alert msg={msg} onClose={()=>setMsg(null)}/>

      <div className="nv-tabs">
        {[["partners","Partners"],["docs","Docs API"],["info","Integración"]].map(([k,l])=>(
          <div key={k} className={"nv-tab"+(tab===k?" active":"")} onClick={()=>setTab(k)}>{l}</div>
        ))}
      </div>

      {tab==="partners"&&(
        loading?<div className="nv-loading"><span className="nv-spinner"/></div>:
        partners.length===0?(
          <div className="nv-card" style={{ textAlign:"center",padding:"48px 20px" }}>
            <div style={{ fontSize:32,opacity:.2,marginBottom:12 }}>⊕</div>
            <div style={{ fontSize:13,color:"var(--text-muted)",marginBottom:16 }}>Sin partners registrados</div>
            <button className="nv-btn nv-btn-primary" onClick={()=>setShowCreate(true)}>+ Crear primer partner</button>
          </div>
        ):(
          <div style={{ display:"flex",flexDirection:"column",gap:12 }}>
            {partners.map(p=>(
              <div key={p.id} className="nv-card">
                <div style={{ display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:12 }}>
                  <div>
                    <div style={{ fontSize:14,fontWeight:700,color:"var(--text-primary)" }}>{p.name}</div>
                    <div style={{ fontSize:11,color:"var(--text-muted)" }}>{p.contact_email}</div>
                  </div>
                  <span className={"nv-badge "+(p.status==="active"?"nv-badge-ok":"nv-badge-muted")}>
                    {p.status==="active"?"Activo":"Suspendido"}
                  </span>
                </div>
                <div style={{ display:"flex",alignItems:"center",gap:8,marginBottom:10 }}>
                  <div style={{ flex:1,background:"var(--bg-raised)",borderRadius:"var(--r-sm)",padding:"7px 12px",
                    fontFamily:"var(--font-mono)",fontSize:11,color:"var(--text-muted)",
                    overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>
                    {p.api_key_preview||"nv_••••••••••••••••"}
                  </div>
                  <button className="nv-btn nv-btn-ghost nv-btn-sm" onClick={()=>handleRegen(p.id)}>↻ Regen</button>
                  <button className="nv-btn nv-btn-sm" onClick={()=>handleToggle(p)}
                    style={{ background:p.status==="active"?"var(--warning-bg)":"var(--success-bg)",
                      color:p.status==="active"?"var(--warning)":"var(--success)",
                      border:"none",borderRadius:"var(--r-sm)",padding:"4px 10px",fontSize:11,cursor:"pointer" }}>
                    {p.status==="active"?"⏸ Suspender":"▶ Activar"}
                  </button>
                </div>
                {p.webhook_url&&(
                  <div style={{ fontSize:10,color:"var(--text-muted)",fontFamily:"var(--font-mono)" }}>
                    Webhook: {p.webhook_url}
                  </div>
                )}
              </div>
            ))}
          </div>
        )
      )}

      {tab==="docs"&&(
        <div className="nv-card">
          <div className="nv-card-header">
            <span className="nv-card-title">▦ Endpoints disponibles</span>
            <a href="/docs" target="_blank" className="nv-btn nv-btn-ghost nv-btn-sm">Swagger ↗</a>
          </div>
          <div className="nv-table-wrap">
            <table className="nv-table">
              <thead><tr><th>Método</th><th>Endpoint</th><th>Descripción</th></tr></thead>
              <tbody>
                {ENDPOINTS.map((e,i)=>(
                  <tr key={i}>
                    <td><span style={{ fontSize:10,fontWeight:700,padding:"2px 7px",borderRadius:4,
                      background:(MC[e.method]||"var(--text-muted)")+"22",color:MC[e.method]||"var(--text-muted)",
                      fontFamily:"var(--font-mono)" }}>{e.method}</span></td>
                    <td style={{ fontFamily:"var(--font-mono)",fontSize:11,color:"var(--brand)" }}>{e.path}</td>
                    <td style={{ fontSize:12,color:"var(--text-secondary)" }}>{e.desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab==="info"&&(
        <div className="nv-grid-2">
          <div className="nv-card">
            <div className="nv-card-header"><span className="nv-card-title">Autenticación</span></div>
            <div style={{ fontSize:12,color:"var(--text-secondary)",lineHeight:1.8,marginBottom:12 }}>
              Header requerido en cada request:
            </div>
            <div style={{ background:"var(--bg-raised)",borderRadius:"var(--r-sm)",padding:"12px",marginBottom:12 }}>
              <div style={{ fontFamily:"var(--font-mono)",fontSize:11,color:"var(--success)",lineHeight:1.8 }}>
                X-API-Key: nv_tu_api_key_aqui
              </div>
            </div>
          </div>
          <div className="nv-card">
            <div className="nv-card-header"><span className="nv-card-title">URLs base</span></div>
            <div style={{ display:"flex",flexDirection:"column",gap:8 }}>
              {[
                ["Producción",   "https://panel.eneural.org"],
                ["API v1",       "https://panel.eneural.org/v1"],
                ["Swagger",      "https://panel.eneural.org/docs"],
                ["Health",       "https://panel.eneural.org/noc/health"],
              ].map(([lbl,url])=>(
                <div key={lbl} style={{ display:"flex",alignItems:"center",gap:8,padding:"8px 10px",background:"var(--bg-raised)",borderRadius:"var(--r-sm)" }}>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:9,textTransform:"uppercase",color:"var(--text-muted)",marginBottom:1 }}>{lbl}</div>
                    <div style={{ fontSize:11,fontFamily:"var(--font-mono)",color:"var(--brand)" }}>{url}</div>
                  </div>
                  <CopyBtn value={url}/>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {showCreate&&(
        <div className="nv-modal-overlay" onClick={e=>e.target===e.currentTarget&&setShowCreate(false)}>
          <div className="nv-modal">
            <div className="nv-modal-header">
              <span className="nv-modal-title">Nuevo partner API</span>
              <button className="nv-modal-close" onClick={()=>setShowCreate(false)}>✕</button>
            </div>
            {formErr&&<div className="nv-alert nv-alert-err" style={{ marginBottom:14 }}>{formErr}</div>}
            <div className="nv-form-row">
              <div className="nv-form-field">
                <label className="nv-label">Nombre *</label>
                <input className="nv-input" value={form.name} onChange={e=>setF("name",e.target.value)} placeholder="ej: Integrador CRM"/>
              </div>
              <div className="nv-form-field">
                <label className="nv-label">Email *</label>
                <input className="nv-input" type="email" value={form.contact_email} onChange={e=>setF("contact_email",e.target.value)} placeholder="api@empresa.com"/>
              </div>
            </div>
            <div className="nv-form-field" style={{ marginBottom:16 }}>
              <label className="nv-label">Webhook URL</label>
              <input className="nv-input" value={form.webhook_url} onChange={e=>setF("webhook_url",e.target.value)} placeholder="https://miempresa.com/webhook" style={{ fontFamily:"var(--font-mono)" }}/>
            </div>
            <div className="nv-modal-footer">
              <button className="nv-btn nv-btn-ghost" onClick={()=>setShowCreate(false)}>Cancelar</button>
              <button className="nv-btn nv-btn-primary" onClick={handleCreate} disabled={busy}>
                {busy?<span className="nv-spinner"/>:"+ Crear partner"}
              </button>
            </div>
          </div>
        </div>
      )}

      {newKey&&(
        <div className="nv-modal-overlay">
          <div className="nv-modal">
            <div className="nv-modal-header"><span className="nv-modal-title">API Key generada</span></div>
            <div className="nv-alert nv-alert-warn" style={{ marginBottom:14 }}>
              Guarda esta clave ahora. No se mostrará nuevamente.
            </div>
            <div style={{ background:"var(--bg-raised)",borderRadius:"var(--r-sm)",padding:"12px",marginBottom:14 }}>
              <div style={{ fontFamily:"var(--font-mono)",fontSize:12,color:"var(--success)",wordBreak:"break-all" }}>{newKey}</div>
            </div>
            <div style={{ display:"flex",gap:8,justifyContent:"flex-end" }}>
              <CopyBtn value={newKey}/>
              <button className="nv-btn nv-btn-primary" onClick={()=>setNewKey(null)}>✓ Entendido</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
