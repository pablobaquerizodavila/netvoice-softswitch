import { useState, useEffect } from 'react';
import api from '../api';

export default function Clientes() {
  const [data, setData] = useState([]);
  const [planes, setPlanes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [msg, setMsg] = useState(null);
  const [search, setSearch] = useState('');
  const emptyForm = {nombre:'',ruc:'',email:'',telefono:'',plan_id:'',credito_limite:'0'};
  const [form, setForm] = useState(emptyForm);

  const load = () => {
    setLoading(true);
    Promise.all([api.get('/clientes'), api.get('/planes')])
      .then(([c,p]) => { setData(c.data.data||[]); setPlanes(p.data.data||[]); })
      .finally(()=>setLoading(false));
  };
  useEffect(()=>{ load(); },[]);

  const showMsg = (text,type='success') => { setMsg({text,type}); setTimeout(()=>setMsg(null),4000); };

  const handleSubmit = async () => {
    if (!form.nombre) return showMsg('El nombre es requerido','error');
    try {
      await api.post('/clientes', {
        ...form,
        plan_id: form.plan_id ? parseInt(form.plan_id) : null,
        credito_limite: parseFloat(form.credito_limite)||0,
      });
      showMsg('Cliente '+form.nombre+' creado');
      setShowForm(false);
      setForm(emptyForm);
      load();
    } catch(e) { showMsg(e.response?.data?.detail||'Error','error'); }
  };

  const handleDelete = async (id, nombre) => {
    if (!window.confirm('Desactivar cliente '+nombre+'?')) return;
    try { await api.delete('/clientes/'+id); showMsg('Cliente desactivado'); load(); }
    catch(e) { showMsg('Error','error'); }
  };

  const filtered = data.filter(c => !search ||
    c.nombre?.toLowerCase().includes(search.toLowerCase()) ||
    c.ruc?.includes(search) ||
    c.email?.toLowerCase().includes(search.toLowerCase())
  );
  const activos = data.filter(c=>c.activo==='yes');

  if (loading) return <div className="loading">Cargando clientes...</div>;

  return (
    <div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:24}}>
        <div>
          <h1 style={{fontSize:20,fontWeight:700,color:'#0f172a',marginBottom:4}}>Clientes</h1>
          <p style={{fontSize:13,color:'#94a3b8'}}>{data.length} clientes registrados</p>
        </div>
        <div style={{display:'flex',gap:10}}>
          <button onClick={load} style={{padding:'7px 14px',borderRadius:7,border:'1px solid #e2e8f0',background:'#f8fafc',color:'#475569',fontSize:13,cursor:'pointer',fontFamily:'inherit'}}>Actualizar</button>
          <button onClick={()=>{setForm(emptyForm);setShowForm(true);}} style={{padding:'7px 16px',borderRadius:7,border:'none',background:'#1d4ed8',color:'#fff',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>+ Nuevo cliente</button>
        </div>
      </div>

      {msg && <div style={{padding:'10px 16px',borderRadius:8,marginBottom:16,fontSize:13,fontWeight:500,background:msg.type==='error'?'#fef2f2':'#f0fdf4',color:msg.type==='error'?'#c81e1e':'#057a55',border:'1px solid '+(msg.type==='error'?'#fecaca':'#bbf7d0')}}>{msg.text}</div>}

      <div style={{display:'flex',gap:12,marginBottom:20}}>
        {[{label:'Total',val:data.length,bg:'#f1f5f9',color:'#475569'},{label:'Activos',val:activos.length,bg:'#f0fdf4',color:'#057a55'},{label:'Inactivos',val:data.length-activos.length,bg:'#fef2f2',color:'#c81e1e'}].map(({label,val,bg,color})=>(
          <div key={label} style={{background:bg,borderRadius:8,padding:'10px 18px',minWidth:100}}>
            <div style={{fontSize:11,color,fontWeight:600,textTransform:'uppercase',letterSpacing:'0.5px',marginBottom:2}}>{label}</div>
            <div style={{fontSize:22,fontWeight:700,color,fontFamily:'monospace'}}>{val}</div>
          </div>
        ))}
      </div>

      {showForm && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.4)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000}}>
          <div style={{background:'#fff',borderRadius:14,padding:28,width:500,boxShadow:'0 20px 60px rgba(0,0,0,0.2)',maxHeight:'90vh',overflowY:'auto'}}>
            <h2 style={{fontSize:17,fontWeight:700,color:'#0f172a',marginBottom:20}}>Nuevo cliente</h2>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
              <div style={{gridColumn:'1/-1'}}>
                <label style={lbl}>Nombre / Razon social *</label>
                <input style={inp} placeholder="ej. Empresa ABC S.A." value={form.nombre} onChange={e=>setForm({...form,nombre:e.target.value})} />
              </div>
              <div>
                <label style={lbl}>RUC / Cedula</label>
                <input style={inp} placeholder="0992XXXXXXX001" value={form.ruc} onChange={e=>setForm({...form,ruc:e.target.value})} />
              </div>
              <div>
                <label style={lbl}>Telefono</label>
                <input style={inp} placeholder="04 2XXXXXX" value={form.telefono} onChange={e=>setForm({...form,telefono:e.target.value})} />
              </div>
              <div style={{gridColumn:'1/-1'}}>
                <label style={lbl}>Email</label>
                <input style={inp} type="email" placeholder="contacto@empresa.com" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} />
              </div>
              <div>
                <label style={lbl}>Plan de cobro</label>
                <select style={inp} value={form.plan_id} onChange={e=>setForm({...form,plan_id:e.target.value})}>
                  <option value="">Sin plan asignado</option>
                  {planes.filter(p=>p.activo==='yes').map(p=>(
                    <option key={p.id} value={p.id}>{p.nombre} - ${parseFloat(p.pension_mensual).toFixed(2)}/mes</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={lbl}>Limite de credito (USD)</label>
                <input style={inp} type="number" step="0.01" placeholder="0.00" value={form.credito_limite} onChange={e=>setForm({...form,credito_limite:e.target.value})} />
              </div>
            </div>
            <div style={{display:'flex',gap:10,marginTop:24,justifyContent:'flex-end'}}>
              <button onClick={()=>setShowForm(false)} style={{padding:'8px 18px',borderRadius:7,border:'1px solid #e2e8f0',background:'#f8fafc',color:'#475569',fontSize:13,cursor:'pointer',fontFamily:'inherit'}}>Cancelar</button>
              <button onClick={handleSubmit} style={{padding:'8px 18px',borderRadius:7,border:'none',background:'#1d4ed8',color:'#fff',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>Crear cliente</button>
            </div>
          </div>
        </div>
      )}

      <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:10,marginBottom:16,padding:14,display:'flex',gap:12,alignItems:'center'}}>
        <input style={{flex:1,padding:'7px 12px',border:'1px solid #e2e8f0',borderRadius:7,fontSize:13,fontFamily:'inherit',outline:'none'}}
          placeholder="Buscar por nombre, RUC o email..." value={search} onChange={e=>setSearch(e.target.value)} />
        <span style={{fontSize:12,color:'#94a3b8',whiteSpace:'nowrap'}}>{filtered.length} de {data.length}</span>
      </div>

      <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:12,overflow:'hidden'}}>
        <table className="data-table" style={{width:'100%'}}>
          <thead>
            <tr>
              <th>Cliente</th>
              <th>RUC</th>
              <th>Telefono</th>
              <th>Email</th>
              <th>Plan</th>
              <th>Credito limite</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan="8" className="td-empty">No hay clientes registrados</td></tr>
            )}
            {filtered.map((c,i)=>(
              <tr key={i}>
                <td>
                  <div style={{fontWeight:600,color:'#0f172a'}}>{c.nombre}</div>
                  <div style={{fontSize:11,color:'#94a3b8',marginTop:1}}>ID: {c.id}</div>
                </td>
                <td style={{fontFamily:'monospace',fontSize:12}}>{c.ruc||'—'}</td>
                <td>{c.telefono||'—'}</td>
                <td style={{fontSize:12}}>{c.email||'—'}</td>
                <td>
                  {c.plan_nombre
                    ? <span style={{background:'#eff6ff',color:'#1d4ed8',fontSize:11,fontWeight:600,padding:'3px 8px',borderRadius:5}}>{c.plan_nombre}</span>
                    : <span style={{color:'#94a3b8',fontSize:12}}>Sin plan</span>
                  }
                </td>
                <td style={{fontFamily:'monospace',fontSize:13}}>${parseFloat(c.credito_limite||0).toFixed(2)}</td>
                <td>
                  <span style={{display:'inline-flex',alignItems:'center',gap:5,fontSize:11,fontWeight:600,padding:'3px 10px',borderRadius:20,background:c.activo==='yes'?'#f0fdf4':'#fef2f2',color:c.activo==='yes'?'#057a55':'#c81e1e'}}>
                    <span style={{width:6,height:6,borderRadius:'50%',background:'currentColor',display:'inline-block'}}/>{c.activo==='yes'?'Activo':'Inactivo'}
                  </span>
                </td>
                <td>
                  <button onClick={()=>handleDelete(c.id,c.nombre)} style={{padding:'4px 10px',borderRadius:5,border:'1px solid #fee2e2',background:'#fff',color:'#c81e1e',fontSize:11,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>Desactivar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const lbl = {fontSize:11,fontWeight:600,color:'#64748b',textTransform:'uppercase',letterSpacing:'0.5px',marginBottom:4,display:'block'};
const inp = {width:'100%',padding:'8px 12px',border:'1px solid #e2e8f0',borderRadius:7,fontSize:13,fontFamily:'inherit',color:'#0f172a',outline:'none',boxSizing:'border-box'};
