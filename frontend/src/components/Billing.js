import { useState, useEffect, useCallback } from "react";
import api from "../api";

async function safe(fn) { try { return await fn(); } catch { return null; } }

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

function fmt$(v) { return v!=null?"$"+parseFloat(v).toFixed(2):"—"; }

const STATUS_BADGE = {
  paid:      "nv-badge-ok",
  sent:      "nv-badge-info",
  overdue:   "nv-badge-err",
  draft:     "nv-badge-muted",
  cancelled: "nv-badge-muted",
};

export default function Billing() {
  const [stats,   setStats]   = useState(null);
  const [invoices,setInvoices]= useState([]);
  const [config,  setConfig]  = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab,     setTab]     = useState("dashboard");
  const [msg,     setMsg]     = useState(null);
  const [busy,    setBusy]    = useState(false);
  const [filters, setFilters] = useState({ status:"", period:"" });

  const showMsg = (text,type="success") => { setMsg({text,type}); setTimeout(()=>setMsg(null),5000); };

  const load = useCallback(async () => {
    setLoading(true);
    const now = new Date();
    const period = now.getFullYear()+"-"+String(now.getMonth()+1).padStart(2,"0");
    const [s,inv,cfg] = await Promise.all([
      safe(()=>api.get("/billing/stats")),
      safe(()=>api.get("/billing/invoices?period="+period)),
      safe(()=>api.get("/billing/config")),
    ]);
    setStats(s?.data||null);
    setInvoices(inv?.data?.data||[]);
    setConfig(cfg?.data||null);
    setLoading(false);
  },[]);

  useEffect(()=>{ load(); },[load]);

  const handleGenerate = async () => {
    setBusy(true);
    try {
      const now = new Date();
      const period = now.getFullYear()+"-"+String(now.getMonth()+1).padStart(2,"0");
      const r = await api.post("/billing/generate",{ period });
      showMsg("Generadas "+r.data.generated+" facturas para "+r.data.period);
      load();
    } catch(e) { showMsg(e?.response?.data?.detail||"Error al generar","error"); }
    finally { setBusy(false); }
  };

  const handleProcessOverdue = async () => {
    if (!window.confirm("Procesar facturas vencidas y suspender clientes con impago?")) return;
    setBusy(true);
    try {
      const r = await api.post("/billing/process-overdue");
      showMsg("Vencidas: "+r.data.overdue_invoices+" · Suspendidos: "+r.data.suspended_clients);
      load();
    } catch(e) { showMsg(e?.response?.data?.detail||"Error","error"); }
    finally { setBusy(false); }
  };

  const handleMarkPaid = async (id) => {
    try {
      await api.post("/billing/invoices/"+id+"/pay");
      showMsg("Factura marcada como pagada");
      load();
    } catch(e) { showMsg("Error","error"); }
  };

  const handleSaveConfig = async () => {
    setBusy(true);
    try {
      await api.put("/billing/config", config);
      showMsg("Configuración guardada");
    } catch(e) { showMsg(e?.response?.data?.detail||"Error","error"); }
    finally { setBusy(false); }
  };

  const TABS = [
    { key:"dashboard", label:"Dashboard" },
    { key:"invoices",  label:"Facturas" },
    { key:"config",    label:"Configuración" },
  ];

  const now = new Date();
  const currentPeriod = now.getFullYear()+"-"+String(now.getMonth()+1).padStart(2,"0");

  return (
    <div>
      <div className="nv-page-header">
        <div>
          <div className="nv-page-title">Billing — Facturación</div>
          <div className="nv-page-sub">Periodo actual: {currentPeriod} · IVA {config?.tax_pct||12}%</div>
        </div>
        <div className="nv-page-actions">
          <button className="nv-btn nv-btn-ghost nv-btn-sm" onClick={handleProcessOverdue} disabled={busy}>
            ⚠ Procesar vencidas
          </button>
          <button className="nv-btn nv-btn-secondary nv-btn-sm" onClick={load} disabled={loading}>
            {loading?<span className="nv-spinner"/>:"↺"} Actualizar
          </button>
          <button className="nv-btn nv-btn-primary" onClick={handleGenerate} disabled={busy}>
            {busy?<span className="nv-spinner"/>:"+ Generar facturas"}
          </button>
        </div>
      </div>

      <div className="nv-kpi-grid" style={{ marginBottom:16 }}>
        <div className="nv-kpi">
          <div className="nv-kpi-label">Total facturado</div>
          <div className="nv-kpi-value" style={{ color:"var(--brand)" }}>{fmt$(stats?.total_billed)}</div>
          <div className="nv-kpi-sub">{currentPeriod}</div>
        </div>
        <div className="nv-kpi">
          <div className="nv-kpi-label">Cobrado</div>
          <div className="nv-kpi-value" style={{ color:"var(--success)" }}>{fmt$(stats?.collected)}</div>
          <div className="nv-kpi-sub">{stats?.paid||0} facturas pagadas</div>
        </div>
        <div className="nv-kpi">
          <div className="nv-kpi-label">Pendiente</div>
          <div className="nv-kpi-value" style={{ color:"var(--warning)" }}>{stats?.pending||0}</div>
          <div className="nv-kpi-sub">Por cobrar</div>
        </div>
        <div className="nv-kpi">
          <div className="nv-kpi-label">Vencidas</div>
          <div className="nv-kpi-value" style={{ color:(stats?.overdue||0)>0?"var(--danger)":"var(--success)" }}>{stats?.overdue||0}</div>
          <div className="nv-kpi-sub">Requieren acción</div>
        </div>
      </div>

      <Alert msg={msg} onClose={()=>setMsg(null)}/>

      <div className="nv-tabs">
        {TABS.map(t=>(<div key={t.key} className={"nv-tab"+(tab===t.key?" active":"")} onClick={()=>setTab(t.key)}>{t.label}</div>))}
      </div>

      {tab==="dashboard"&&(
        <div className="nv-grid-2">
          <div className="nv-card">
            <div className="nv-card-header"><span className="nv-card-title">◈ Resumen {currentPeriod}</span></div>
            {stats?(
              <div style={{ display:"flex",flexDirection:"column",gap:8 }}>
                {[
                  {lbl:"Total facturas",  val:stats.total_invoices||0,   color:"var(--text-primary)"},
                  {lbl:"Pagadas",         val:stats.paid||0,             color:"var(--success)"},
                  {lbl:"Pendientes",      val:stats.pending||0,          color:"var(--warning)"},
                  {lbl:"Vencidas",        val:stats.overdue||0,          color:"var(--danger)"},
                  {lbl:"Monto cobrado",   val:fmt$(stats.collected),     color:"var(--success)"},
                  {lbl:"Total facturado", val:fmt$(stats.total_billed),  color:"var(--brand)"},
                ].map(({lbl,val,color})=>(
                  <div key={lbl} style={{ display:"flex",justifyContent:"space-between",padding:"8px 0",borderBottom:"1px solid var(--border-subtle)" }}>
                    <span style={{ fontSize:12,color:"var(--text-muted)" }}>{lbl}</span>
                    <span style={{ fontSize:13,fontWeight:700,color,fontFamily:"var(--font-mono)" }}>{val}</span>
                  </div>
                ))}
              </div>
            ):<div className="nv-loading"><span className="nv-spinner"/></div>}
          </div>
          <div className="nv-card">
            <div className="nv-card-header"><span className="nv-card-title">◈ Acciones rápidas</span></div>
            <div style={{ display:"flex",flexDirection:"column",gap:10 }}>
              <button className="nv-btn nv-btn-primary" onClick={handleGenerate} disabled={busy} style={{ justifyContent:"flex-start" }}>
                ▶ Generar facturas {currentPeriod}
              </button>
              <button className="nv-btn nv-btn-ghost" onClick={handleProcessOverdue} disabled={busy} style={{ justifyContent:"flex-start" }}>
                ⚠ Procesar vencidas y suspender
              </button>
              <div style={{ padding:"10px 12px",background:"var(--bg-raised)",borderRadius:"var(--r-sm)",fontSize:11,color:"var(--text-muted)",lineHeight:1.7 }}>
                <strong style={{ color:"var(--text-secondary)" }}>Flujo automático:</strong><br/>
                1. Generar facturas el día {config?.billing_day||1} de cada mes<br/>
                2. Notificar {config?.notify_days_before||3} días antes del vencimiento<br/>
                3. Suspender tras {config?.grace_days||5} días de gracia<br/>
                4. Reactivar automáticamente al pagar
              </div>
            </div>
          </div>
        </div>
      )}

      {tab==="invoices"&&(
        <div className="nv-card" style={{ padding:0 }}>
          {invoices.length===0?(
            <div style={{ textAlign:"center",padding:"48px 20px" }}>
              <div style={{ fontSize:32,opacity:.2,marginBottom:12 }}>▦</div>
              <div style={{ fontSize:13,color:"var(--text-muted)",marginBottom:16 }}>Sin facturas para {currentPeriod}</div>
              <button className="nv-btn nv-btn-primary" onClick={handleGenerate} disabled={busy}>
                + Generar facturas {currentPeriod}
              </button>
            </div>
          ):(
            <div className="nv-table-wrap">
              <table className="nv-table">
                <thead><tr>
                  <th>Cliente</th><th>Periodo</th><th>Monto</th><th>IVA</th><th>Total</th><th>Vence</th><th>Estado</th><th></th>
                </tr></thead>
                <tbody>
                  {invoices.map(inv=>(
                    <tr key={inv.id}>
                      <td style={{ fontWeight:500 }}>{inv.client_name||"—"}</td>
                      <td style={{ fontFamily:"var(--font-mono)",fontSize:11 }}>{inv.period}</td>
                      <td style={{ fontFamily:"var(--font-mono)" }}>{fmt$(inv.amount)}</td>
                      <td style={{ fontFamily:"var(--font-mono)",color:"var(--text-muted)" }}>{fmt$(inv.tax)}</td>
                      <td style={{ fontFamily:"var(--font-mono)",fontWeight:700,color:"var(--brand)" }}>{fmt$(inv.total)}</td>
                      <td style={{ fontSize:11,color:"var(--text-muted)" }}>{inv.due_date?.slice(0,10)}</td>
                      <td><span className={"nv-badge "+(STATUS_BADGE[inv.status]||"nv-badge-muted")}>{inv.status}</span></td>
                      <td>
                        {inv.status!=="paid"&&(
                          <button className="nv-btn nv-btn-ghost nv-btn-sm" onClick={()=>handleMarkPaid(inv.id)}>
                            ✓ Marcar pagada
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab==="config"&&config&&(
        <div className="nv-card" style={{ maxWidth:480 }}>
          <div className="nv-card-header"><span className="nv-card-title">⚙ Configuración billing</span></div>
          <div className="nv-form-row">
            <div className="nv-form-field">
              <label className="nv-label">Día de facturación</label>
              <input className="nv-input" type="number" min="1" max="28" value={config.billing_day}
                onChange={e=>setConfig(c=>({...c,billing_day:parseInt(e.target.value)}))}/>
            </div>
            <div className="nv-form-field">
              <label className="nv-label">Días de gracia</label>
              <input className="nv-input" type="number" min="0" max="30" value={config.grace_days}
                onChange={e=>setConfig(c=>({...c,grace_days:parseInt(e.target.value)}))}/>
            </div>
          </div>
          <div className="nv-form-row">
            <div className="nv-form-field">
              <label className="nv-label">IVA (%)</label>
              <input className="nv-input" type="number" step="0.01" value={config.tax_pct}
                onChange={e=>setConfig(c=>({...c,tax_pct:parseFloat(e.target.value)}))}/>
            </div>
            <div className="nv-form-field">
              <label className="nv-label">Notificar (días antes)</label>
              <input className="nv-input" type="number" min="0" max="15" value={config.notify_days_before}
                onChange={e=>setConfig(c=>({...c,notify_days_before:parseInt(e.target.value)}))}/>
            </div>
          </div>
          <div className="nv-form-row">
            <div className="nv-form-field">
              <label className="nv-label">Suspensión automática</label>
              <select className="nv-select" value={config.auto_suspend} onChange={e=>setConfig(c=>({...c,auto_suspend:e.target.value}))}>
                <option value="yes">Sí</option>
                <option value="no">No</option>
              </select>
            </div>
            <div className="nv-form-field">
              <label className="nv-label">Reactivación automática</label>
              <select className="nv-select" value={config.auto_reactivate} onChange={e=>setConfig(c=>({...c,auto_reactivate:e.target.value}))}>
                <option value="yes">Sí</option>
                <option value="no">No</option>
              </select>
            </div>
          </div>
          <div style={{ marginTop:8 }}>
            <button className="nv-btn nv-btn-primary" onClick={handleSaveConfig} disabled={busy}>
              {busy?<span className="nv-spinner"/>:"✓ Guardar configuración"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
