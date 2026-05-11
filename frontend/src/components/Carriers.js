import { useState, useEffect } from 'react';
import api from '../api';

export default function Carriers() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [msg, setMsg] = useState(null);
  const [showPwd, setShowPwd] = useState(false);
  const [form, setForm] = useState({nombre:'',proveedor:'',host:'',usuario:'',password:'',prefijo_salida:'0',canales_max:30,transporte:'udp'});

  const load = () => { setLoading(true); api.get('/trunks').then(r=>setData(r.data.data||[])).finally(()=>setLoading(false)); };
  useEffect(()=>{ load(); },[]);

  const showMsg = (text,type='success') => { setMsg({text,type}); setTimeout(()=>setMsg(null),4000); };

  const openCreate = () => { setEditItem(null); setForm({nombre:'',proveedor:'',host:'',usuario:'',password:'',prefijo_salida:'0',canales_max:30,transporte:'udp'}); setShowForm(true); };
  const openEdit = (t) => { setEditItem(t); setForm({nombre:t.nombre,proveedor:t.proveedor||'',host:t.host,usuario:t.usuario||'',password:t.password||'',prefijo_salida:t.prefijo_salida,canales_max:t.canales_max,transporte:t.transporte}); setShowForm(true); };

  const handleSubmit = async () => {
    if (!form.nombre || !form.host) return showMsg('Nombre y host son requeridos','error');
    try {
      if (editItem) { await api.put('/trunks/'+editItem.id, form); showMsg('Trunk actualizado'); }
      else { await api.post('/trunks', form); showMsg('Trunk '+form.nombre+' creado'); }
      setShowForm(false); load();
    } catch(e) { showMsg(e.response?.data?.detail||'Error','error'); }
  };

  const handleDelete = async (id, nombre) => {
    if (!window.confirm('Desactivar trunk '+nombre+'?')) return;
    try { await api.delete('/trunks/'+id); showMsg('Trunk desactivado'); load(); }
    catch(e) { showMsg('Error','error'); }
  };

  const active = data.filter(t=>t.activo==='yes');
  const inactive = data.filter(t=>t.activo==='no');

  if (loading) return <div className="loading">Cargando carriers...</div>;

  return (
    <div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:24}}>
        <div>
          <h1 style={{fontSize:20,fontWeight:700,color:'#0f172a',marginBottom:4}}>Carriers / Trunks</h1>
          <p style={{fontSize:13,color:'#94a3b8'}}>Troncales SIP para enrutamiento de llamadas</p>
        </div>
        <div style={{display:'flex',gap:10}}>
          <button onClick={load} style={{padding:'7px 14px',borderRadius:7,border:'1px solid #e2e8f0',background:'#f8fafc',color:'#475569',fontSize:13,cursor:'pointer',fontFamily:'inherit'}}>Actualizar</button>
          <button onClick={openCreate} style={{padding:'7px 16px',borderRadius:7,border:'none',background:'#1d4ed8',color:'#fff',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>+ Nuevo trunk</button>
        </div>
      </div>

      {msg && <div style={{padding:'10px 16px',borderRadius:8,marginBottom:16,fontSize:13,fontWeight:500,background:msg.type==='error'?'#fef2f2':'#f0fdf4',color:msg.type==='error'?'#c81e1e':'#057a55',border:'1px solid '+(msg.type==='error'?'#fecaca':'#bbf7d0')}}>{msg.text}</div>}

      <div style={{display:'flex',gap:12,marginBottom:20}}>
        {[{label:'Total',val:data.length,bg:'#f1f5f9',color:'#475569'},{label:'Activos',val:active.length,bg:'#f0fdf4',color:'#057a55'},{label:'Inactivos',val:inactive.length,bg:'#fef2f2',color:'#c81e1e'},{label:'Canales',val:active.reduce((s,t)=>s+t.canales_max,0),bg:'#eff6ff',color:'#1d4ed8'}].map(({label,val,bg,color})=>(
          <div key={label} style={{background:bg,borderRadius:8,padding:'10px 18px',minWidth:110}}>
            <div style={{fontSize:11,color,fontWeight:600,textTransform:'uppercase',letterSpacing:'0.5px',marginBottom:2}}>{label}</div>
            <div style={{fontSize:22,fontWeight:700,color,fontFamily:'monospace'}}>{val}</div>
          </div>
        ))}
      </div>

      {showForm && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.4)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000}}>
          <div style={{background:'#fff',borderRadius:14,padding:28,width:480,boxShadow:'0 20px 60px rgba(0,0,0,0.2)',maxHeight:'90vh',overflowY:'auto'}}>
            <h2 style={{fontSize:17,fontWeight:700,color:'#0f172a',marginBottom:20}}>{editItem?'Editar trunk '+editItem.nombre:'Nuevo trunk SIP'}</h2>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
              {[{label:'Nombre *',key:'nombre',ph:'ej. Trunk-CNT-01',full:true},{label:'Proveedor',key:'proveedor',ph:'ej. CNT Ecuador',full:true},{label:'Host SIP *',key:'host',ph:'sip.proveedor.com',full:true},{label:'Usuario SIP',key:'usuario',ph:'usuario'},{label:'Prefijo salida',key:'prefijo_salida',ph:'0'},{label:'Canales max',key:'canales_max',ph:'30',type:'number'}].map(({label,key,ph,full,type})=>(
                <div key={key} style={full?{gridColumn:'1/-1'}:{}}>
                  <label style={{fontSize:11,fontWeight:600,color:'#64748b',textTransform:'uppercase',letterSpacing:'0.5px',marginBottom:4,display:'block'}}>{label}</label>
                  <input style={{width:'100%',padding:'8px 12px',border:'1px solid #e2e8f0',borderRadius:7,fontSize:13,fontFamily:'inherit',outline:'none',boxSizing:'border-box'}}
                    type={type||'text'} placeholder={ph} value={form[key]}
                    onChange={e=>setForm({...form,[key]:type==='number'?parseInt(e.target.value)||0:e.target.value})} />
                </div>
              ))}
              <div style={{gridColumn:'1/-1'}}>
                <label style={{fontSize:11,fontWeight:600,color:'#64748b',textTransform:'uppercase',letterSpacing:'0.5px',marginBottom:4,display:'block'}}>Password SIP</label>
                <div style={{position:'relative'}}>
                  <input style={{width:'100%',padding:'8px 40px 8px 12px',border:'1px solid #e2e8f0',borderRadius:7,fontSize:13,fontFamily:'inherit',outline:'none',boxSizing:'border-box'}}
                    type={showPwd?'text':'password'} placeholder="Password del trunk" value={form.password}
                    onChange={e=>setForm({...form,password:e.target.value})} />
                  <button type="button" onClick={()=>setShowPwd(!showPwd)} style={{position:'absolute',right:10,top:'50%',transform:'translateY(-50%)',background:'none',border:'none',cursor:'pointer',color:'#94a3b8',padding:4,display:'flex',alignItems:'center'}}>
                    {showPwd?<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>:<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>}
                  </button>
                </div>
              </div>
              <div>
                <label style={{fontSize:11,fontWeight:600,color:'#64748b',textTransform:'uppercase',letterSpacing:'0.5px',marginBottom:4,display:'block'}}>Transporte</label>
                <select style={{width:'100%',padding:'8px 12px',border:'1px solid #e2e8f0',borderRadius:7,fontSize:13,fontFamily:'inherit',outline:'none'}} value={form.transporte} onChange={e=>setForm({...form,transporte:e.target.value})}>
                  <option value="udp">UDP</option>
                  <option value="tcp">TCP</option>
                  <option value="tls">TLS</option>
                </select>
              </div>
            </div>
            <div style={{display:'flex',gap:10,marginTop:24,justifyContent:'flex-end'}}>
              <button onClick={()=>setShowForm(false)} style={{padding:'8px 18px',borderRadius:7,border:'1px solid #e2e8f0',background:'#f8fafc',color:'#475569',fontSize:13,cursor:'pointer',fontFamily:'inherit'}}>Cancelar</button>
              <button onClick={handleSubmit} style={{padding:'8px 18px',borderRadius:7,border:'none',background:'#1d4ed8',color:'#fff',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>{editItem?'Guardar cambios':'Crear trunk'}</button>
            </div>
          </div>
        </div>
      )}

      <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:12,overflow:'hidden'}}>
        <table className="data-table" style={{width:'100%'}}>
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Proveedor</th>
              <th>Host</th>
              <th>Usuario</th>
              <th>Prefijo</th>
              <th>Canales</th>
              <th>Transporte</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {data.map((t,i)=>(
              <tr key={i}>
                <td style={{fontWeight:600}}>{t.nombre}</td>
                <td style={{color:'#64748b'}}>{t.proveedor||'—'}</td>
                <td style={{fontFamily:'monospace',fontSize:12}}>{t.host}</td>
                <td style={{fontFamily:'monospace',fontSize:12}}>{t.usuario||'—'}</td>
                <td style={{textAlign:'center'}}>{t.prefijo_salida}</td>
                <td style={{textAlign:'center',fontFamily:'monospace'}}>{t.canales_max}</td>
                <td><span style={{background:'#f1f5f9',color:'#475569',fontSize:11,fontWeight:600,padding:'2px 8px',borderRadius:4,textTransform:'uppercase'}}>{t.transporte}</span></td>
                <td><span style={{display:'inline-flex',alignItems:'center',gap:5,fontSize:11,fontWeight:600,padding:'3px 10px',borderRadius:20,background:t.activo==='yes'?'#f0fdf4':'#fef2f2',color:t.activo==='yes'?'#057a55':'#c81e1e'}}><span style={{width:6,height:6,borderRadius:'50%',background:'currentColor',display:'inline-block'}}/>{t.activo==='yes'?'Activo':'Inactivo'}</span></td>
                <td>
                  <div style={{display:'flex',gap:6}}>
                    <button onClick={()=>openEdit(t)} style={{padding:'4px 10px',borderRadius:5,border:'1px solid #e2e8f0',background:'#fff',color:'#475569',fontSize:11,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>Editar</button>
                    <button onClick={()=>handleDelete(t.id,t.nombre)} style={{padding:'4px 10px',borderRadius:5,border:'1px solid #fee2e2',background:'#fff',color:'#c81e1e',fontSize:11,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>Desactivar</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
