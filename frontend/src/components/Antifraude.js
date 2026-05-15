import { useState, useEffect, useCallback } from "react";
import api from "../api";

async function safe(fn) { try { return await fn(); } catch { return null; } }

function fmtDT(d) {
  if (!d) return "—";
  try { return new Date(d).toLocaleString("es-EC",{day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit",hour12:false}); }
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

function AddModal({ title, onClose, onSave }) {
  const [tipo,   setTipo]   = useState("numero");
  const [valor,  setValor]  = useState("");
  const [motivo, setMotivo] = useState("");
  const [busy,   setBusy]   = useState(false);
  const [err,    setErr]    = useState(null);

  const submit = async () => {
    if (!valor.trim()) return setErr("El valor es requerido");
    setBusy(true); setErr(null);
    try { await onSave({ tipo, valor: valor.trim(), motivo }); }
    catch(e) { setErr(e?.response?.data?.detail||"Error al guardar"); }
    finally { setBusy(false); }
  };

  return (
    <div className="nv-modal-overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="nv-modal" style={{ maxWidth:440 }}>
        <div className="nv-modal-header">
          <span className="nv-modal-title">{title}</span>
          <button className="nv-modal-close" onClick={onClose}>✕</button>
        </div>
        {err&&<div className="nv-alert nv-alert-err" style={{ marginBottom:14 }}>{err}</div>}
        <div className="nv-form-row">
          <div className="nv-form-field">
            <label className="nv-label">Tipo</label>
            <select className="nv-select" value={tipo} onChange={e=>setTipo(e.target.value)}>
              <option value="numero">Número telefónico</option>
              <option value="ip">Dirección IP</option>
              <option value="prefijo">Prefijo</option>
            </select>
          </div>
          <div className="nv-form-field">
            <label className="nv-label">Valor *</label>
            <input className="nv-input" value={valor} onChange={e=>setValor(e.target.value)}
              placeholder={tipo==="ip"?"ej: 192.168.1.1":tipo==="prefijo"?"ej: +1900":"ej: 0987654321"}
              style={{ fontFamily:"var(--font-mono)" }}/>
          </div>
        </div>
        <div className="nv-form-field" style={{ marginBottom:16 }}>
          <label className="nv-label">Motivo</label>
          <input className="nv-input" value={motivo} onChange={e=>setMotivo(e.target.value)}
            placeholder="ej: Llamadas internacionales excesivas"/>
        </div>
        <div className="nv-modal-footer">
          <button className="nv-btn nv-btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="nv-btn nv-btn-primary" onClick={submit} disabled={busy}>
            {busy?<span className="nv-spinner"/>:"+ Agregar"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ListTable({ data, onDelete, emptyText }) {
  if (!data?.length) return (
    <div style={{ textAlign:"center",padding:"32px 0",color:"var(--text-muted)",fontSize:12 }}>{emptyText}</div>
  );
  return (
    <div className="nv-table-wrap">
      <table className="nv-table">
        <thead><tr><th>Tipo</th><th>Valor</th><th>Motivo</th><th>Agregado</th><th></th></tr></thead>
        <tbody>
          {data.filter(d=>d.activo==="yes").map(d=>(
            <tr key={d.id}>
              <td><span className="nv-badge nv-badge-muted">{d.tipo}</span></td>
              <td className="mono" style={{ color:"var(--text-primary)",fontWeight:600 }}>{d.valor}</td>
              <td style={{ fontSize:11,color:"var(--text-muted)" }}>{d.motivo||"—"}</td>
              <td style={{ fontSize:10,color:"var(--text-muted)" }}>{fmtDT(d.created_at)}</td>
              <td>
                <button className="nv-btn nv-btn-danger nv-btn-sm" onClick={()=>onDelete(d.id)}>
                  ✕ Remover
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function Antifraude() {
  const [tab,        setTab]        = useState("dashboard");
  const [stats,      setStats]      = useState(null);
  const [blacklist,  setBlacklist]  = useState([]);
  const [whitelist,  setWhitelist]  = useState([]);
  const [alerts,     setAlerts]     = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [msg,        setMsg]        = useState(null);
  const [modal,      setModal]      = useState(null);

  const showMsg = (text,type="success") => { setMsg({text,type}); setTimeout(()=>setMsg(null),4000); };

  const load = useCallback(async () => {
    setLoading(true);
    const [s,bl,wl,al] = await Promise.all([
      safe(()=>api.get("/fraud/stats")),
      safe(()=>api.get("/fraud/blacklist")),
      safe(()=>api.get("/fraud/whitelist")),
      safe(()=>api.get("/fraud/alerts")),
    ]);
    setStats(s?.data||null);
    setBlacklist(bl?.data?.data||[]);
    setWhitelist(wl?.data?.data||[]);
    setAlerts(al?.data?.data||[]);
    setLoading(false);
  },[]);

  useEffect(()=>{ load(); },[load]);

  const handleDelete = async (endpoint, id) => {
    try {
      await api.delete("/fraud/"+endpoint+"/"+id);
      showMsg("Eliminado correctamente");
      load();
    } catch(e) { showMsg(e?.response?.data?.detail||"Error","error"); }
  };

  const handleRevisar = async (id) => {
    try {
      await api.put("/fraud/alerts/"+id+"/revisar");
      showMsg("Alerta marcada como revisada");
      load();
    } catch(e) { showMsg("Error","error"); }
  };

  const TABS = [
    { key:"dashboard", label:"▦ Dashboard" },
    { key:"blacklist", label:"⛔ Blacklist" },
    { key:"whitelist", label:"✅ Whitelist" },
    { key:"alerts",    label:"⚠ Alertas" },
    { key:"suspicious",label:"◎ Sospechosos" },
  ];

  const nivelBadge = (n) => ({
    critical: "nv-badge-err",
    warn:     "nv-badge-warn",
    info:     "nv-badge-info",
  }[n]||"nv-badge-muted");

  return (
    <div>
      <div className="nv-page-header">
        <div>
          <div className="nv-page-title">Seguridad y Antifraude</div>
          <div className="nv-page-sub">Detección de anomalías y control de acceso</div>
        </div>
        <div className="nv-page-actions">
          <button className="nv-btn nv-btn-secondary nv-btn-sm" onClick={load} disabled={loading}>
            {loading?<span className="nv-spinner"/>:"↺"} Actualizar
          </button>
        </div>
      </div>

      <div className="nv-kpi-grid" style={{ marginBottom:16 }}>
        <div className="nv-kpi">
          <div className="nv-kpi-label">Blacklist activa</div>
          <div className="nv-kpi-value" style={{ color:"var(--danger)" }}>{stats?.blacklist_count??"—"}</div>
          <div className="nv-kpi-sub">Entradas bloqueadas</div>
        </div>
        <div className="nv-kpi">
          <div className="nv-kpi-label">Whitelist activa</div>
          <div className="nv-kpi-value" style={{ color:"var(--success)" }}>{stats?.whitelist_count??"—"}</div>
          <div className="nv-kpi-sub">Entradas permitidas</div>
        </div>
        <div className="nv-kpi">
          <div className="nv-kpi-label">Alertas pendientes</div>
          <div className="nv-kpi-value" style={{ color:"var(--warning)" }}>{stats?.alerts_pending??"—"}</div>
          <div className="nv-kpi-sub">Sin revisar</div>
        </div>
        <div className="nv-kpi">
          <div className="nv-kpi-label">Alertas críticas</div>
          <div className="nv-kpi-value" style={{ color:(stats?.alerts_critical||0)>0?"var(--danger)":"var(--success)" }}>
            {stats?.alerts_critical??"—"}
          </div>
          <div className="nv-kpi-sub">Requieren acción</div>
        </div>
        <div className="nv-kpi">
          <div className="nv-kpi-label">Núm. sospechosos</div>
          <div className="nv-kpi-value" style={{ color:"var(--warning)" }}>
            {stats?.suspicious?.length??"—"}
          </div>
          <div className="nv-kpi-sub">Consumo anormal 24h</div>
        </div>
      </div>

      <Alert msg={msg} onClose={()=>setMsg(null)}/>

      <div className="nv-tabs">
        {TABS.map(t=>(
          <div key={t.key} className={"nv-tab"+(tab===t.key?" active":"")} onClick={()=>setTab(t.key)}>{t.label}</div>
        ))}
      </div>

      {tab==="dashboard" && (
        <div className="nv-grid-2">
          <div className="nv-card">
            <div className="nv-card-header">
              <span className="nv-card-title">⛔ Últimos bloqueados</span>
              <button className="nv-btn nv-btn-danger nv-btn-sm" onClick={()=>setModal("blacklist")}>+ Bloquear</button>
            </div>
            {blacklist.filter(b=>b.activo==="yes").slice(0,5).map(b=>(
              <div key={b.id} style={{ display:"flex",alignItems:"center",gap:8,padding:"7px 0",borderBottom:"1px solid var(--border-subtle)" }}>
                <span className="nv-badge nv-badge-err" style={{ fontSize:9 }}>{b.tipo}</span>
                <span style={{ flex:1,fontFamily:"var(--font-mono)",fontSize:12,color:"var(--text-primary)" }}>{b.valor}</span>
                <span style={{ fontSize:10,color:"var(--text-muted)" }}>{fmtDT(b.created_at)}</span>
              </div>
            ))}
            {!blacklist.filter(b=>b.activo==="yes").length&&(
              <div style={{ textAlign:"center",padding:"24px 0",color:"var(--text-muted)",fontSize:12 }}>Sin entradas en blacklist</div>
            )}
          </div>
          <div className="nv-card">
            <div className="nv-card-header">
              <span className="nv-card-title">◎ Números sospechosos (24h)</span>
            </div>
            {stats?.suspicious?.length ? stats.suspicious.map((s,i)=>(
              <div key={i} style={{ display:"flex",alignItems:"center",gap:8,padding:"7px 0",borderBottom:"1px solid var(--border-subtle)" }}>
                <div style={{ flex:1 }}>
                  <div style={{ fontFamily:"var(--font-mono)",fontSize:12,color:"var(--warning)",fontWeight:600 }}>{s.src}</div>
                  <div style={{ fontSize:10,color:"var(--text-muted)" }}>{s.llamadas} llamadas · {s.minutos} min</div>
                </div>
                <button className="nv-btn nv-btn-danger nv-btn-sm"
                  onClick={()=>{ api.post("/fraud/blacklist",{tipo:"numero",valor:s.src,motivo:"Consumo anormal auto-detectado"}).then(()=>{ showMsg("Bloqueado: "+s.src); load(); }); }}>
                  Bloquear
                </button>
              </div>
            )) : (
              <div style={{ textAlign:"center",padding:"24px 0",color:"var(--text-muted)",fontSize:12 }}>
                <div style={{ fontSize:20,marginBottom:8,opacity:.3 }}>✔</div>
                Sin actividad sospechosa en las últimas 24 horas
              </div>
            )}
          </div>
        </div>
      )}

      {tab==="blacklist" && (
        <div className="nv-card" style={{ padding:0 }}>
          <div style={{ padding:"12px 16px",borderBottom:"1px solid var(--border)",display:"flex",justifyContent:"space-between",alignItems:"center" }}>
            <span style={{ fontSize:12,color:"var(--text-secondary)" }}>{blacklist.filter(b=>b.activo==="yes").length} entradas activas</span>
            <button className="nv-btn nv-btn-danger nv-btn-sm" onClick={()=>setModal("blacklist")}>+ Agregar a blacklist</button>
          </div>
          <ListTable data={blacklist} onDelete={id=>handleDelete("blacklist",id)} emptyText="Blacklist vacía"/>
        </div>
      )}

      {tab==="whitelist" && (
        <div className="nv-card" style={{ padding:0 }}>
          <div style={{ padding:"12px 16px",borderBottom:"1px solid var(--border)",display:"flex",justifyContent:"space-between",alignItems:"center" }}>
            <span style={{ fontSize:12,color:"var(--text-secondary)" }}>{whitelist.filter(w=>w.activo==="yes").length} entradas activas</span>
            <button className="nv-btn nv-btn-primary nv-btn-sm" onClick={()=>setModal("whitelist")}>+ Agregar a whitelist</button>
          </div>
          <ListTable data={whitelist} onDelete={id=>handleDelete("whitelist",id)} emptyText="Whitelist vacía"/>
        </div>
      )}

      {tab==="alerts" && (
        <div className="nv-card" style={{ padding:0 }}>
          {loading?<div className="nv-loading"><span className="nv-spinner"/></div>:
          alerts.length===0?(
            <div style={{ textAlign:"center",padding:"48px 20px" }}>
              <div style={{ fontSize:32,opacity:.2,marginBottom:12 }}>✔</div>
              <div style={{ fontSize:13,color:"var(--text-muted)" }}>Sin alertas de fraude</div>
            </div>
          ):(
            <div className="nv-table-wrap">
              <table className="nv-table">
                <thead><tr><th>Nivel</th><th>Tipo</th><th>Número</th><th>Descripción</th><th>Fecha</th><th></th></tr></thead>
                <tbody>
                  {alerts.map(a=>(
                    <tr key={a.id} style={{ opacity:a.revisado==="yes"?.5:1 }}>
                      <td><span className={"nv-badge "+nivelBadge(a.nivel)}>{a.nivel}</span></td>
                      <td style={{ fontSize:11,color:"var(--text-muted)" }}>{a.tipo}</td>
                      <td className="mono">{a.numero||"—"}</td>
                      <td style={{ fontSize:11,color:"var(--text-secondary)",maxWidth:200,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{a.descripcion||"—"}</td>
                      <td style={{ fontSize:10,color:"var(--text-muted)" }}>{fmtDT(a.created_at)}</td>
                      <td>
                        {a.revisado!=="yes"&&(
                          <button className="nv-btn nv-btn-ghost nv-btn-sm" onClick={()=>handleRevisar(a.id)}>✓ Revisar</button>
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

      {tab==="suspicious" && (
        <div className="nv-card">
          <div className="nv-card-header">
            <span className="nv-card-title">◎ Números con consumo anormal (24h)</span>
            <span style={{ fontSize:10,color:"var(--text-muted)" }}>+20 llamadas o +60 min</span>
          </div>
          {stats?.suspicious?.length ? (
            <div className="nv-table-wrap">
              <table className="nv-table">
                <thead><tr><th>Número origen</th><th>Llamadas</th><th>Minutos</th><th>Acción</th></tr></thead>
                <tbody>
                  {stats.suspicious.map((s,i)=>(
                    <tr key={i}>
                      <td className="mono" style={{ color:"var(--warning)",fontWeight:600 }}>{s.src}</td>
                      <td style={{ color:"var(--info)",fontFamily:"var(--font-mono)" }}>{s.llamadas}</td>
                      <td style={{ color:"var(--brand)",fontFamily:"var(--font-mono)" }}>{s.minutos}</td>
                      <td>
                        <button className="nv-btn nv-btn-danger nv-btn-sm"
                          onClick={()=>{ api.post("/fraud/blacklist",{tipo:"numero",valor:s.src,motivo:"Consumo anormal "+s.llamadas+" llamadas / "+s.minutos+" min"}).then(()=>{ showMsg("Bloqueado: "+s.src); load(); }).catch(()=>showMsg("Error al bloquear","error")); }}>
                          ⛔ Bloquear
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ textAlign:"center",padding:"40px 0",color:"var(--text-muted)",fontSize:12 }}>
              <div style={{ fontSize:24,marginBottom:10,opacity:.3 }}>✔</div>
              Sin números sospechosos en las últimas 24 horas
            </div>
          )}
        </div>
      )}

      {modal&&(
        <AddModal
          title={modal==="blacklist"?"Agregar a Blacklist":"Agregar a Whitelist"}
          onClose={()=>setModal(null)}
          onSave={async(data)=>{ await api.post("/fraud/"+modal,data); setModal(null); load(); showMsg("Agregado a "+modal); }}
        />
      )}
    </div>
  );
}
