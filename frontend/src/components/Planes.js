import { useState, useEffect, useCallback } from "react";
import api from "../api";

async function safe(fn) { try { return await fn(); } catch { return null; } }

function fmt$(v) { return v!=null ? "$"+parseFloat(v).toFixed(4) : "—"; }
function fmtMin(v) { return v!=null ? parseInt(v).toLocaleString()+" min" : "—"; }

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

function PlanModal({ plan, onClose, onSave }) {
  const isEdit = !!plan?.id;
  const empty = { nombre:"",descripcion:"",pension_mensual:"",minutos_incluidos:0,minutos_onnet:0,tarifa_local:"",tarifa_regional:"",tarifa_nacional:"",tarifa_celular:"",tarifa_onnet:"0",tarifa_internacional:"" };
  const [form,setForm] = useState(isEdit?{...empty,...plan}:empty);
  const [busy,setBusy] = useState(false);
  const [err,setErr]   = useState(null);
  const set = (k,v) => setForm(f=>({...f,[k]:v}));

  const submit = async () => {
    if (!form.nombre) return setErr("El nombre del plan es requerido");
    setBusy(true); setErr(null);
    try {
      const payload = {
        nombre:            form.nombre,
        descripcion:       form.descripcion||"",
        pension_mensual:   parseFloat(form.pension_mensual)||0,
        minutos_incluidos: parseInt(form.minutos_incluidos)||0,
        minutos_onnet:     parseInt(form.minutos_onnet)||0,
        tarifa_local:      parseFloat(form.tarifa_local)||0,
        tarifa_regional:   parseFloat(form.tarifa_regional)||0,
        tarifa_nacional:   parseFloat(form.tarifa_nacional)||0,
        tarifa_celular:    parseFloat(form.tarifa_celular)||0,
        tarifa_onnet:      parseFloat(form.tarifa_onnet)||0,
        tarifa_internacional: parseFloat(form.tarifa_internacional)||0,
      };
      if (isEdit) await api.put("/planes/"+plan.id, payload);
      else        await api.post("/planes", payload);
      onSave();
    } catch(e) { setErr(e?.response?.data?.detail||"Error al guardar"); }
    finally { setBusy(false); }
  };

  const fields = [
    { section:"Comercial", rows: [
      [{ k:"nombre",          l:"Nombre del plan *",  t:"text",   ph:"ej: Plan Empresarial 100" },
       { k:"descripcion",     l:"Descripción",      t:"text",   ph:"Descripción breve" }],
      [{ k:"pension_mensual", l:"Pensión mensual ($)", t:"number", ph:"0.00" },
       { k:"minutos_incluidos",l:"Minutos incluidos", t:"number", ph:"0" }],
      [{ k:"minutos_onnet",   l:"Minutos on-net",     t:"number", ph:"0" },
       { k:"tarifa_onnet",    l:"Tarifa on-net ($/min)", t:"number", ph:"0.0000" }],
    ]},
    { section:"Tarifas por destino ($/min)", rows: [
      [{ k:"tarifa_local",    l:"Local",              t:"number", ph:"0.0000" },
       { k:"tarifa_regional", l:"Regional",           t:"number", ph:"0.0000" }],
      [{ k:"tarifa_nacional", l:"Nacional",           t:"number", ph:"0.0000" },
       { k:"tarifa_celular",  l:"Celular",            t:"number", ph:"0.0000" }],
      [{ k:"tarifa_internacional",l:"Internacional",  t:"number", ph:"0.0000" },
       null],
    ]},
  ];

  return (
    <div className="nv-modal-overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="nv-modal" style={{ maxWidth:620 }}>
        <div className="nv-modal-header">
          <span className="nv-modal-title">{isEdit?"Editar plan: "+plan.nombre:"Nuevo plan de servicio"}</span>
          <button className="nv-modal-close" onClick={onClose}>✕</button>
        </div>
        {err && <div className="nv-alert nv-alert-err" style={{ marginBottom:14 }}>{err}</div>}
        {fields.map(({section,rows})=>(
          <div key={section} style={{ marginBottom:16 }}>
            <div style={{ fontSize:10, fontWeight:700, textTransform:"uppercase", letterSpacing:".07em", color:"var(--text-muted)", marginBottom:10, paddingBottom:6, borderBottom:"1px solid var(--border-subtle)" }}>{section}</div>
            {rows.map((row,ri)=>(
              <div key={ri} className="nv-form-row" style={{ marginBottom:8 }}>
                {row.map((f,fi)=> f ? (
                  <div key={f.k} className="nv-form-field">
                    <label className="nv-label">{f.l}</label>
                    <input className="nv-input" type={f.t} placeholder={f.ph} value={form[f.k]||""} onChange={e=>set(f.k,e.target.value)} step={f.t==="number"?"0.0001":undefined}/>
                  </div>
                ) : <div key={fi}/> )}
              </div>
            ))}
          </div>
        ))}
        <div className="nv-modal-footer">
          <button className="nv-btn nv-btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="nv-btn nv-btn-primary" onClick={submit} disabled={busy}>
            {busy?<span className="nv-spinner"/>:(isEdit?"✓ Guardar cambios":"+ Crear plan")}
          </button>
        </div>
      </div>
    </div>
  );
}

