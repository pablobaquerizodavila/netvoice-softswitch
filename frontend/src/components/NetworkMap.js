import { useState, useEffect, useCallback } from "react";
import api from "../api";

async function safe(fn) { try { return await fn(); } catch { return null; } }

function GaugeBar({ label, pct, value, color, warn=70, danger=90 }) {
  const c = pct>=danger?"var(--danger)":pct>=warn?"var(--warning)":color||"var(--success)";
  return (
    <div style={{ marginBottom:10 }}>
      <div style={{ display:"flex",justifyContent:"space-between",marginBottom:4,fontSize:11 }}>
        <span style={{ color:"var(--text-secondary)" }}>{label}</span>
        <span style={{ color:c,fontFamily:"var(--font-mono)",fontWeight:700 }}>{value}</span>
      </div>
      <div className="nv-progress">
        <div className="nv-progress-bar" style={{ width:pct+"%",background:c,transition:"width .6s ease" }}/>
      </div>
    </div>
  );
}

function StatBox({ label, value, color }) {
  return (
    <div style={{ background:"var(--bg-raised)",borderRadius:"var(--r-sm)",padding:"9px 12px",textAlign:"center" }}>
      <div style={{ fontFamily:"var(--font-mono)",fontSize:16,fontWeight:700,color:color||"var(--text-primary)" }}>{value}</div>
      <div style={{ fontSize:9,textTransform:"uppercase",letterSpacing:".07em",color:"var(--text-muted)",marginTop:2 }}>{label}</div>
    </div>
  );
}

function NodeStatus({ name, ip, role, ok, icon }) {
  return (
    <div style={{ display:"flex",alignItems:"center",gap:10,padding:"8px 11px",
      background:"var(--bg-raised)",borderRadius:"var(--r-sm)",border:"1px solid var(--border)",marginBottom:6 }}>
      <div style={{ width:7,height:7,borderRadius:"50%",flexShrink:0,
        background:ok?"var(--success)":"var(--danger)",
        boxShadow:ok?"0 0 6px var(--success)":"none" }}/>
      <span style={{ fontSize:14,marginRight:4 }}>{icon}</span>
      <div style={{ flex:1 }}>
        <div style={{ fontSize:12,fontWeight:500,color:"var(--text-primary)" }}>{name}</div>
        <div style={{ fontSize:10,color:"var(--text-muted)",fontFamily:"var(--font-mono)" }}>{ip}</div>
      </div>
      <div style={{ textAlign:"right" }}>
        <div style={{ fontSize:10,fontWeight:700,color:ok?"var(--success)":"var(--danger)" }}>{ok?"Online":"Offline"}</div>
        <div style={{ fontSize:9,color:"var(--text-muted)" }}>{role}</div>
      </div>
    </div>
  );
}

