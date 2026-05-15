import { useState, useEffect } from "react";
import api from "../api";

function Section({ title, children }) {
  return (
    <div className="nv-card" style={{ marginBottom:16 }}>
      <div className="nv-card-header"><span className="nv-card-title">{title}</span></div>
      {children}
    </div>
  );
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

export default function Settings() {
  const [tab,     setTab]     = useState("password");
  const [msg,     setMsg]     = useState(null);
  const [loading, setLoading] = useState(false);
  const [current, setCurrent] = useState("");
  const [newPwd,  setNewPwd]  = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPwd, setShowPwd] = useState({c:false,n:false,cf:false});
  const [sysInfo, setSysInfo] = useState(null);

  const showMsg = (text,type="success") => { setMsg({text,type}); setTimeout(()=>setMsg(null),5000); };

  useEffect(()=>{
    if (tab==="sistema") {
      api.get("/").then(r=>setSysInfo(r.data)).catch(()=>setSysInfo(null));
    }
  },[tab]);

  const handlePassword = async () => {
    if (!current||!newPwd||!confirm) return showMsg("Todos los campos son requeridos","error");
    if (newPwd!==confirm) return showMsg("Las contraseñas no coinciden","error");
    if (newPwd.length<8) return showMsg("Mínimo 8 caracteres","error");
    if (current===newPwd) return showMsg("La nueva debe ser diferente a la actual","error");
    setLoading(true);
    try {
      await api.post("/auth/change-password",{ current_password:current, new_password:newPwd });
      showMsg("Contraseña actualizada correctamente");
      setCurrent(""); setNewPwd(""); setConfirm("");
    } catch(e) {
      showMsg(e?.response?.data?.detail||"Error al cambiar contraseña","error");
    } finally { setLoading(false); }
  };

  const TABS = [
    { key:"password", label:"⚿ Contraseña" },
    { key:"sistema",  label:"⚙ Sistema" },
    { key:"info",     label:"ℹ Información" },
  ];

  const PWD_FIELDS = [
    { label:"Contraseña actual",  val:current, set:setCurrent, sk:"c"  },
    { label:"Nueva contraseña",   val:newPwd,  set:setNewPwd,  sk:"n"  },
    { label:"Confirmar",           val:confirm, set:setConfirm, sk:"cf" },
  ];

  const STRENGTH = [
    [()=>newPwd.length>=8,    "8+ caracteres"],
    [()=>/[A-Z]/.test(newPwd),"Mayúscula"],
    [()=>/[0-9]/.test(newPwd),"Número"],
    [()=>/[^A-Za-z0-9]/.test(newPwd),"Símbolo"],
  ];

  const SERVICES = [
    { name:"FastAPI Backend", ip:"127.0.0.1:8000", role:"API REST",          ok:!!sysInfo },
    { name:"Asterisk PBX",   ip:"192.168.0.161",  role:"PBX / SIP",         ok:true },
    { name:"Kamailio SBC",   ip:"192.168.0.10",   role:"Border Controller",  ok:true },
    { name:"MySQL 8.0",      ip:"192.168.0.161",  role:"Base de datos",      ok:true },
    { name:"Nginx",          ip:"192.168.0.7",    role:"Web / API Gateway",  ok:true },
    { name:"Asterisk HA",    ip:"192.168.0.216",  role:"Alta disponibilidad",ok:true },
  ];

  const INFO = [
    ["Plataforma",  "Netvoice Softswitch"],
    ["Version",     "v2.0 Carrier-Class"],
    ["Empresa",     "Linkotel"],
    ["Asterisk",    "20.19.0 PJSIP"],
    ["BD",          "MySQL 8.0"],
    ["Backend",     "FastAPI + Python"],
    ["Frontend",    "React 19 + CRA"],
    ["Web",         "Nginx + HTTPS"],
    ["SBC",         "Kamailio v5.5.4"],
    ["HA Node",     "Asterisk 20.19.0"],
    ["Panel URL",   "panel.eneural.org"],
    ["ARI",         "192.168.0.161:8088"],
  ];

  return (
    <div>
      <div className="nv-page-header">
        <div>
          <div className="nv-page-title">Configuración</div>
          <div className="nv-page-sub">Administración del sistema</div>
        </div>
      </div>

      <Alert msg={msg} onClose={()=>setMsg(null)}/>

      <div className="nv-tabs">
        {TABS.map(t=>(
          <div key={t.key} className={"nv-tab"+(tab===t.key?" active":"")} onClick={()=>setTab(t.key)}>
            {t.label}
          </div>
        ))}
      </div>

      {tab==="password" && (
        <Section title="⚿ Cambiar contraseña">
          <div style={{ maxWidth:400 }}>
            {PWD_FIELDS.map(({label,val,set,sk})=>(
              <div key={sk} className="nv-form-field" style={{ marginBottom:12 }}>
                <label className="nv-label">{label}</label>
                <div style={{ position:"relative" }}>
                  <input className="nv-input" type={showPwd[sk]?"text":"password"}
                    value={val} onChange={e=>set(e.target.value)}
                    placeholder="••••••••"
                    style={{ paddingRight:36 }}/>
                  <button type="button"
                    onClick={()=>setShowPwd(p=>({...p,[sk]:!p[sk]}))}
                    style={{ position:"absolute",right:8,top:"50%",transform:"translateY(-50%)",
                      background:"none",border:"none",color:"var(--text-muted)",cursor:"pointer",fontSize:13 }}>
                    {showPwd[sk]?"○":"●"}
                  </button>
                </div>
              </div>
            ))}
            {newPwd && (
              <div style={{ display:"flex", gap:10, flexWrap:"wrap", marginBottom:14 }}>
                {STRENGTH.map(([check,lbl])=>{
                  const ok = check();
                  return (
                    <span key={lbl} style={{ fontSize:10, color:ok?"var(--success)":"var(--danger)" }}>
                      {ok?"✓":"○"} {lbl}
                    </span>
                  );
                })}
              </div>
            )}
            <button className="nv-btn nv-btn-primary" onClick={handlePassword} disabled={loading}>
              {loading?<span className="nv-spinner"/>:"✓ Actualizar contraseña"}
            </button>
          </div>
        </Section>
      )}

      {tab==="sistema" && (
        <div>
          <Section title="◉ Estado de servicios">
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))", gap:10 }}>
              {SERVICES.map(n=>(
                <div key={n.name} style={{ display:"flex",alignItems:"center",gap:10,
                  padding:"10px 12px",background:"var(--bg-raised)",
                  borderRadius:"var(--r-sm)",border:"1px solid var(--border)" }}>
                  <div style={{ width:8,height:8,borderRadius:"50%",flexShrink:0,
                    background:n.ok?"var(--success)":"var(--danger)",
                    boxShadow:n.ok?"0 0 6px var(--success)":"none" }}/>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:12,fontWeight:600,color:"var(--text-primary)" }}>{n.name}</div>
                    <div style={{ fontSize:10,color:"var(--text-muted)",fontFamily:"var(--font-mono)" }}>{n.ip}</div>
                  </div>
                  <div style={{ textAlign:"right" }}>
                    <div style={{ fontSize:10,fontWeight:700,color:n.ok?"var(--success)":"var(--danger)" }}>
                      {n.ok?"Online":"Offline"}
                    </div>
                    <div style={{ fontSize:9,color:"var(--text-muted)" }}>{n.role}</div>
                  </div>
                </div>
              ))}
            </div>
          </Section>
          {sysInfo && (
            <Section title="▦ API Info">
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
                {Object.entries(sysInfo).map(([k,v])=>(
                  <div key={k} style={{ padding:"8px 10px",background:"var(--bg-raised)",borderRadius:"var(--r-sm)" }}>
                    <div style={{ fontSize:9,textTransform:"uppercase",letterSpacing:".07em",color:"var(--text-muted)",marginBottom:2 }}>{k}</div>
                    <div style={{ fontSize:12,fontWeight:600,color:"var(--text-primary)",fontFamily:"var(--font-mono)" }}>{String(v)}</div>
                  </div>
                ))}
              </div>
            </Section>
          )}
        </div>
      )}

      {tab==="info" && (
        <Section title="ℹ Stack técnico">
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
            {INFO.map(([k,v])=>(
              <div key={k} style={{ padding:"8px 10px",background:"var(--bg-raised)",borderRadius:"var(--r-sm)" }}>
                <div style={{ fontSize:9,textTransform:"uppercase",letterSpacing:".07em",color:"var(--text-muted)",marginBottom:2 }}>{k}</div>
                <div style={{ fontSize:12,fontWeight:600,color:"var(--text-primary)",fontFamily:"var(--font-mono)" }}>{v}</div>
              </div>
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}