function PlanCard({ plan, clientes, onEdit, onToggle, onDelete }) {
  const activo = plan.activo === "yes" || plan.activo == null;
  return (
    <div style={{
      background:"var(--bg-surface)", border:"1px solid var(--border)",
      borderRadius:"var(--r-lg)", padding:"18px 20px",
      borderTop:"3px solid "+(activo?"var(--brand)":"var(--border)"),
      transition:"all var(--t)",
    }}>
      <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:14 }}>
        <div>
          <div style={{ fontSize:14, fontWeight:700, color:"var(--text-primary)", marginBottom:3 }}>{plan.nombre}</div>
          <div style={{ fontSize:11, color:"var(--text-muted)" }}>{plan.descripcion||"Sin descripción"}</div>
        </div>
        <span className={"nv-badge "+(activo?"nv-badge-info":"nv-badge-muted")}>
          {activo?"Activo":"Inactivo"}
        </span>
      </div>

      <div style={{ textAlign:"center", padding:"12px 0", borderTop:"1px solid var(--border-subtle)", borderBottom:"1px solid var(--border-subtle)", marginBottom:14 }}>
        <div style={{ fontFamily:"var(--font-mono)", fontSize:28, fontWeight:700, color:"var(--brand)" }}>
          ${parseFloat(plan.pension_mensual||0).toFixed(2)}
        </div>
        <div style={{ fontSize:10, color:"var(--text-muted)", marginTop:2 }}>pensión mensual + IVA</div>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:6, marginBottom:14 }}>
        {[
          { lbl:"Min. incluidos", val:fmtMin(plan.minutos_incluidos), color:"var(--success)" },
          { lbl:"Min. on-net",    val:fmtMin(plan.minutos_onnet),     color:"var(--info)" },
          { lbl:"Tarifa local",   val:fmt$(plan.tarifa_local),        color:"var(--text-primary)" },
          { lbl:"Tarifa celular", val:fmt$(plan.tarifa_celular),      color:"var(--text-primary)" },
          { lbl:"Tarifa nacional",val:fmt$(plan.tarifa_nacional),     color:"var(--text-primary)" },
          { lbl:"T. internacional",val:fmt$(plan.tarifa_internacional),color:"var(--warning)" },
        ].map(({lbl,val,color})=>(
          <div key={lbl} style={{ background:"var(--bg-raised)", borderRadius:"var(--r-sm)", padding:"7px 10px" }}>
            <div style={{ fontSize:9, textTransform:"uppercase", letterSpacing:".06em", color:"var(--text-muted)", marginBottom:2 }}>{lbl}</div>
            <div style={{ fontSize:12, fontWeight:600, color, fontFamily:"var(--font-mono)" }}>{val}</div>
          </div>
        ))}
      </div>

      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:12 }}>
        <span style={{ fontSize:11, color:"var(--text-muted)" }}>
          <span style={{ fontFamily:"var(--font-mono)", color:"var(--brand)", fontWeight:700 }}>{clientes}</span> clientes
        </span>
      </div>

      <div style={{ display:"flex", gap:6 }}>
        <button className="nv-btn nv-btn-ghost nv-btn-sm" style={{ flex:1 }} onClick={()=>onEdit(plan)}>✎ Editar</button>
        <button className="nv-btn nv-btn-sm" onClick={()=>onToggle(plan)}
          style={{ background:activo?"var(--warning-bg)":"var(--success-bg)", color:activo?"var(--warning)":"var(--success)", border:"1px solid "+(activo?"rgba(245,166,35,.3)":"rgba(0,201,141,.3)"), borderRadius:"var(--r-sm)", padding:"4px 9px", fontSize:11, cursor:"pointer" }}>
          {activo?"⏸ Desactivar":"▶ Activar"}
        </button>
        <button className="nv-btn nv-btn-danger nv-btn-sm" onClick={()=>onDelete(plan)}>✕</button>
      </div>
    </div>
  );
}

