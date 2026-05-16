import { useState, useEffect, useRef } from "react";

function fmtDur(s) {
  const n = parseInt(s)||0;
  if (!n) return "0s";
  if (n < 60) return n+"s";
  return Math.floor(n/60)+"m "+n%60+"s";
}

function DispBadge({ d }) {
  const map = {
    ANSWERED:   ["nv-badge-ok",   "● Contestada"],
    BUSY:       ["nv-badge-warn", "● Ocupado"],
    "NO ANSWER":["nv-badge-muted","● Sin resp."],
    FAILED:     ["nv-badge-err",  "● Fallida"],
  };
  const [cls,lbl] = map[d]||["nv-badge-muted",d||"—"];
  return <span className={"nv-badge "+cls} style={{ fontSize:10 }}>{lbl}</span>;
}

export default function CDRLive() {
  const [cdrs,    setCdrs]    = useState([]);
  const [status,  setStatus]  = useState("connecting");
  const [count,   setCount]   = useState(0);
  const wsRef = useRef(null);

  useEffect(() => {
    const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = proto + "//" + window.location.host + "/ws/cdr";
    let ws;
    let reconnectTimer;

    const connect = () => {
      ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setStatus("connected");
        console.log("CDR WebSocket conectado");
      };

      ws.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data);
          if (msg.type === "history") {
            setCdrs(msg.data||[]);
          } else if (msg.type === "new_cdrs") {
            setCdrs(prev => [...(msg.data||[]), ...prev].slice(0,100));
            setCount(c => c + (msg.data||[]).length);
          }
        } catch {}
      };

      ws.onerror = () => setStatus("error");

      ws.onclose = () => {
        setStatus("reconnecting");
        reconnectTimer = setTimeout(connect, 5000);
      };
    };

    connect();

    return () => {
      clearTimeout(reconnectTimer);
      if (ws) ws.close();
    };
  }, []);

  const STATUS_COLOR = {
    connected:    "var(--success)",
    connecting:   "var(--warning)",
    reconnecting: "var(--warning)",
    error:        "var(--danger)",
  };

  const STATUS_LABEL = {
    connected:    "Live",
    connecting:   "Conectando...",
    reconnecting: "Reconectando...",
    error:        "Error",
  };

  return (
    <div>
      <div className="nv-page-header">
        <div>
          <div className="nv-page-title">CDR Live — Tiempo real</div>
          <div className="nv-page-sub">
            <span style={{ display:"inline-flex",alignItems:"center",gap:6 }}>
              <span style={{ width:7,height:7,borderRadius:"50%",background:STATUS_COLOR[status],
                display:"inline-block",boxShadow:status==="connected"?"0 0 6px var(--success)":"none",
                animation:status==="connected"?"blink 2s ease-in-out infinite":"none" }}/>
              <span style={{ color:STATUS_COLOR[status],fontWeight:600 }}>{STATUS_LABEL[status]}</span>
            </span>
            {count>0&&<span style={{ marginLeft:12,color:"var(--text-muted)" }}>{count} nuevos desde conexión</span>}
          </div>
        </div>
        <div className="nv-page-actions">
          <button className="nv-btn nv-btn-ghost nv-btn-sm" onClick={()=>setCdrs([])}>
            Limpiar
          </button>
        </div>
      </div>

      <div className="nv-card" style={{ padding:0 }}>
        {cdrs.length===0 ? (
          <div style={{ textAlign:"center",padding:"48px 20px" }}>
            <div style={{ fontSize:32,opacity:.2,marginBottom:12 }}>☎</div>
            <div style={{ fontSize:13,color:"var(--text-muted)" }}>
              {status==="connected"?"Esperando llamadas...":"Conectando al servidor..."}
            </div>
          </div>
        ) : (
          <div className="nv-table-wrap">
            <table className="nv-table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Origen</th>
                  <th>Destino</th>
                  <th>Contexto</th>
                  <th>Dur.</th>
                  <th>Billsec</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {cdrs.map((r,i)=>(
                  <tr key={r.uniqueid||i} style={{ animation:i===0&&count>0?"fadeIn .5s ease":"none" }}>
                    <td style={{ fontSize:10,color:"var(--text-muted)",whiteSpace:"nowrap",fontFamily:"var(--font-mono)" }}>
                      {r.calldate}
                    </td>
                    <td className="mono" style={{ fontWeight:600 }}>{r.src||"—"}</td>
                    <td className="mono">{r.dst||"—"}</td>
                    <td style={{ fontSize:10,color:"var(--text-muted)" }}>{r.dcontext||"—"}</td>
                    <td className="mono" style={{ color:"var(--text-muted)" }}>{fmtDur(r.duration)}</td>
                    <td className="mono" style={{ color:"var(--brand)",fontWeight:600 }}>{fmtDur(r.billsec)}</td>
                    <td><DispBadge d={r.disposition}/></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
