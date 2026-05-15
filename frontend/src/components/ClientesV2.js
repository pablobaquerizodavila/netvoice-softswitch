import { useState, useEffect } from 'react';
import apiv1 from '../api_v1';

export default function ClientesV2() {
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);

  useEffect(() => { loadClientes(); }, []);

  const loadClientes = async () => {
    setLoading(true);
    try {
      const res = await apiv1.get('/onboarding/agent/list?limit=200');
      setClientes(res.data.data || []);
    } catch { setClientes([]); }
    finally { setLoading(false); }
  };

  const loadDetail = async (id) => {
    setSelected(id);
    try {
      const [s, d, c, p] = await Promise.all([
        apiv1.get(`/onboarding/status/${id}`),
        apiv1.get(`/did/client/${id}`),
        apiv1.get(`/contracts/status/${id}`),
        apiv1.get(`/payments/status/${id}`)
      ]);
      setDetail({ status: s.data, did: d.data, contract: c.data, payment: p.data });
    } catch { setDetail(null); }
  };

  const filtered = clientes.filter(c =>
    c.name?.toLowerCase().includes(search.toLowerCase()) ||
    c.email?.toLowerCase().includes(search.toLowerCase())
  );

  const sColor = s => ({active:'#065f46',pending:'#1e3a5f',suspended:'#7f1d1d'}[s]||'#374151');
  const sText  = s => ({active:'#34d399',pending:'#60a5fa',suspended:'#f87171'}[s]||'#9ca3af');

  return (
    <div style={S.wrap}>
      <div style={S.top}>
        <h2 style={S.h2}>Clientes Netvoice</h2>
        <div style={{display:"flex",gap:8}}>
          <input style={S.search} placeholder="Buscar..." value={search} onChange={e=>setSearch(e.target.value)} />
          <button style={S.btn} onClick={loadClientes}>↻</button>
        </div>
      </div>
      <div style={S.layout}>
        <div style={S.list}>
          {loading && <p style={S.muted}>Cargando...</p>}
          {filtered.map(c => (
            <div key={c.id} onClick={()=>loadDetail(c.id)}
              style={{...S.row,...(selected===c.id?S.rowActive:{})}}>
              <div>
                <p style={S.name}>{c.name}</p>
                <p style={S.sub}>{c.email}</p>
                <p style={S.sub}>{c.origin} · {new Date(c.created_at).toLocaleDateString()}</p>
              </div>
              <span style={{...S.badge,background:sColor(c.status),color:sText(c.status)}}>{c.status}</span>
            </div>
          ))}
          {!loading && filtered.length===0 && <p style={S.muted}>Sin resultados</p>}
        </div>
        <div style={S.detail}>
          {!detail && <p style={S.muted}>Selecciona un cliente</p>}
          {detail && (
            <div>
              <h3 style={S.h3}>Progreso {detail.status.progress}</h3>
              <div style={S.grid}>
                {Object.entries(detail.status.steps||{}).map(([k,v])=>(
                  <div key={k} style={{...S.step,background:v?"#065f46":"#1f2937"}}>
                    <span style={{color:v?"#34d399":"#6b7280"}}>{v?"✓":"○"}</span>
                    <span style={{color:"#e2e8f0",fontSize:12,marginLeft:6}}>{k.replace(/_/g," ")}</span>
                  </div>
                ))}
              </div>
              <Section title="DID asignado">
                {detail.did.did
                  ? <Row label="Número" value={detail.did.did} />
                  : <p style={S.muted}>Sin DID</p>}
                {detail.did.did && <EditDID clientId={selected} onUpdate={()=>loadDetail(selected)} />}
              </Section>
              <Section title="Contrato">
                {detail.contract.signed
                  ? <>
                      <Row label="Firmado" value={new Date(detail.contract.signed_at).toLocaleString()} />
                      <Row label="Vía" value={detail.contract.signed_via} />
                      <Row label="Hash" value={detail.contract.doc_hash?.substring(0,24)+"..."} mono />
                    </>
                  : <p style={S.muted}>Sin contrato</p>}
              </Section>
              <Section title="Pagos">
                {detail.payment.payments?.map(p=>(
                  <div key={p.id} style={S.irow}>
                    <span style={S.ilabel}>{p.gateway} ${parseFloat(p.amount).toFixed(2)}</span>
                    <span style={{...S.badge,background:p.status==="approved"?"#065f46":"#7f1d1d",color:p.status==="approved"?"#34d399":"#f87171"}}>{p.status}</span>
                  </div>
                ))}
                {!detail.payment.payments?.length && <p style={S.muted}>Sin pagos</p>}
              </Section>
              <Section title="Historial DID">
                <DIDHistory clientId={selected} />
              </Section>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Section({title,children}){
  return <div style={{marginBottom:"1.25rem",borderTop:"1px solid #1f2937",paddingTop:"0.75rem"}}>
    <p style={{color:"#6b7280",fontSize:11,fontWeight:600,textTransform:"uppercase",letterSpacing:1,margin:"0 0 0.5rem"}}>{title}</p>
    {children}
  </div>;
}

function Row({label,value,mono}){
  return <div style={{display:"flex",justifyContent:"space-between",padding:"0.25rem 0",borderBottom:"1px solid #0f172a"}}>
    <span style={{color:"#9ca3af",fontSize:13}}>{label}</span>
    <span style={{color:"#e2e8f0",fontSize:13,fontFamily:mono?"monospace":"inherit"}}>{value}</span>
  </div>;
}

function EditDID({clientId,onUpdate}){
  const [editing,setEditing]=useState(false);
  const [val,setVal]=useState("");
  const [loading,setLoading]=useState(false);
  const [err,setErr]=useState("");
  const save=async()=>{
    setLoading(true);setErr("");
    try{ await apiv1.patch(`/did/client/${clientId}`,{new_number:val}); setEditing(false); onUpdate(); }
    catch(e){ setErr(e.response?.data?.detail||"Error"); }
    finally{ setLoading(false); }
  };
  if(!editing) return <button style={S.btnSm} onClick={()=>setEditing(true)}>Editar DID</button>;
  return <div style={{marginTop:8}}>
    {err&&<p style={{color:"#f87171",fontSize:12,margin:"0 0 4px"}}>{err}</p>}
    <input style={{...S.search,width:160,marginRight:6}} placeholder="+593..." value={val} onChange={e=>setVal(e.target.value)} />
    <button style={S.btnSm} onClick={save} disabled={loading}>{loading?"...":"Guardar"}</button>
    <button style={{...S.btnSm,background:"#374151",marginLeft:4}} onClick={()=>setEditing(false)}>✕</button>
  </div>;
}

function DIDHistory({clientId}){
  const [hist,setHist]=useState([]);
  useEffect(()=>{ apiv1.get(`/did/history/${clientId}`).then(r=>setHist(r.data.history||[])).catch(()=>{}); },[clientId]);
  return <div>{hist.map(h=>(
    <div key={h.id} style={S.irow}>
      <span style={S.ilabel}>{h.number}</span>
      <span style={{color:"#6b7280",fontSize:11}}>{h.changed_by_role} · {new Date(h.assigned_at).toLocaleDateString()}</span>
    </div>
  ))}{!hist.length&&<p style={S.muted}>Sin historial</p>}</div>;
}

const S = {
  wrap:   {padding:"1.5rem",fontFamily:"sans-serif",color:"#f9fafb",height:"100%"},
  top:    {display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"1.5rem"},
  h2:     {fontSize:20,fontWeight:600,margin:0,color:"#f9fafb"},
  h3:     {fontSize:15,fontWeight:600,margin:"0 0 0.75rem",color:"#f9fafb"},
  layout: {display:"grid",gridTemplateColumns:"1fr 1fr",gap:"1.5rem"},
  list:   {background:"#111827",border:"1px solid #1f2937",borderRadius:10,overflowY:"auto",maxHeight:"75vh",padding:"0.5rem"},
  detail: {background:"#111827",border:"1px solid #1f2937",borderRadius:10,padding:"1.25rem",overflowY:"auto",maxHeight:"75vh"},
  row:    {padding:"0.6rem",borderRadius:7,cursor:"pointer",display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:3,border:"1px solid transparent"},
  rowActive:{background:"#1e1b4b",border:"1px solid #4f46e5"},
  name:   {fontSize:14,fontWeight:500,margin:0,color:"#f9fafb"},
  sub:    {fontSize:11,color:"#6b7280",margin:"2px 0 0"},
  badge:  {fontSize:11,padding:"2px 8px",borderRadius:4,whiteSpace:"nowrap"},
  search: {background:"#1f2937",border:"1px solid #374151",borderRadius:6,padding:"0.45rem 0.7rem",color:"#f9fafb",fontSize:13},
  btn:    {background:"#1f2937",border:"1px solid #374151",color:"#9ca3af",borderRadius:6,padding:"0.45rem 0.7rem",cursor:"pointer"},
  btnSm:  {background:"#4f46e5",border:"none",color:"#fff",borderRadius:5,padding:"0.35rem 0.7rem",fontSize:12,cursor:"pointer"},
  muted:  {color:"#6b7280",fontSize:13,margin:"0.5rem 0"},
  grid:   {display:"grid",gridTemplateColumns:"1fr 1fr",gap:5,marginBottom:"1rem"},
  step:   {display:"flex",alignItems:"center",padding:"0.35rem 0.5rem",borderRadius:5},
  irow:   {display:"flex",justifyContent:"space-between",alignItems:"center",padding:"0.25rem 0",borderBottom:"1px solid #0f172a"},
  ilabel: {color:"#9ca3af",fontSize:13},
};