export default function Planes() {
  const [data,    setData]    = useState([]);
  const [clMap,   setClMap]   = useState({});
  const [loading, setLoading] = useState(true);
  const [modal,   setModal]   = useState(null);
  const [target,  setTarget]  = useState(null);
  const [msg,     setMsg]     = useState(null);
  const [search,  setSearch]  = useState("");
  const [delConf, setDelConf] = useState(null);

  const showMsg = (text,type="success") => { setMsg({text,type}); setTimeout(()=>setMsg(null),4000); };

  const load = useCallback(async () => {
    setLoading(true);
    const [pl,cl] = await Promise.all([
      safe(()=>api.get("/planes")),
      safe(()=>api.get("/clientes?limit=2000")),
    ]);
    const planes = pl?.data?.data||[];
    const clientes = cl?.data?.data||[];
    const map = {};
    planes.forEach(p=>{ map[p.id]=clientes.filter(c=>c.plan_id===p.id).length; });
    setData(planes);
    setClMap(map);
    setLoading(false);
  },[]);

  useEffect(()=>{ load(); },[load]);

  const handleToggle = async (plan) => {
    const activo = plan.activo==="yes"||plan.activo==null;
    try {
      if (activo) await api.delete("/planes/"+plan.id);
      else        await api.post("/planes/"+plan.id+"/activar");
      showMsg("Plan "+(activo?"desactivado":"activado"));
      load();
    } catch(e) { showMsg(e?.response?.data?.detail||"Error","error"); }
  };

  const handleDelete = async (plan) => {
    try {
      await api.delete("/planes/"+plan.id);
      showMsg("Plan eliminado");
      load();
    } catch(e) { showMsg(e?.response?.data?.detail||"Error al eliminar","error"); }
    setDelConf(null);
  };

  const filtered = data.filter(p=>{
    const q=search.toLowerCase();
    return !q||p.nombre?.toLowerCase().includes(q)||p.descripcion?.toLowerCase().includes(q);
  });

  const activos = data.filter(p=>p.activo==="yes"||p.activo==null).length;
  const totalClientes = Object.values(clMap).reduce((s,v)=>s+v,0);

  return (
    <div>
      <div className="nv-page-header">
        <div>
          <div className="nv-page-title">Planes de servicio</div>
          <div className="nv-page-sub">{data.length} planes · {activos} activos · {totalClientes} clientes asignados</div>
        </div>
        <div className="nv-page-actions">
          <button className="nv-btn nv-btn-secondary nv-btn-sm" onClick={load} disabled={loading}>
            {loading?<span className="nv-spinner"/>:"↺"} Actualizar
          </button>
          <button className="nv-btn nv-btn-primary" onClick={()=>setModal("crear")}>+ Nuevo plan</button>
        </div>
      </div>

      <div className="nv-kpi-grid" style={{ marginBottom:16 }}>
        <div className="nv-kpi">
          <div className="nv-kpi-label">Total planes</div>
          <div className="nv-kpi-value" style={{ color:"var(--brand)" }}>{data.length}</div>
        </div>
        <div className="nv-kpi">
          <div className="nv-kpi-label">Activos</div>
          <div className="nv-kpi-value" style={{ color:"var(--success)" }}>{activos}</div>
        </div>
        <div className="nv-kpi">
          <div className="nv-kpi-label">Clientes asignados</div>
          <div className="nv-kpi-value" style={{ color:"var(--info)" }}>{totalClientes.toLocaleString()}</div>
        </div>
        <div className="nv-kpi">
          <div className="nv-kpi-label">Sin plan</div>
          <div className="nv-kpi-value" style={{ color:"var(--warning)" }}>
            {Math.max(0,(parseInt(Object.values(clMap).reduce((s,v)=>s+v,0))||0))}
          </div>
          <div className="nv-kpi-sub">Pendientes de asignar</div>
        </div>
      </div>

      <Alert msg={msg} onClose={()=>setMsg(null)}/>

      <div style={{ marginBottom:16 }}>
        <div className="nv-search">
          <span style={{ color:"var(--text-muted)", fontSize:12 }}>⌕</span>
          <input placeholder="Buscar planes..." value={search} onChange={e=>setSearch(e.target.value)}/>
          {search&&<button onClick={()=>setSearch("")} style={{ background:"none",border:"none",color:"var(--text-muted)",cursor:"pointer" }}>✕</button>}
        </div>
      </div>

      {loading ? (
        <div className="nv-loading"><span className="nv-spinner"/><span>Cargando planes...</span></div>
      ) : filtered.length===0 ? (
        <div className="nv-card" style={{ textAlign:"center", padding:"48px 20px" }}>
          <div style={{ fontSize:32, opacity:.2, marginBottom:12 }}>◈</div>
          <div style={{ fontSize:13, color:"var(--text-muted)", marginBottom:16 }}>{search?"Sin resultados":"Sin planes configurados"}</div>
          {!search&&<button className="nv-btn nv-btn-primary" onClick={()=>setModal("crear")}>+ Crear primer plan</button>}
        </div>
      ) : (
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))", gap:16 }}>
          {filtered.map(p=>(
            <PlanCard key={p.id} plan={p} clientes={clMap[p.id]||0}
              onEdit={p=>{ setTarget(p); setModal("editar"); }}
              onToggle={handleToggle}
              onDelete={p=>setDelConf(p)}/>
          ))}
        </div>
      )}

      {(modal==="crear"||modal==="editar")&&(
        <PlanModal plan={modal==="editar"?target:null} onClose={()=>setModal(null)}
          onSave={()=>{ setModal(null); load(); showMsg(modal==="crear"?"Plan creado":"Plan actualizado"); }}/>
      )}

      {delConf&&(
        <div className="nv-modal-overlay" onClick={()=>setDelConf(null)}>
          <div className="nv-modal" style={{ maxWidth:380 }} onClick={e=>e.stopPropagation()}>
            <div className="nv-modal-header">
              <span className="nv-modal-title">Eliminar plan</span>
              <button className="nv-modal-close" onClick={()=>setDelConf(null)}>✕</button>
            </div>
            <p style={{ fontSize:13, color:"var(--text-secondary)", lineHeight:1.6 }}>
              ¿Eliminar el plan <span style={{ color:"var(--danger)", fontWeight:600 }}>{delConf.nombre}</span>?
              Los clientes asignados quedarán sin plan.
            </p>
            <div className="nv-modal-footer">
              <button className="nv-btn nv-btn-ghost" onClick={()=>setDelConf(null)}>Cancelar</button>
              <button className="nv-btn nv-btn-danger" onClick={()=>handleDelete(delConf)}>Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