export default function NetworkMap() {
  const [health,  setHealth]  = useState(null);
  const [db,      setDb]      = useState(null);
  const [net,     setNet]     = useState(null);
  const [ext,     setExt]     = useState(null);
  const [trunks,  setTrunks]  = useState(null);
  const [loading, setLoading] = useState(true);
  const [ts,      setTs]      = useState(new Date());

  const load = useCallback(async () => {
    setLoading(true);
    const [h,d,n,e,t] = await Promise.all([
      safe(()=>api.get("/noc/health")),
      safe(()=>api.get("/noc/db")),
      safe(()=>api.get("/noc/network")),
      safe(()=>api.get("/extensions/status")),
      safe(()=>api.get("/trunks")),
    ]);
    setHealth(h?.data||null);
    setDb(d?.data||null);
    setNet(n?.data||null);
    setExt(e?.data||null);
    setTrunks(t?.data?.data||[]);
    setLoading(false);
    setTs(new Date());
  },[]);

  useEffect(()=>{ load(); const iv=setInterval(load,15000); return ()=>clearInterval(iv); },[load]);

  const registered   = ext?.registered?.length||0;
  const trunkActivos = (trunks||[]).filter(t=>t.activo==="yes").length;
  const allOk        = health?.status==="online" && db?.status==="online";

  const NODES = [
    { name:"Kamailio SBC",  ip:"192.168.0.10",  role:"SBC",      ok:true,  icon:"⛲" },
    { name:"Asterisk PBX",  ip:"192.168.0.161", role:"PBX",      ok:true,  icon:"☎" },
    { name:"Asterisk HA",   ip:"192.168.0.216", role:"HA Node",  ok:true,  icon:"⇄" },
    { name:"MySQL 8.0",     ip:"192.168.0.161", role:"Database", ok:db?.status==="online", icon:"▣" },
    { name:"Nginx + Panel", ip:"192.168.0.7",   role:"Gateway",  ok:health?.status==="online", icon:"◎" },
  ];

  return (
    <div>
      <div className="nv-page-header">
        <div>
          <div className="nv-page-title">NOC — Centro de Operaciones</div>
          <div className="nv-page-sub">
            Monitor en tiempo real · {ts.toLocaleTimeString("es-EC",{hour12:false})} · refresh 15s
          </div>
        </div>
        <div className="nv-page-actions">
          <button className="nv-btn nv-btn-secondary nv-btn-sm" onClick={load} disabled={loading}>
            {loading?<span className="nv-spinner"/>:"↺"} Actualizar
          </button>
        </div>
      </div>

      <div className={"nv-alert "+(allOk?"nv-alert-ok":"nv-alert-err")} style={{ marginBottom:16 }}>
        <div style={{ display:"flex",alignItems:"center",gap:8,flex:1 }}>
          <div style={{ width:8,height:8,borderRadius:"50%",background:"currentColor",animation:"blink 1.8s ease-in-out infinite" }}/>
          <span style={{ fontWeight:600 }}>{allOk?"Sistema operativo — Todos los servicios online":"Atención: revisar servicios"}</span>
        </div>
        <span style={{ fontSize:11,opacity:.8,fontFamily:"var(--font-mono)" }}>
          Uptime: {health?.uptime_str||"—"}
        </span>
      </div>

      <div className="nv-kpi-grid" style={{ marginBottom:16 }}>
        <div className="nv-kpi">
          <div className="nv-kpi-label">CPU</div>
          <div className="nv-kpi-value" style={{ color:(health?.cpu_pct||0)>80?"var(--danger)":(health?.cpu_pct||0)>60?"var(--warning)":"var(--success)" }}>
            {loading?<span className="nv-spinner"/>:(health?.cpu_pct??"—")+"%"}
          </div>
          <div className="nv-kpi-sub">Load: {health?.load_avg?.[0]||"—"}</div>
        </div>
        <div className="nv-kpi">
          <div className="nv-kpi-label">RAM</div>
          <div className="nv-kpi-value" style={{ color:(health?.mem_pct||0)>85?"var(--danger)":(health?.mem_pct||0)>70?"var(--warning)":"var(--info)" }}>
            {loading?<span className="nv-spinner"/>:(health?.mem_pct??"—")+"%"}
          </div>
          <div className="nv-kpi-sub">{health?.mem_used_mb||0}MB / {health?.mem_total_mb||0}MB</div>
        </div>
        <div className="nv-kpi">
          <div className="nv-kpi-label">Disco</div>
          <div className="nv-kpi-value" style={{ color:(health?.disk_pct||0)>90?"var(--danger)":(health?.disk_pct||0)>75?"var(--warning)":"var(--text-primary)" }}>
            {loading?<span className="nv-spinner"/>:(health?.disk_pct??"—")+"%"}
          </div>
          <div className="nv-kpi-sub">{health?.disk_used_gb||0}GB / {health?.disk_total_gb||0}GB</div>
        </div>
        <div className="nv-kpi">
          <div className="nv-kpi-label">CDRs hoy</div>
          <div className="nv-kpi-value" style={{ color:"var(--brand)" }}>
            {loading?<span className="nv-spinner"/>:(db?.cdr_today??"—")}
          </div>
          <div className="nv-kpi-sub">{db?.cdr_month||0} este mes</div>
        </div>
        <div className="nv-kpi">
          <div className="nv-kpi-label">Extensiones</div>
          <div className="nv-kpi-value" style={{ color:"var(--success)" }}>
            {loading?<span className="nv-spinner"/>:registered}
          </div>
          <div className="nv-kpi-sub">Registradas</div>
        </div>
        <div className="nv-kpi">
          <div className="nv-kpi-label">Trunks activos</div>
          <div className="nv-kpi-value" style={{ color:"var(--info)" }}>
            {loading?<span className="nv-spinner"/>:trunkActivos}
          </div>
          <div className="nv-kpi-sub">SIP online</div>
        </div>
        <div className="nv-kpi">
          <div className="nv-kpi-label">Conexiones DB</div>
          <div className="nv-kpi-value" style={{ color:"var(--text-primary)" }}>
            {loading?<span className="nv-spinner"/>:(db?.connections??"—")}
          </div>
          <div className="nv-kpi-sub">MySQL threads</div>
        </div>
        <div className="nv-kpi">
          <div className="nv-kpi-label">Procesos</div>
          <div className="nv-kpi-value" style={{ color:"var(--text-primary)" }}>
            {loading?<span className="nv-spinner"/>:(net?.processes??"—")}
          </div>
          <div className="nv-kpi-sub">Sistema</div>
        </div>
      </div>

      <div className="nv-grid-2" style={{ marginBottom:14 }}>
        <div className="nv-card">
          <div className="nv-card-header">
            <span className="nv-card-title">◈ Recursos voip-panel-01</span>
            <span style={{ fontFamily:"var(--font-mono)",fontSize:10,color:"var(--text-muted)" }}>192.168.0.7</span>
          </div>
          {health ? (
            <>
              <GaugeBar label="CPU" pct={health.cpu_pct} value={health.cpu_pct+"%"} warn={60} danger={80}/>
              <GaugeBar label="Memoria RAM" pct={health.mem_pct} value={health.mem_used_mb+"MB / "+health.mem_total_mb+"MB"} warn={70} danger={85}/>
              <GaugeBar label="Disco /" pct={health.disk_pct} value={health.disk_used_gb+"GB / "+health.disk_total_gb+"GB"} warn={75} danger={90}/>
              <div style={{ marginTop:12, paddingTop:12, borderTop:"1px solid var(--border-subtle)" }}>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8 }}>
                  {health.load_avg.map((v,i)=>(
                    <StatBox key={i} label={["Load 1m","Load 5m","Load 15m"][i]} value={v} color="var(--brand)"/>
                  ))}
                </div>
              </div>
            </>
          ) : <div className="nv-loading"><span className="nv-spinner"/></div>}
        </div>

        <div className="nv-card">
          <div className="nv-card-header">
            <span className="nv-card-title">◉ Estado de nodos</span>
            <span className={"nv-badge "+(allOk?"nv-badge-ok":"nv-badge-err")}>
              <span className="dot"/>{allOk?"Todos OK":"Revisar"}
            </span>
          </div>
          {NODES.map(n=><NodeStatus key={n.name} {...n}/>)}
          <div style={{ marginTop:12,paddingTop:12,borderTop:"1px solid var(--border-subtle)" }}>
            <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:8 }}>
              <StatBox label="Red Tx" value={(net?.bytes_sent_mb||0)+"MB"} color="var(--brand)"/>
              <StatBox label="Red Rx" value={(net?.bytes_recv_mb||0)+"MB"} color="var(--info)"/>
            </div>
          </div>
        </div>
      </div>

      <div className="nv-card">
        <div className="nv-card-header">
          <span className="nv-card-title">▤ Actividad de base de datos</span>
        </div>
        {db ? (
          <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(160px,1fr))",gap:10 }}>
            <StatBox label="CDRs hoy" value={(db.cdr_today||0).toLocaleString()} color="var(--brand)"/>
            <StatBox label="CDRs este mes" value={(db.cdr_month||0).toLocaleString()} color="var(--info)"/>
            <StatBox label="Conexiones activas" value={db.connections||0} color="var(--success)"/>
            <StatBox label="Estado MySQL" value={db.status==="online"?"Online":"Error"} color={db.status==="online"?"var(--success)":"var(--danger)"}/>
          </div>
        ) : <div className="nv-loading"><span className="nv-spinner"/></div>}
      </div>
    </div>
  );
}
