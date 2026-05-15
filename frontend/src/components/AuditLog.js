import { useState, useEffect, useCallback } from "react";
import api from "../api";

async function safe(fn) { try { return await fn(); } catch { return null; } }

const MODULE_BADGE = {
  extensiones: { bg:"var(--info-bg)",    color:"var(--info)"    },
  usuarios:    { bg:"var(--success-bg)", color:"var(--success)" },
  clientes:    { bg:"var(--warning-bg)", color:"var(--warning)" },
  trunks:      { bg:"var(--danger-bg)",  color:"var(--danger)"  },
  auth:        { bg:"var(--brand-subtle)",color:"var(--brand)"  },
  planes:      { bg:"var(--info-bg)",    color:"var(--info)"    },
  did:         { bg:"var(--success-bg)", color:"var(--success)" },
  sistema:     { bg:"var(--bg-hover)",   color:"var(--text-muted)" },
};

const ACTION_ICON = {
  login:"\u2192", logout:"\u2190", crear:"\u2295", editar:"\u270e",
  eliminar:"\u2715", activar:"\u25b6", desactivar:"\u23f8",
  cambio_password:"\u26bf", asignar:"\u2197", liberar:"\u2198",
};

function ModuleBadge({ mod }) {
  const s = MODULE_BADGE[mod] || { bg:"var(--bg-hover)", color:"var(--text-muted)" };
  return (
    <span style={{ fontSize:10, fontWeight:700, padding:"2px 7px", borderRadius:99,
      background:s.bg, color:s.color, textTransform:"uppercase", letterSpacing:".04em" }}>
      {mod||"sistema"}
    </span>
  );
}

function ActionIcon({ action }) {
  const key = Object.keys(ACTION_ICON).find(k=>action?.toLowerCase().includes(k));
  return <span style={{ fontSize:13 }}>{ACTION_ICON[key]||"\u25cf"}</span>;
}

