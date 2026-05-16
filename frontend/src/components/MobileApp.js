import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";

async function safe(fn) { try { return await fn(); } catch { return null; } }

export default function MobileApp() {
  const navigate = useNavigate();
  const [health,  setHealth]  = useState(null);
  const [stats,   setStats]   = useState(null);
  const [cdrs,    setCdrs]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [ts,      setTs]      = useState(new Date());
  const [tab,     setTab]     = useState("home");

  const load = async () => {
    setLoading(true);
    const [h,s,c] = await Promise.all([
      safe(()=>api.get("/noc/health")),
      safe(()=>api.get("/metricas/resumen?meses=1")),
      safe(()=>api.get("/cdr?limit=20")),
    ]);
    setHealth(h?.data||null);
    setStats(s?.data||null);
    setCdrs(c?.data?.data||[]);
    setLoading(false);
    setTs(new Date());
  };

  useEffect(()=>{ load(); const iv=setInterval(load,30000); return()=>clearInterval(iv); },[]);

  const total = parseInt(stats?.total_llamadas)||0;
  const cont  = parseInt(stats?.contestadas)||0;
  const asr   = total>0?((cont/total)*100).toFixed(1):"0";
  const mins  = Math.round(parseFloat(stats?.total_minutos)||0);

  const s = {
    wrap:   { minHeight:"100vh", background:"#070c14", fontFamily:"Sora,sans-serif", paddingBottom:70 },
    header: { background:"#0b1120", borderBottom:"1px solid rgba(255,255,255,0.07)", padding:"16px 20px", display:"flex", alignItems:"center", justifyContent:"space-between", position:"sticky", top:0, zIndex:100 },
    title:  { fontSize:16, fontWeight:700, color:"#e8edf5" },
    sub:    { fontSize:10, color:"#4a5568" },
    kpi:    { background:"#0b1120", border:"1px solid rgba(255,255,255,0.07)", borderRadius:12, padding:"14px 16px", flex:1 },
    kpival: { fontSize:24, fontWeight:700, margin:"4px 0 2px" },
    kpilbl: { fontSize:10, color:"#4a5568", textTransform:"uppercase", letterSpacing:".07em" },
    card:   { background:"#0b1120", border:"1px solid rgba(255,255,255,0.07)", borderRadius:12, padding:"16px", margin:"0 16px 12px" },
    cardtitle: { fontSize:12, fontWeight:700, color:"#8b97aa", textTransform:"uppercase", letterSpacing:".07em", marginBottom:12 },
    row:    { display:"flex", alignItems:"center", gap:10, padding:"8px 0", borderBottom:"1px solid rgba(255,255,255,0.04)" },
    nav:    { position:"fixed", bottom:0, left:0, right:0, background:"#0b1120", borderTop:"1px solid rgba(255,255,255,0.07)", display:"flex", zIndex:100 },
    navbtn: { flex:1, padding:"10px 0 14px", background:"none", border:"none", cursor:"pointer", display:"flex", flexDirection:"column", alignItems:"center", gap:2 },
    navlbl: { fontSize:9, letterSpacing:".04em" },
  };

  const NODES = [
    { name:"Kamailio SBC", ip:"192.168.0.10",  ok:true },
    { name:"Asterisk PBX", ip:"192.168.0.161", ok:true },
    { name:"Asterisk HA",  ip:"192.168.0.216", ok:true },
    { name:"MySQL 8.0",    ip:"192.168.0.161", ok:!!health },
    { name:"Nginx+Panel",  ip:"192.168.0.7",   ok:!!health },
  ];

  const fmtDur = (s) => { const n=parseInt(s)||0; if(!n)return"0s"; if(n<60)return n+"s"; return Math.floor(n/60)+"m "+n%60+"s"; };
  const fmtDate = (d) => { if(!d)return""; try{return new Date(d).toLocaleString("es-EC",{day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit",hour12:false});}catch{return d;} };

  return (
    <div style={s.wrap}>
      <div style={s.header}>
        <div>
          <div style={s.title}>Netvoice</div>
          <div style={s.sub}>Linkotel · {ts.toLocaleTimeString("es-EC",{hour12:false})}</div>
        </div>
        <div style={{ display:"flex",alignItems:"center",gap:8 }}>
          <div style={{ width:8,height:8,borderRadius:"50%",background:health?"#00c98d":"#ff4757",boxShadow:health?"0 0 6px #00c98d":"none" }}/>
          <span style={{ fontSize:11,color:health?"#00c98d":"#ff4757" }}>{health?"Online":"Offline"}</span>
          <button onClick={load} style={{ background:"none",border:"none",color:"#4a5568",fontSize:16,cursor:"pointer" }}>
            {loading?"⏳":"↺"}
          </button>
        </div>
      </div>

      {tab==="home"&&(
        <div style={{ padding:"16px 16px 0" }}>
          <div style={{ display:"flex",gap:8,marginBottom:12 }}>
            <div style={s.kpi}>
              <div style={s.kpilbl}>Llamadas</div>
              <div style={{ ...s.kpival,color:"#1a8cff" }}>{total.toLocaleString()}</div>
              <div style={{ fontSize:10,color:"#4a5568" }}>{cont} contest.</div>
            </div>
            <div style={s.kpi}>
              <div style={s.kpilbl}>ASR</div>
              <div style={{ ...s.kpival,color:parseFloat(asr)>65?"#00c98d":"#f5a623" }}>{asr}%</div>
              <div style={{ fontSize:10,color:"#4a5568" }}>Answer ratio</div>
            </div>
          </div>
          <div style={{ display:"flex",gap:8,marginBottom:16 }}>
            <div style={s.kpi}>
              <div style={s.kpilbl}>Minutos</div>
              <div style={{ ...s.kpival,color:"#a29bfe" }}>{mins.toLocaleString()}</div>
              <div style={{ fontSize:10,color:"#4a5568" }}>Este mes</div>
            </div>
            <div style={s.kpi}>
              <div style={s.kpilbl}>CPU</div>
              <div style={{ ...s.kpival,color:health?.cpu_pct>80?"#ff4757":health?.cpu_pct>60?"#f5a623":"#00c98d" }}>{health?.cpu_pct||0}%</div>
              <div style={{ fontSize:10,color:"#4a5568" }}>voip-panel-01</div>
            </div>
          </div>

          <div style={s.card}>
            <div style={s.cardtitle}>◈ Infraestructura</div>
            {NODES.map(n=>(
              <div key={n.name} style={s.row}>
                <div style={{ width:7,height:7,borderRadius:"50%",flexShrink:0,background:n.ok?"#00c98d":"#ff4757",boxShadow:n.ok?"0 0 4px #00c98d":"none" }}/>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:12,color:"#e8edf5" }}>{n.name}</div>
                  <div style={{ fontSize:10,color:"#4a5568",fontFamily:"monospace" }}>{n.ip}</div>
                </div>
                <span style={{ fontSize:10,fontWeight:700,color:n.ok?"#00c98d":"#ff4757" }}>{n.ok?"OK":"DOWN"}</span>
              </div>
            ))}
          </div>

          {health&&(
            <div style={s.card}>
              <div style={s.cardtitle}>◈ Recursos servidor</div>
              {[
                {lbl:"CPU",  val:health.cpu_pct+"%",  pct:health.cpu_pct,  color:"#1a8cff"},
                {lbl:"RAM",  val:health.mem_pct+"%",  pct:health.mem_pct,  color:"#00c98d"},
                {lbl:"Disco",val:health.disk_pct+"%", pct:health.disk_pct, color:"#f5a623"},
              ].map(({lbl,val,pct,color})=>(
                <div key={lbl} style={{ marginBottom:10 }}>
                  <div style={{ display:"flex",justifyContent:"space-between",marginBottom:3,fontSize:11 }}>
                    <span style={{ color:"#8b97aa" }}>{lbl}</span>
                    <span style={{ color,fontFamily:"monospace",fontWeight:700 }}>{val}</span>
                  </div>
                  <div style={{ background:"rgba(255,255,255,0.05)",borderRadius:4,height:4 }}>
                    <div style={{ width:Math.min(pct,100)+"%",height:4,borderRadius:4,background:color,transition:"width .6s ease" }}/>
                  </div>
                </div>
              ))}
              <div style={{ fontSize:10,color:"#4a5568",marginTop:8 }}>Uptime: {health.uptime_str}</div>
            </div>
          )}
        </div>
      )}

      {tab==="cdr"&&(
        <div style={{ padding:"16px 16px 0" }}>
          <div style={s.card}>
            <div style={s.cardtitle}>Ultimas 20 llamadas</div>
            {cdrs.map((r,i)=>(
              <div key={i} style={s.row}>
                <div style={{ width:7,height:7,borderRadius:"50%",flexShrink:0,
                  background:r.disposition==="ANSWERED"?"#00c98d":r.disposition==="BUSY"?"#f5a623":"#ff4757" }}/>
                <div style={{ flex:1,minWidth:0 }}>
                  <div style={{ fontSize:12,color:"#e8edf5",fontFamily:"monospace" }}>
                    {r.src} → {r.dst}
                  </div>
                  <div style={{ fontSize:10,color:"#4a5568" }}>{fmtDate(r.calldate)} · {fmtDur(r.billsec)}</div>
                </div>
                <span style={{ fontSize:10,color:r.disposition==="ANSWERED"?"#00c98d":"#ff4757",flexShrink:0 }}>
                  {r.disposition==="ANSWERED"?"✓":"x"}
                </span>
              </div>
            ))}
            {!cdrs.length&&<div style={{ textAlign:"center",padding:"24px 0",color:"#4a5568",fontSize:12 }}>Sin registros</div>}
          </div>
        </div>
      )}

      {tab==="noc"&&(
        <div style={{ padding:"16px 16px 0" }}>
          <div style={s.card}>
            <div style={s.cardtitle}>Estado NOC</div>
            {health?(
              <div>
                {[
                  {lbl:"CPU",           val:health.cpu_pct+"%"},
                  {lbl:"RAM usada",     val:health.mem_used_mb+"MB / "+health.mem_total_mb+"MB"},
                  {lbl:"Disco usado",   val:health.disk_used_gb+"GB / "+health.disk_total_gb+"GB"},
                  {lbl:"Load 1m",       val:health.load_avg?.[0]},
                  {lbl:"Uptime",        val:health.uptime_str},
                ].map(({lbl,val})=>(
                  <div key={lbl} style={{ display:"flex",justifyContent:"space-between",padding:"8px 0",borderBottom:"1px solid rgba(255,255,255,0.04)",fontSize:12 }}>
                    <span style={{ color:"#8b97aa" }}>{lbl}</span>
                    <span style={{ color:"#e8edf5",fontFamily:"monospace" }}>{val}</span>
                  </div>
                ))}
              </div>
            ):<div style={{ textAlign:"center",padding:"24px 0",color:"#4a5568" }}>Sin datos</div>}
          </div>
          <div style={{ padding:"0 16px" }}>
            <button onClick={()=>navigate("/network")}
              style={{ width:"100%",padding:"12px",background:"#1a8cff",border:"none",borderRadius:10,color:"#fff",fontSize:13,fontWeight:600,cursor:"pointer" }}>
              Ver NOC completo →
            </button>
          </div>
        </div>
      )}

      <nav style={s.nav}>
        {[
          { key:"home", icon:"⌂", label:"Inicio" },
          { key:"cdr",  icon:"☎", label:"CDRs" },
          { key:"noc",  icon:"◎", label:"NOC" },
        ].map(({key,icon,label})=>(
          <button key={key} style={{ ...s.navbtn }} onClick={()=>setTab(key)}>
            <span style={{ fontSize:20,color:tab===key?"#1a8cff":"#4a5568" }}>{icon}</span>
            <span style={{ ...s.navlbl,color:tab===key?"#1a8cff":"#4a5568" }}>{label}</span>
          </button>
        ))}
        <button style={{ ...s.navbtn }} onClick={()=>navigate("/dashboard")}>
          <span style={{ fontSize:20,color:"#4a5568" }}>▦</span>
          <span style={{ ...s.navlbl,color:"#4a5568" }}>Panel</span>
        </button>
      </nav>
    </div>
  );
}
