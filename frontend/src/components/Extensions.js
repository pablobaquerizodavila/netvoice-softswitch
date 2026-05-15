import React, { useState, useEffect } from 'react';
import api from '../api';

export default function Extensions() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editExt, setEditExt] = useState(null);
  const [msg, setMsg] = useState(null);
  const [form, setForm] = useState({ id:'', password:'', context:'internal', allow:'ulaw,alaw,gsm' });
  const [showPwd, setShowPwd] = useState(false);

  const load = () => {
    setLoading(true);
    api.get('/extensions').then(res => setData(res.data.data || [])).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const showMsg = (text, type='success') => { setMsg({text,type}); setTimeout(()=>setMsg(null),3000); };
  const openCreate = () => { setEditExt(null); setForm({id:'',password:'',context:'internal',allow:'ulaw,alaw,gsm'}); setShowForm(true); };
  const openEdit = (ext) => { setEditExt(ext); setForm({id:ext.id,password:'',context:ext.context,allow:ext.allow}); setShowForm(true); };

  const handleSubmit = async () => {
    if (!editExt && (!form.id || !form.password)) return showMsg('ID y password requeridos','error');
    try {
      if (editExt) {
        await api.put('/extensions/'+editExt.id,{password:form.password||undefined,context:form.context,allow:form.allow});
        showMsg('Extension '+editExt.id+' actualizada');
      } else {
        await api.post('/extensions',form);
        showMsg('Extension '+form.id+' creada');
      }
      setShowForm(false); load();
    } catch(e) { showMsg(e.response?.data?.detail||'Error','error'); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Eliminar extension '+id+'?')) return;
    try { await api.delete('/extensions/'+id); showMsg('Extension '+id+' eliminada'); load(); }
    catch(e) { showMsg(e.response?.data?.detail||'Error','error'); }
  };

  const filtered = data.filter(e => !search || String(e.id).includes(search) || e.context?.includes(search));
  const codecs = (allow) => (allow||'').split(',').map(c=>c.trim()).filter(Boolean);
  const codecColor = (c) => c==='ulaw'||c==='alaw' ? {bg:'#eff6ff',color:'#1d4ed8'} : c==='gsm' ? {bg:'#f0fdf4',color:'#057a55'} : {bg:'#f1f5f9',color:'#475569'};

  if (loading) return <div className="loading">Cargando extensiones...</div>;

  return (
    <div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:24}}>
        <div>
          <h1 style={{fontSize:20,fontWeight:700,color:'#0f172a',marginBottom:4}}>Extensiones</h1>
          <p style={{fontSize:13,color:'#94a3b8'}}>{data.length} extensiones registradas</p>
        </div>
        <div style={{display:'flex',gap:10}}>
          <button onClick={load} style={{padding:'7px 14px',borderRadius:7,border:'1px solid #e2e8f0',background:'#f8fafc',color:'#475569',fontSize:13,cursor:'pointer',fontFamily:'inherit'}}>Actualizar</button>
          <button onClick={openCreate} style={{padding:'7px 16px',borderRadius:7,border:'none',background:'#1d4ed8',color:'#fff',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>+ Nueva extension</button>
        </div>
      </div>

      {msg && (
        <div style={{padding:'10px 16px',borderRadius:8,marginBottom:16,fontSize:13,fontWeight:500,
          background:msg.type==='error'?'#fef2f2':'#f0fdf4',
          color:msg.type==='error'?'#c81e1e':'#057a55',
          border:'1px solid '+(msg.type==='error'?'#fecaca':'#bbf7d0')}}>
          {msg.text}
        </div>
      )}

      {showForm && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.4)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000}}>
          <div style={{background:'#fff',borderRadius:14,padding:28,width:420,boxShadow:'0 20px 60px rgba(0,0,0,0.2)'}}>
            <h2 style={{fontSize:17,fontWeight:700,color:'#0f172a',marginBottom:20}}>
              {editExt ? 'Editar extension '+editExt.id : 'Nueva extension'}
            </h2>
            <div style={{display:'flex',flexDirection:'column',gap:14}}>
              {!editExt && (
                <div>
                  <label style={lbl}>Numero de extension *</label>
                  <input style={inp} placeholder="ej. 1004" value={form.id} onChange={e=>setForm({...form,id:e.target.value})} />
                </div>
              )}
              <div>
                <label style={lbl}>{editExt ? 'Nueva password (vacio = no cambiar)' : 'Password SIP *'}</label>
                <div style={{position:'relative'}}>
                  <input style={{...inp, paddingRight:42}} type={showPwd?'text':'password'} placeholder="MiPass123!" value={form.password} onChange={e=>setForm({...form,password:e.target.value})} />
                  <button type="button" onClick={()=>setShowPwd(!showPwd)}
                    style={{position:'absolute',right:10,top:'50%',transform:'translateY(-50%)',background:'none',border:'none',cursor:'pointer',color:'#64748b',padding:4,display:'flex',alignItems:'center'}}>
                    {showPwd ? (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                    ) : (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                    )}
                  </button>
                </div>
              </div>
              <div>
                <label style={lbl}>Contexto</label>
                <select style={inp} value={form.context} onChange={e=>setForm({...form,context:e.target.value})}>
                  <option value="internal">internal</option>
                  <option value="from-internal">from-internal</option>
                  <option value="default">default</option>
                </select>
              </div>
              <div>
                <label style={lbl}>Codecs</label>
                <select style={inp} value={form.allow} onChange={e=>setForm({...form,allow:e.target.value})}>
                  <option value="ulaw,alaw,gsm">ulaw, alaw, gsm</option>
                  <option value="ulaw,alaw">ulaw, alaw</option>
                  <option value="ulaw">Solo ulaw</option>
                </select>
              </div>
            </div>
            <div style={{display:'flex',gap:10,marginTop:24,justifyContent:'flex-end'}}>
              <button onClick={()=>setShowForm(false)} style={{padding:'8px 18px',borderRadius:7,border:'1px solid #e2e8f0',background:'#f8fafc',color:'#475569',fontSize:13,cursor:'pointer',fontFamily:'inherit'}}>Cancelar</button>
              <button onClick={handleSubmit} style={{padding:'8px 18px',borderRadius:7,border:'none',background:'#1d4ed8',color:'#fff',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>
                {editExt ? 'Guardar cambios' : 'Crear extension'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{display:'flex',gap:12,marginBottom:20}}>
        {[{label:'Total',val:data.length,bg:'#f1f5f9',color:'#475569'},{label:'Online',val:data.length,bg:'#f0fdf4',color:'#057a55'},{label:'Offline',val:0,bg:'#fef2f2',color:'#c81e1e'}].map(({label,val,bg,color})=>(
          <div key={label} style={{background:bg,borderRadius:8,padding:'10px 18px',minWidth:100}}>
            <div style={{fontSize:11,color,fontWeight:600,textTransform:'uppercase',letterSpacing:'0.5px',marginBottom:2}}>{label}</div>
            <div style={{fontSize:22,fontWeight:700,color,fontFamily:'monospace'}}>{val}</div>
          </div>
        ))}
      </div>

      <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:10,padding:14,marginBottom:16,display:'flex',gap:12,alignItems:'center'}}>
        <input style={{flex:1,padding:'7px 12px',border:'1px solid #e2e8f0',borderRadius:7,fontSize:13,fontFamily:'inherit',outline:'none'}}
          placeholder="Buscar por ID o contexto..." value={search} onChange={e=>setSearch(e.target.value)} />
        <span style={{fontSize:12,color:'#94a3b8'}}>{filtered.length} de {data.length}</span>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))',gap:16}}>
        {filtered.map((ext,i) => (
          <div key={i} style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:12,overflow:'hidden'}}>
            <div style={{padding:'16px 18px',borderBottom:'1px solid #f1f5f9',display:'flex',justifyContent:'space-between',alignItems:'center',background:'#f8fafc'}}>
              <div style={{display:'flex',alignItems:'center',gap:12}}>
                <div style={{width:42,height:42,background:'#eff6ff',color:'#1d4ed8',borderRadius:10,display:'flex',alignItems:'center',justifyContent:'center',fontWeight:700,fontSize:14,fontFamily:'monospace'}}>{String(ext.id).slice(0,2)}</div>
                <div>
                  <div style={{fontWeight:700,fontSize:15,color:'#0f172a'}}>Extension {ext.id}</div>
                  <div style={{fontSize:11,color:'#94a3b8'}}>PJSIP - {ext.context}</div>
                </div>
              </div>
              <span style={{display:'inline-flex',alignItems:'center',gap:5,fontSize:11,fontWeight:600,padding:'4px 10px',borderRadius:20,background:'#f0fdf4',color:'#057a55'}}>
                <span style={{width:6,height:6,borderRadius:'50%',background:'#057a55',display:'inline-block'}}/> Online
              </span>
            </div>
            <div style={{padding:'14px 18px'}}>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:14}}>
                {[{label:'ID',value:ext.id},{label:'AORs',value:ext.aors},{label:'Auth',value:ext.auth},{label:'Contexto',value:ext.context}].map(({label,value})=>(
                  <div key={label}>
                    <div style={{fontSize:10,fontWeight:600,color:'#94a3b8',textTransform:'uppercase',letterSpacing:'0.5px',marginBottom:3}}>{label}</div>
                    <div style={{fontSize:13,color:'#0f172a',fontFamily:'monospace',fontWeight:500}}>{value||'--'}</div>
                  </div>
                ))}
              </div>
              <div style={{fontSize:10,fontWeight:600,color:'#94a3b8',textTransform:'uppercase',letterSpacing:'0.5px',marginBottom:6}}>Codecs</div>
              <div style={{display:'flex',gap:5,flexWrap:'wrap'}}>
                {codecs(ext.allow).map(c=>{const {bg,color}=codecColor(c);return <span key={c} style={{background:bg,color,fontSize:11,fontWeight:600,padding:'3px 8px',borderRadius:5,fontFamily:'monospace'}}>{c}</span>;})}
              </div>
            </div>
            <div style={{padding:'10px 18px',borderTop:'1px solid #f1f5f9',display:'flex',gap:8,background:'#fafafa'}}>
              <button onClick={()=>openEdit(ext)} style={{flex:1,padding:'6px 0',borderRadius:6,border:'1px solid #e2e8f0',background:'#fff',color:'#475569',fontSize:12,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>Editar</button>
              <button onClick={()=>handleDelete(ext.id)} style={{flex:1,padding:'6px 0',borderRadius:6,border:'1px solid #fee2e2',background:'#fff',color:'#c81e1e',fontSize:12,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>Eliminar</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const lbl = {fontSize:11,fontWeight:600,color:'#64748b',textTransform:'uppercase',letterSpacing:'0.5px',marginBottom:4,display:'block'};
const inp = {width:'100%',padding:'8px 12px',border:'1px solid #e2e8f0',borderRadius:7,fontSize:13,fontFamily:'inherit',color:'#0f172a',outline:'none',boxSizing:'border-box'};
