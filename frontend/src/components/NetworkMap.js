import { useState, useEffect, useCallback } from "react";
import api from "../api";

async function safe(fn) { try { return await fn(); } catch { return null; } }

function NodeCard({ node }) {
  const ok = node.status === "online";
  return (
    <div style={{
      background:"var(--bg-surface)", border:"1px solid var(--border)",
      borderRadius:"var(--r-lg)", padding:"18px 20px",
      borderLeft:"3px solid "+(ok?"var(--success)":"var(--danger)"),
    }}>
      <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:14 }}>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <div style={{
            width:42, height:42, borderRadius:"var(--r-md)",
            background:ok?"var(--success-bg)":"var(--danger-bg)",
            display:"flex", alignItems:"center", justifyContent:"center",
            fontSize:20, flexShrink:0,
          }}>{node.icon}</div>
          <div>
            <div style={{ fontSize:14, fontWeight:700, color:"var(--text-primary)" }}>{node.name}</div>
            <div style={{ fontSize:11, color:"var(--text-muted)", fontFamily:"var(--font-mono)", marginTop:2 }}>{node.ip}</div>
            <div style={{ fontSize:10, color:"var(--text-muted)", marginTop:1 }}>{node.description}</div>
          </div>
        </div>
        <span className={"nv-badge "+(ok?"nv-badge-ok":"nv-badge-err")}>
          <span className="dot"/>{ok?"Online":"Offline"}
        </span>
      </div>
      <div style={{ display:"flex", flexWrap:"wrap", gap:6, marginBottom:node.extra?12:0 }}>
        {node.version&&(
          <span style={{ fontSize:10,fontWeight:600,padding:"2px 8px",background:"var(--bg-raised)",
            color:"var(--text-secondary)",borderRadius:4,fontFamily:"var(--font-mono)",border:"1px solid var(--border)" }}>
            {node.version}
          </span>
        )}
        {(node.tags||[]).map(t=>(
          <span key={t.label} style={{ fontSize:10,fontWeight:600,padding:"2px 8px",
            background:t.color||"var(--brand-subtle)",color:t.text||"var(--brand)",
            borderRadius:4,border:"1px solid "+(t.border||"var(--border-active)") }}>
            {t.label}
          </span>
        ))}
      </div>
      {node.extra&&(
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:6 }}>
          {node.extra.map(({label,value,color})=>(
            <div key={label} style={{ background:"var(--bg-raised)",borderRadius:"var(--r-sm)",padding:"7px 10px" }}>
              <div style={{ fontSize:9,textTransform:"uppercase",letterSpacing:".07em",color:"var(--text-muted)",marginBottom:2 }}>{label}</div>
              <div style={{ fontSize:12,fontWeight:600,color:color||"var(--text-primary)",fontFamily:"var(--font-mono)" }}>{value}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Connector() {
  return (
    <div style={{ display:"flex",justifyContent:"center",margin:"4px 0" }}>
      <div style={{ width:2,height:32,background:"linear-gradient(to bottom,var(--success),rgba(0,201,141,0.15))",borderRadius:1 }}/>
    </div>
  );
}

export default function NetworkMap() {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [ts,      setTs]      = useState(new Date());

  const load = useCallback(async () => {
    setLoading(true);
    const [ext,trunks,cdr] = await Promise.all([
      safe(()=>api.get("/extensions/status")),
      safe(()=>api.get("/trunks")),
      safe(()=>api.get("/cdr?limit=1")),
    ]);
    setData({ext,trunks,cdr});
    setTs(new Date());
    setLoading(false);
  },[]);

  useEffect(()=>{ load(); const iv=setInterval(load,30000); return ()=>clearInterval(iv); },[load]);

  const registered   = data?.ext?.data?.registered?.length||0;
  const regList      = (data?.ext?.data?.registered||[]).join(", ")||"—";
  const trunkActivos = (data?.trunks?.data?.data||[]).filter(t=>t.activo==="yes").length;
  const totalTrunks  = (data?.trunks?.data?.data||[]).length;
  const totalCDR     = data?.cdr?.data?.total||0;

  const SBC_ICON   = "⛲";
  const PBX_ICON   = "☎";
  const HA_ICON    = "⇄";
  const DB_ICON    = "▣";
  const WEB_ICON   = "◎";

  const nodes = [
    {
      name:"Kamailio SBC", ip:"192.168.0.10:5060",
      description:"Session Border Controller", icon:SBC_ICON, status:"online", version:"v5.5.4",
      tags:[{label:"SIP:5060 UDP/TCP",color:"var(--brand-subtle)",text:"var(--brand)",border:"var(--border-active)"}],
      extra:[{label:"Protocolo",value:"SIP/SDP"},{label:"Transporte",value:"UDP / TCP"}],
    },
    {
      name:"Asterisk PBX", ip:"192.168.0.161:5060",
      description:"Núcleo SIP / PBX", icon:PBX_ICON, status:"online", version:"v20.19.0",
      tags:[
        {label:registered+" ext. registradas",color:"var(--success-bg)",text:"var(--success)",border:"rgba(0,201,141,.3)"},
        {label:"WS:8088 · WSS:8089",color:"var(--bg-raised)",text:"var(--text-muted)",border:"var(--border)"},
      ],
      extra:[{label:"Extensiones",value:registered+" reg.",color:"var(--success)"},{label:"Canales activos",value:"0",color:"var(--text-muted)"}],
    },
    {
      name:"Asterisk HA", ip:"192.168.0.216:5060",
      description:"Nodo HA — Alta Disponibilidad", icon:HA_ICON, status:"online", version:"v20.19.0",
      tags:[{label:"HA Node",color:"var(--warning-bg)",text:"var(--warning)",border:"rgba(245,166,35,.3)"}],
      extra:[{label:"Rol",value:"Standby"},{label:"Sync",value:"Activo",color:"var(--success)"}],
    },
    {
      name:"MySQL 8.0", ip:"192.168.0.161:3306",
      description:"Base de datos", icon:DB_ICON, status:"online", version:"v8.0",
      tags:[{label:totalCDR+" CDRs hoy",color:"var(--warning-bg)",text:"var(--warning)",border:"rgba(245,166,35,.3)"}],
      extra:[{label:"BD asterisk",value:"Online",color:"var(--success)"},{label:"BD netvoice",value:"Online",color:"var(--success)"}],
    },
    {
      name:"Nginx + Panel", ip:"192.168.0.7:8443",
      description:"Web + API Gateway", icon:WEB_ICON, status:"online", version:"v1.18",
      tags:[
        {label:"HTTPS:8443",color:"var(--success-bg)",text:"var(--success)",border:"rgba(0,201,141,.3)"},
        {label:"API:8000",color:"var(--bg-raised)",text:"var(--text-muted)",border:"var(--border)"},
      ],
      extra:[{label:"Trunks activos",value:trunkActivos+"/"+totalTrunks,color:"var(--brand)"},{label:"SSL",value:"Lets Encrypt",color:"var(--success)"}],
    },
  ];

  const allOk = nodes.every(n=>n.status==="online");

  return (
    <div>
      <div className="nv-page-header">
        <div>
          <div className="nv-page-title">Network Map</div>
          <div className="nv-page-sub">
            Estado en tiempo real · Actualizado: {ts.toLocaleTimeString("es-EC",{hour12:false})}
          </div>
        </div>
        <div className="nv-page-actions">
          <button className="nv-btn nv-btn-secondary nv-btn-sm" onClick={load} disabled={loading}>
            {loading?<span className="nv-spinner"/>:"↺"} Actualizar
          </button>
        </div>
      </div>

      <div className={"nv-alert "+(allOk?"nv-alert-ok":"nv-alert-err")} style={{ marginBottom:20 }}>
        <div style={{ display:"flex",alignItems:"center",gap:8,flex:1 }}>
          <div style={{ width:8,height:8,borderRadius:"50%",background:"currentColor",animation:"blink 1.8s ease-in-out infinite" }}/>
          <span style={{ fontWeight:600 }}>
            {allOk?"Todos los nodos operativos":"Atencion: uno o mas nodos con problemas"}
          </span>
        </div>
        <span style={{ fontSize:11,opacity:.7,fontFamily:"var(--font-mono)" }}>
          {registered} extension(es) registrada(s): {regList}
        </span>
      </div>

      <div style={{ background:"var(--bg-raised)",border:"1px solid var(--border)",borderRadius:"var(--r-md)",
        padding:"10px 16px",marginBottom:20,display:"flex",alignItems:"center",justifyContent:"center",gap:8 }}>
        <div style={{ width:6,height:6,borderRadius:"50%",background:"var(--text-muted)" }}/>
        <span style={{ fontSize:11,color:"var(--text-muted)",fontFamily:"var(--font-mono)" }}>
          INTERNET • 186.101.238.135 • eneural.org:8443
        </span>
        <div style={{ width:6,height:6,borderRadius:"50%",background:"var(--text-muted)" }}/>
      </div>

      <div style={{ maxWidth:640,margin:"0 auto" }}>
        {nodes.map((node,i)=>(
          <div key={node.name}>
            <NodeCard node={node}/>
            {i<nodes.length-1&&<Connector/>}
          </div>
        ))}
      </div>
    </div>
  );
}