function fmtDT(d) {
  if (!d) return "\u2014";
  try { return new Date(d).toLocaleString("es-EC",{day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit",second:"2-digit",hour12:false}); }
  catch { return d; }
}

export default function AuditLog() {
  const [data,    setData]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState("");
  const [modFilter, setModFilter] = useState("all");
  const [page,    setPage]    = useState(1);
  const PAGE = 30;

  const load = useCallback(async () => {
    setLoading(true);
    const r = await safe(()=>api.get("/audit?limit=500"));
    setData(r?.data?.data||r?.data||[]);
    setLoading(false);
  },[]);

  useEffect(()=>{ load(); },[load]);

  const modules = ["all",...new Set(data.map(d=>d.module||d.modulo).filter(Boolean))];

  const filtered = data.filter(d=>{
    const q = search.toLowerCase();
    const mod = d.module||d.modulo||"";
    const matchQ = !q||
      d.action?.toLowerCase().includes(q)||
      d.username?.toLowerCase().includes(q)||
      mod.toLowerCase().includes(q)||
      JSON.stringify(d.detail||d.detalle||"").toLowerCase().includes(q);
    const matchM = modFilter==="all"||mod===modFilter;
    return matchQ&&matchM;
  });

  const pages = Math.ceil(filtered.length/PAGE);
  const pageData = filtered.slice((page-1)*PAGE, page*PAGE);

  const exportCSV = () => {
    const headers = ["Fecha","Usuario","Modulo","Accion","IP","Detalle"];
    const rows = filtered.map(d=>[
      fmtDT(d.created_at||d.timestamp),
      d.username||"sistema",
      d.module||d.modulo||"",
      d.action||d.accion||"",
      d.ip_address||d.ip||"",
      JSON.stringify(d.detail||d.detalle||"").slice(0,100),
    ]);
    const csv = [headers,...rows].map(r=>r.map(v=>`"${v}"`).join(",")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv],{type:"text/csv"}));
    a.download = "audit_"+new Date().toISOString().slice(0,10)+".csv";
    a.click();
  };

  return (
    <div>
      <div className="nv-page-header">
        <div>
          <div className="nv-page-title">Auditor\xeda y Logs</div>
          <div className="nv-page-sub">{filtered.length.toLocaleString()} eventos \xb7 p\xe1gina {page}/{pages||1}</div>
        </div>
        <div className="nv-page-actions">
          <button className="nv-btn nv-btn-ghost nv-btn-sm" onClick={exportCSV} disabled={!filtered.length}>\u2193 CSV</button>
          <button className="nv-btn nv-btn-secondary nv-btn-sm" onClick={load} disabled={loading}>
            {loading?<span className="nv-spinner"/>:"\u21ba"} Actualizar
          </button>
        </div>
      </div>

      <div className="nv-kpi-grid" style={{ marginBottom:16 }}>
        <div className="nv-kpi">
          <div className="nv-kpi-label">Total eventos</div>
          <div className="nv-kpi-value" style={{ color:"var(--brand)" }}>{data.length.toLocaleString()}</div>
        </div>
        <div className="nv-kpi">
          <div className="nv-kpi-label">Logins</div>
          <div className="nv-kpi-value" style={{ color:"var(--success)" }}>
            {data.filter(d=>(d.action||"").includes("login")).length}
          </div>
        </div>
        <div className="nv-kpi">
          <div className="nv-kpi-label">Cambios config</div>
          <div className="nv-kpi-value" style={{ color:"var(--warning)" }}>
            {data.filter(d=>["crear","editar","eliminar"].some(a=>(d.action||"").includes(a))).length}
          </div>
        </div>
        <div className="nv-kpi">
          <div className="nv-kpi-label">M\xf3dulos</div>
          <div className="nv-kpi-value" style={{ color:"var(--info)" }}>{modules.length-1}</div>
        </div>
      </div>

      <div style={{ display:"flex", gap:10, marginBottom:14, flexWrap:"wrap", alignItems:"center" }}>
        <div className="nv-search" style={{ flex:1, minWidth:200 }}>
          <span style={{ color:"var(--text-muted)", fontSize:12 }}>\u2315</span>
          <input placeholder="Buscar por usuario, m\xf3dulo, acci\xf3n..." value={search} onChange={e=>setSearch(e.target.value)}/>
          {search&&<button onClick={()=>setSearch("")} style={{ background:"none",border:"none",color:"var(--text-muted)",cursor:"pointer" }}>\u2715</button>}
        </div>
        <div style={{ display:"flex", gap:4, flexWrap:"wrap" }}>
          {modules.slice(0,8).map(m=>(
            <button key={m} className={"nv-btn nv-btn-sm "+(modFilter===m?"nv-btn-secondary":"nv-btn-ghost")}
              onClick={()=>{ setModFilter(m); setPage(1); }}>
              {m==="all"?"Todos":m}
            </button>
          ))}
        </div>
      </div>

      <div className="nv-card" style={{ padding:0 }}>
        {loading ? (
          <div className="nv-loading"><span className="nv-spinner"/><span>Cargando logs...</span></div>
        ) : filtered.length===0 ? (
          <div style={{ textAlign:"center", padding:"48px 20px" }}>
            <div style={{ fontSize:32, opacity:.2, marginBottom:12 }}>\u25ce</div>
            <div style={{ fontSize:13, color:"var(--text-muted)" }}>{search?"Sin resultados":"Sin eventos de auditor\xeda"}</div>
          </div>
        ) : (
          <>
            <div className="nv-table-wrap">
              <table className="nv-table">
                <thead><tr>
                  <th>Fecha</th><th>Usuario</th><th>M\xf3dulo</th>
                  <th>Acci\xf3n</th><th>IP</th><th>Detalle</th>
                </tr></thead>
                <tbody>
                  {pageData.map((d,i)=>(
                    <tr key={i}>
                      <td style={{ fontSize:10, color:"var(--text-muted)", whiteSpace:"nowrap", fontFamily:"var(--font-mono)" }}>
                        {fmtDT(d.created_at||d.timestamp)}
                      </td>
                      <td>
                        <div style={{ display:"flex", alignItems:"center", gap:7 }}>
                          <div style={{ width:24,height:24,borderRadius:"50%",background:"var(--brand-subtle)",color:"var(--brand)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:700,flexShrink:0 }}>
                            {(d.username||"S").slice(0,2).toUpperCase()}
                          </div>
                          <span style={{ fontSize:12, color:"var(--text-primary)", fontWeight:500 }}>{d.username||"sistema"}</span>
                        </div>
                      </td>
                      <td><ModuleBadge mod={d.module||d.modulo}/></td>
                      <td>
                        <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                          <ActionIcon action={d.action||d.accion}/>
                          <span style={{ fontSize:12, color:"var(--text-secondary)" }}>{d.action||d.accion||"\u2014"}</span>
                        </div>
                      </td>
                      <td style={{ fontSize:10, color:"var(--text-muted)", fontFamily:"var(--font-mono)" }}>{d.ip_address||d.ip||"\u2014"}</td>
                      <td style={{ fontSize:11, color:"var(--text-muted)", maxWidth:200, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                        {typeof(d.detail||d.detalle)==="object"
                          ? JSON.stringify(d.detail||d.detalle).slice(0,80)
                          : (d.detail||d.detalle||"\u2014")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {pages>1&&(
              <div style={{ display:"flex",alignItems:"center",justifyContent:"center",gap:6,padding:"10px 14px",borderTop:"1px solid var(--border)" }}>
                <button className="nv-btn nv-btn-ghost nv-btn-sm" onClick={()=>setPage(1)} disabled={page===1}>\u00ab</button>
                <button className="nv-btn nv-btn-ghost nv-btn-sm" onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page===1}>\u2039</button>
                <span style={{ fontSize:11, color:"var(--text-muted)", padding:"0 8px" }}>
                  {((page-1)*PAGE)+1}\u2013{Math.min(page*PAGE,filtered.length)} de {filtered.length}
                </span>
                <button className="nv-btn nv-btn-ghost nv-btn-sm" onClick={()=>setPage(p=>Math.min(pages,p+1))} disabled={page===pages}>\u203a</button>
                <button className="nv-btn nv-btn-ghost nv-btn-sm" onClick={()=>setPage(pages)} disabled={page===pages}>\u00bb</button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
