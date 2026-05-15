import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";

async function get(path) {
  try { const r = await api.get(path); return r.data; } catch { return null; }
}
function fmtDur(s) {
  const n = parseInt(s)||0;
  if (!n) return "0s";
  if (n < 60) return n+"s";
  return Math.floor(n/60)+"m "+n%60+"s";
}
function fmtDate(d) {
  if (!d) return "—";
  try { return new Date(d).toLocaleString("es-EC",{day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit",hour12:false}); }
  catch { return d; }
}
function KpiCard({ icon, label, value, unit, sub, subColor, iconBg }) {
  return (
    <div className="nv-kpi">
      <div className="nv-kpi-header">
        <span className="nv-kpi-label">{label}</span>
        <div className="nv-kpi-icon" style={{ background:iconBg||"var(--brand-subtle)", color:"var(--brand)" }}>{icon}</div>
      </div>
      <div className="nv-kpi-value">
        {value ?? <span className="nv-spinner" />}
        {unit && value != null && <span style={{ fontSize:11, fontWeight:400, color:"var(--text-muted)", marginLeft:4 }}>{unit}</span>}
      </div>
      {sub && <div className="nv-kpi-sub" style={{ color:subColor||"var(--text-muted)" }}>{sub}</div>}
    </div>
  );
}
function Sparkline({ data, h=54 }) {
  if (!data || !data.length) return null;
  const vals = data.map(d => parseFloat(d.minutos)||0);
  const mx = Math.max(...vals,1);
  const W = 300;
  const pts = vals.map((v,i) => {
    const x = (i/Math.max(vals.length-1,1))*W;
    const y = h-(v/mx)*h*0.84-2;
    return x.toFixed(1)+","+y.toFixed(1);
  }).join(" ");
  const fill = "0,"+h+" "+pts+" "+W+","+h;
  return (
    <svg width="100%" viewBox={"0 0 "+W+" "+h} style={{ display:"block", overflow:"visible" }}>
      <polyline points={fill} fill="var(--brand)" fillOpacity=".09" stroke="none"/>
      <polyline points={pts} fill="none" stroke="var(--brand)" strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round"/>
    </svg>
  );
}
function NodeRow({ name, ip, role, ok }) {
  const bg = ok ? "var(--success)" : "var(--danger)";
  const shadow = ok ? "0 0 6px var(--success)" : "none";
  return (
    <div style={{ display:"flex", alignItems:"center", gap:10, padding:"7px 11px", marginBottom:5, background:"var(--bg-raised)", borderRadius:"var(--r-sm)", border:"1px solid var(--border)" }}>
      <div style={{ width:7, height:7, borderRadius:"50%", flexShrink:0, background:bg, boxShadow:shadow }}/>
      <div style={{ flex:1 }}>
        <div style={{ fontSize:12, fontWeight:500, color:"var(--text-primary)" }}>{name}</div>
        <div style={{ fontSize:10, color:"var(--text-muted)", fontFamily:"var(--font-mono)" }}>{ip}</div>
      </div>
      <div style={{ textAlign:"right" }}>
        <div style={{ fontSize:10, fontWeight:700, color:ok?"var(--success)":"var(--danger)" }}>{ok?"Online":"Offline"}</div>
        <div style={{ fontSize:9, color:"var(--text-muted)" }}>{role}</div>
      </div>
    </div>
  );
}
const NODES = [
  { name:"Kamailio SBC",  ip:"192.168.0.10",  role:"Session Border Controller", ok:true },
  { name:"Asterisk PBX",  ip:"192.168.0.161", role:"PBX Principal",             ok:true },
  { name:"Asterisk HA",   ip:"192.168.0.216", role:"High Availability",         ok:true },
  { name:"MySQL 8.0",     ip:"192.168.0.161", role:"Base de datos",             ok:true },
  { name:"Nginx + Panel", ip:"192.168.0.7",   role:"Web / API Gateway",         ok:true },
];
const COLORS = ["var(--brand)","var(--success)","var(--info)","var(--warning)","var(--text-secondary)"];

export default function Dashboard() {
  const navigate = useNavigate();
  const [res,setRes]   = useState(null);
  const [mes,setMes]   = useState(null);
  const [dst,setDst]   = useState(null);
  const [cdr,setCdr]   = useState(null);
  const [cl,setCl]     = useState(null);
  const [tr,setTr]     = useState(null);
  const [ext,setExt]   = useState(null);
  const [busy,setBusy] = useState(true);
  const [ts,setTs]     = useState(new Date());

  const load = useCallback(async () => {
    setBusy(true);
    const [a,b,c,d,e,f,g] = await Promise.all([
      get("/metricas/resumen?meses=1"),
      get("/metricas/por-mes?meses=6"),
      get("/metricas/top-destinos?meses=1&limit=5"),
      get("/cdr?limit=8"),
      get("/clientes?limit=1"),
      get("/trunks"),
      get("/extensions"),
    ]);
    setRes(a);setMes(b);setDst(c);setCdr(d);setCl(e);setTr(f);setExt(g);
    setBusy(false);setTs(new Date());
  }, []);

  useEffect(() => { load(); const iv=setInterval(load,30000); return ()=>clearInterval(iv); }, [load]);

  const total = parseInt(res?.total_llamadas)||0;
  const cont  = parseInt(res?.contestadas)||0;
  const mins  = parseFloat(res?.total_minutos)||0;
  const asr   = total>0 ? ((cont/total)*100).toFixed(1) : null;
  const acd   = cont>0  ? Math.round((mins/cont)*60)   : null;
  const tAct  = tr?.data?.filter(t=>t.activo==="yes").length ?? null;

  return (
    <div>
      <div className="nv-page-header">
        <div>
          <div className="nv-page-title">Dashboard Operativo</div>
          <div className="nv-page-sub">Actualizado: {ts.toLocaleTimeString("es-EC",{hour12:false})} · auto-refresh 30s</div>
        </div>
        <div className="nv-page-actions">
          <button className="nv-btn nv-btn-secondary nv-btn-sm" onClick={load} disabled={busy}>
            {busy ? <span className="nv-spinner"/> : "↺"} Actualizar
          </button>
          <button className="nv-btn nv-btn-ghost nv-btn-sm" onClick={()=>navigate("/metricas")}>Ver métricas →</button>
        </div>
      </div>

      <div className="nv-kpi-grid">
        <KpiCard icon="☎" label="Llamadas (30d)" value={busy?null:total.toLocaleString()} sub={cont.toLocaleString()+" contestadas"} subColor="var(--success)" iconBg="var(--success-bg)"/>
        <KpiCard icon="⏱" label="Minutos (30d)" value={busy?null:Math.round(mins).toLocaleString()} unit="min" sub={(mins/60).toFixed(1)+" horas"} iconBg="var(--info-bg)"/>
        <KpiCard icon="%" label="ASR" value={busy?null:(asr!=null?asr+"%":"—")} sub="Answer Seizure Ratio" subColor={asr&&parseFloat(asr)>65?"var(--success)":"var(--warning)"} iconBg={asr&&parseFloat(asr)>65?"var(--success-bg)":"var(--warning-bg)"}/>
        <KpiCard icon="⏲" label="ACD" value={busy?null:(acd!=null?acd+"s":"—")} sub="Avg Call Duration" iconBg="var(--brand-subtle)"/>
        <KpiCard icon="⊕" label="Troncales activas" value={busy?null:(tAct!=null?String(tAct):"—")} sub="SIP Trunks online" subColor="var(--success)" iconBg="var(--success-bg)"/>
        <KpiCard icon="◻" label="Clientes" value={busy?null:(cl?.total!=null?cl.total.toLocaleString():"—")} sub="Total registrados" iconBg="var(--brand-subtle)"/>
        <KpiCard icon="◎" label="Extensiones" value={busy?null:(ext?.data?.length!=null?String(ext.data.length):"—")} sub="SIP endpoints" iconBg="var(--info-bg)"/>
        <KpiCard icon="▦" label="Llamadas activas" value={busy?null:"0"} sub="En este momento" iconBg="var(--bg-raised)"/>
      </div>

      <div className="nv-grid-2" style={{ marginBottom:14 }}>
        <div className="nv-card">
          <div className="nv-card-header">
            <span className="nv-card-title">◈ Tráfico — 6 meses</span>
            <span style={{ fontSize:10, color:"var(--text-muted)" }}>Minutos por mes</span>
          </div>
          {mes?.data?.length>0 ? (
            <>
              <Sparkline data={mes.data}/>
              <div style={{ display:"flex", justifyContent:"space-between", marginTop:10, paddingTop:10, borderTop:"1px solid var(--border-subtle)" }}>
                {mes.data.slice(-6).map(m=>(
                  <div key={m.mes} style={{ textAlign:"center", flex:1 }}>
                    <div style={{ fontFamily:"var(--font-mono)", fontSize:11, fontWeight:600, color:"var(--text-primary)" }}>{Math.round(parseFloat(m.minutos)||0)}</div>
                    <div style={{ fontSize:9, color:"var(--text-muted)" }}>{m.mes?m.mes.slice(5):""}</div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="nv-loading" style={{ padding:"28px 0" }}>
              <span style={{ fontSize:11, color:"var(--text-muted)" }}>Sin datos de tráfico</span>
            </div>
          )}
        </div>
        <div className="nv-card">
          <div className="nv-card-header">
            <span className="nv-card-title">◉ Infraestructura</span>
            <span className="nv-badge nv-badge-ok"><span className="dot"/>Todos operativos</span>
          </div>
          {NODES.map(n=><NodeRow key={n.name} {...n}/>)}
        </div>
      </div>

      <div className="nv-grid-2" style={{ marginBottom:14 }}>
        <div className="nv-card">
          <div className="nv-card-header">
            <span className="nv-card-title">▤ Top destinos (30d)</span>
            <span style={{ fontSize:10, color:"var(--text-muted)" }}>Por minutos</span>
          </div>
          {dst?.data?.length>0 ? dst.data.map((d,i)=>{
            const maxVal = parseFloat(dst.data[0]?.minutos)||1;
            const pct = Math.min(100,(parseFloat(d.minutos)||0)/maxVal*100);
            return (
              <div key={d.numero||i} style={{ marginBottom:9 }}>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:3, fontSize:11 }}>
                  <span style={{ color:"var(--text-secondary)", fontFamily:"var(--font-mono)" }}>{d.numero||"—"}</span>
                  <span style={{ color:COLORS[i], fontFamily:"var(--font-mono)", fontWeight:600 }}>{Math.round(parseFloat(d.minutos)||0)} min</span>
                </div>
                <div className="nv-progress"><div className="nv-progress-bar" style={{ width:pct+"%", background:COLORS[i] }}/></div>
              </div>
            );
          }) : <div style={{ fontSize:11, color:"var(--text-muted)", textAlign:"center", padding:"22px 0" }}>Sin datos</div>}
        </div>
        <div className="nv-card">
          <div className="nv-card-header"><span className="nv-card-title">◈ Distribución (30d)</span></div>
          {res ? (
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
              {[
                {lbl:"Contestadas",  val:res.contestadas,    color:"var(--success)"},
                {lbl:"No contest.",  val:res.no_contestadas, color:"var(--danger)"},
                {lbl:"Salientes",    val:res.salientes,      color:"var(--info)"},
                {lbl:"Entrantes",    val:res.entrantes,      color:"var(--warning)"},
                {lbl:"On-net",       val:res.onnet,          color:"var(--brand)"},
                {lbl:"Min. totales", val:Math.round(mins),   color:"var(--text-primary)"},
              ].map(({lbl,val,color})=>(
                <div key={lbl} style={{ background:"var(--bg-raised)", borderRadius:"var(--r-sm)", padding:"10px 12px", textAlign:"center" }}>
                  <div style={{ fontFamily:"var(--font-mono)", fontSize:16, fontWeight:700, color }}>{(parseInt(val)||0).toLocaleString()}</div>
                  <div style={{ fontSize:9, textTransform:"uppercase", letterSpacing:".08em", color:"var(--text-muted)", marginTop:2 }}>{lbl}</div>
                </div>
              ))}
            </div>
          ) : <div className="nv-loading"><span className="nv-spinner"/></div>}
        </div>
      </div>

      <div className="nv-card">
        <div className="nv-card-header">
          <span className="nv-card-title">▤ Últimas llamadas</span>
          <button className="nv-btn nv-btn-ghost nv-btn-sm" onClick={()=>navigate("/cdr")}>Ver CDR completo →</button>
        </div>
        {busy ? <div className="nv-loading"><span className="nv-spinner"/></div> : (
          <div className="nv-table-wrap">
            <table className="nv-table">
              <thead><tr>
                <th>Origen</th><th>Destino</th><th>Contexto</th>
                <th>Duración</th><th>Estado</th><th>Fecha</th>
              </tr></thead>
              <tbody>
                {(cdr?.data||[]).slice(0,8).map((r,i)=>{
                  const dispCls = r.disposition==="ANSWERED"?"nv-badge-ok":r.disposition==="BUSY"?"nv-badge-warn":r.disposition==="NO ANSWER"?"nv-badge-muted":"nv-badge-err";
                  const dispLbl = r.disposition==="ANSWERED"?"● Contestada":r.disposition==="NO ANSWER"?"● Sin resp.":r.disposition==="BUSY"?"● Ocupado":r.disposition||"—";
                  return (
                    <tr key={i}>
                      <td className="mono">{r.src||"—"}</td>
                      <td className="mono">{r.dst||"—"}</td>
                      <td><span style={{ fontSize:10, color:"var(--text-muted)" }}>{r.dcontext||"—"}</span></td>
                      <td className="mono">{fmtDur(r.billsec)}</td>
                      <td><span className={"nv-badge "+dispCls}>{dispLbl}</span></td>
                      <td style={{ fontSize:10, color:"var(--text-muted)" }}>{fmtDate(r.calldate)}</td>
                    </tr>
                  );
                })}
                {(!cdr?.data||cdr.data.length===0) && (
                  <tr><td colSpan={6} style={{ textAlign:"center", color:"var(--text-muted)", padding:22 }}>Sin registros</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
