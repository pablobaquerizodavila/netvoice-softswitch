import { useState, useEffect } from 'react';
import api from '../api';

const MODULOS = ['dashboard','cdr','metricas','extensiones','carriers','clientes','planes','did_series','ajustes','usuarios'];
const MODULO_LABEL = {dashboard:'Dashboard',cdr:'CDR',metricas:'Metricas',extensiones:'Extensiones',carriers:'Carriers',clientes:'Clientes',planes:'Planes',did_series:'Series DID',ajustes:'Ajustes',usuarios:'Usuarios'};

export default function Usuarios() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showPerms, setShowPerms] = useState(null);
  const [msg, setMsg] = useState(null);
  const [showPwd, setShowPwd] = useState(false);
  const [form, setForm] = useState({username:'',password:'',role:'admin',nombre_completo:''});
  const [permsEdit, setPermsEdit] = useState({});

  const load = () => {
    setLoading(true);
    api.get('/usuarios').then(r=>setData(r.data.data||[])).finally(()=>setLoading(false));
  };
  useEffect(()=>{ load(); },[]);

  const showMsg = (text,type='success') => { setMsg({text,type}); setTimeout(()=>setMsg(null),4000); };

  const handleCreate = async () => {
    if (!form.username || !form.password) return showMsg('Usuario y password requeridos','error');
    try {
      const res = await api.post('/usuarios', form);
      const newId = res.data.id;
      await api.put('/usuarios/'+newId+'/permisos', {permisos: permsEdit});
      showMsg('Usuario '+form.username+' creado');
      setShowForm(false);
      setForm({username:'',password:'',role:'admin',nombre_completo:''});
      setPermsEdit({});
      load();
    } catch(e) { showMsg(e.response?.data?.detail||'Error','error'); }
  };

  const handleToggle = async (id, username, activo) => {
    if (!window.confirm((activo==='yes'?'Desactivar':'Activar')+' usuario '+username+'?')) return;
    try { await api.put('/usuarios/'+id+'/toggle', {}); showMsg('Usuario actualizado'); load(); }
    catch(e) { showMsg('Error','error'); }
  };

  const openPerms = (user) => {
    const p = {};
    MODULOS.forEach(m => {
      p[m] = user.permisos?.[m] || {puede_ver:'no',puede_editar:'no',puede_crear:'no',puede_eliminar:'no'};
    });
    setPermsEdit(p);
    setShowPerms(user);
  };

  const savePerms = async () => {
    try {
      await api.put('/usuarios/'+showPerms.id+'/permisos', {permisos: permsEdit});
      showMsg('Permisos de '+showPerms.username+' actualizados');
      setShowPerms(null);
      load();
    } catch(e) { showMsg('Error','error'); }
  };

  const togglePerm = (modulo, campo) => {
    setPermsEdit(prev => ({
      ...prev,
      [modulo]: { ...prev[modulo], [campo]: prev[modulo]?.[campo]==='yes'?'no':'yes' }
    }));
  };

  const setAllPerms = (modulo, val) => {
    setPermsEdit(prev => ({
      ...prev,
      [modulo]: {puede_ver:val,puede_editar:val,puede_crear:val,puede_eliminar:val}
    }));
  };

  const emptyPerms = () => {
    const p = {};
    MODULOS.forEach(m => { p[m] = {puede_ver:'no',puede_editar:'no',puede_crear:'no',puede_eliminar:'no'}; });
    return p;
  };

  const roleColor = {superadmin:{bg:'#fef3c7',color:'#92400e'},admin:{bg:'#eff6ff',color:'#1d4ed8'},viewer:{bg:'#f1f5f9',color:'#475569'}};

  if (loading) return <div className="loading">Cargando usuarios...</div>;

  return (
    <div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:24}}>
        <div>
          <h1 style={{fontSize:20,fontWeight:700,color:'#0f172a',marginBottom:4}}>Gestion de usuarios</h1>
          <p style={{fontSize:13,color:'#94a3b8'}}>{data.length} usuarios registrados</p>
        </div>
        <button onClick={()=>{setForm({username:'',password:'',role:'admin',nombre_completo:''});setPermsEdit(emptyPerms());setShowForm(true);}}
          style={{padding:'7px 16px',borderRadius:7,border:'none',background:'#1d4ed8',color:'#fff',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>
          + Nuevo usuario
        </button>
      </div>

      {msg && <div style={{padding:'10px 16px',borderRadius:8,marginBottom:16,fontSize:13,fontWeight:500,background:msg.type==='error'?'#fef2f2':'#f0fdf4',color:msg.type==='error'?'#c81e1e':'#057a55',border:'1px solid '+(msg.type==='error'?'#fecaca':'#bbf7d0')}}>{msg.text}</div>}

      {/* MODAL NUEVO USUARIO */}
      {showForm && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.4)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000}}>
          <div style={{background:'#fff',borderRadius:14,padding:28,width:680,boxShadow:'0 20px 60px rgba(0,0,0,0.2)',maxHeight:'90vh',overflowY:'auto'}}>
            <h2 style={{fontSize:17,fontWeight:700,color:'#0f172a',marginBottom:20}}>Nuevo usuario</h2>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14,marginBottom:20}}>
              <div>
                <label style={lbl}>Usuario *</label>
                <input style={inp} placeholder="nombre.usuario" value={form.username} onChange={e=>setForm({...form,username:e.target.value})} />
              </div>
              <div>
                <label style={lbl}>Nombre completo</label>
                <input style={inp} placeholder="Nombre Apellido" value={form.nombre_completo} onChange={e=>setForm({...form,nombre_completo:e.target.value})} />
              </div>
              <div>
                <label style={lbl}>Password *</label>
                <div style={{position:'relative'}}>
                  <input style={{...inp,paddingRight:40}} type={showPwd?'text':'password'} placeholder="Min 8 caracteres" value={form.password} onChange={e=>setForm({...form,password:e.target.value})} />
                  <button type="button" onClick={()=>setShowPwd(!showPwd)} style={{position:'absolute',right:10,top:'50%',transform:'translateY(-50%)',background:'none',border:'none',cursor:'pointer',color:'#94a3b8',padding:4,display:'flex',alignItems:'center'}}>
                    {showPwd?<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>:<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>}
                  </button>
                </div>
              </div>
              <div>
                <label style={lbl}>Rol</label>
                <select style={inp} value={form.role} onChange={e=>setForm({...form,role:e.target.value})}>
                  <option value="admin">Admin</option>
                  <option value="viewer">Viewer (solo lectura)</option>
                </select>
              </div>
            </div>

            <div style={{background:'#f8fafc',border:'1px solid #e2e8f0',borderRadius:10,padding:16}}>
              <div style={{fontWeight:700,fontSize:13,color:'#0f172a',marginBottom:12}}>Permisos por modulo</div>
              <div style={{overflowX:'auto'}}>
                <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
                  <thead>
                    <tr>
                      <th style={{textAlign:'left',padding:'6px 8px',color:'#64748b',fontWeight:600}}>Modulo</th>
                      <th style={{textAlign:'center',padding:'6px 8px',color:'#64748b',fontWeight:600}}>Ver</th>
                      <th style={{textAlign:'center',padding:'6px 8px',color:'#64748b',fontWeight:600}}>Editar</th>
                      <th style={{textAlign:'center',padding:'6px 8px',color:'#64748b',fontWeight:600}}>Crear</th>
                      <th style={{textAlign:'center',padding:'6px 8px',color:'#64748b',fontWeight:600}}>Eliminar</th>
                      <th style={{textAlign:'center',padding:'6px 8px',color:'#64748b',fontWeight:600}}>Todo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {MODULOS.map(m=>(
                      <tr key={m} style={{borderTop:'1px solid #e2e8f0'}}>
                        <td style={{padding:'6px 8px',fontWeight:600,color:'#0f172a'}}>{MODULO_LABEL[m]}</td>
                        {['puede_ver','puede_editar','puede_crear','puede_eliminar'].map(campo=>(
                          <td key={campo} style={{textAlign:'center',padding:'6px 8px'}}>
                            <input type="checkbox" checked={permsEdit[m]?.[campo]==='yes'} onChange={()=>togglePerm(m,campo)}
                              style={{width:16,height:16,cursor:'pointer'}} />
                          </td>
                        ))}
                        <td style={{textAlign:'center',padding:'6px 8px'}}>
                          <button onClick={()=>setAllPerms(m, permsEdit[m]?.puede_ver==='yes'&&permsEdit[m]?.puede_editar==='yes'?'no':'yes')}
                            style={{padding:'2px 8px',borderRadius:4,border:'1px solid #e2e8f0',background:'#fff',fontSize:11,cursor:'pointer',fontFamily:'inherit',color:'#475569'}}>
                            {permsEdit[m]?.puede_ver==='yes'&&permsEdit[m]?.puede_editar==='yes'?'Quitar':'Todo'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div style={{display:'flex',gap:10,marginTop:20,justifyContent:'flex-end'}}>
              <button onClick={()=>setShowForm(false)} style={{padding:'8px 18px',borderRadius:7,border:'1px solid #e2e8f0',background:'#f8fafc',color:'#475569',fontSize:13,cursor:'pointer',fontFamily:'inherit'}}>Cancelar</button>
              <button onClick={handleCreate} style={{padding:'8px 18px',borderRadius:7,border:'none',background:'#1d4ed8',color:'#fff',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>Crear usuario</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL EDITAR PERMISOS */}
      {showPerms && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.4)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000}}>
          <div style={{background:'#fff',borderRadius:14,padding:28,width:680,boxShadow:'0 20px 60px rgba(0,0,0,0.2)',maxHeight:'90vh',overflowY:'auto'}}>
            <h2 style={{fontSize:17,fontWeight:700,color:'#0f172a',marginBottom:4}}>Permisos de {showPerms.username}</h2>
            <p style={{fontSize:12,color:'#94a3b8',marginBottom:16}}>Rol: {showPerms.role}</p>
            <div style={{overflowX:'auto'}}>
              <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
                <thead>
                  <tr>
                    <th style={{textAlign:'left',padding:'6px 8px',color:'#64748b',fontWeight:600}}>Modulo</th>
                    <th style={{textAlign:'center',padding:'6px 8px',color:'#64748b',fontWeight:600}}>Ver</th>
                    <th style={{textAlign:'center',padding:'6px 8px',color:'#64748b',fontWeight:600}}>Editar</th>
                    <th style={{textAlign:'center',padding:'6px 8px',color:'#64748b',fontWeight:600}}>Crear</th>
                    <th style={{textAlign:'center',padding:'6px 8px',color:'#64748b',fontWeight:600}}>Eliminar</th>
                    <th style={{textAlign:'center',padding:'6px 8px',color:'#64748b',fontWeight:600}}>Todo</th>
                  </tr>
                </thead>
                <tbody>
                  {MODULOS.map(m=>(
                    <tr key={m} style={{borderTop:'1px solid #e2e8f0'}}>
                      <td style={{padding:'6px 8px',fontWeight:600,color:'#0f172a'}}>{MODULO_LABEL[m]}</td>
                      {['puede_ver','puede_editar','puede_crear','puede_eliminar'].map(campo=>(
                        <td key={campo} style={{textAlign:'center',padding:'6px 8px'}}>
                          <input type="checkbox" checked={permsEdit[m]?.[campo]==='yes'} onChange={()=>togglePerm(m,campo)}
                            style={{width:16,height:16,cursor:'pointer'}} />
                        </td>
                      ))}
                      <td style={{textAlign:'center',padding:'6px 8px'}}>
                        <button onClick={()=>setAllPerms(m, permsEdit[m]?.puede_ver==='yes'&&permsEdit[m]?.puede_editar==='yes'?'no':'yes')}
                          style={{padding:'2px 8px',borderRadius:4,border:'1px solid #e2e8f0',background:'#fff',fontSize:11,cursor:'pointer',fontFamily:'inherit',color:'#475569'}}>
                          {permsEdit[m]?.puede_ver==='yes'&&permsEdit[m]?.puede_editar==='yes'?'Quitar':'Todo'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{display:'flex',gap:10,marginTop:20,justifyContent:'flex-end'}}>
              <button onClick={()=>setShowPerms(null)} style={{padding:'8px 18px',borderRadius:7,border:'1px solid #e2e8f0',background:'#f8fafc',color:'#475569',fontSize:13,cursor:'pointer',fontFamily:'inherit'}}>Cancelar</button>
              <button onClick={savePerms} style={{padding:'8px 18px',borderRadius:7,border:'none',background:'#1d4ed8',color:'#fff',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>Guardar permisos</button>
            </div>
          </div>
        </div>
      )}

      {/* TABLA USUARIOS */}
      <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:12,overflow:'hidden'}}>
        <table className="data-table" style={{width:'100%'}}>
          <thead>
            <tr>
              <th>Usuario</th>
              <th>Nombre</th>
              <th>Rol</th>
              <th>Modulos con acceso</th>
              <th>Estado</th>
              <th>Creado por</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {data.map((u,i)=>{
              const rc = roleColor[u.role]||roleColor.viewer;
              const modulosActivos = Object.entries(u.permisos||{}).filter(([,p])=>p.puede_ver==='yes').map(([m])=>MODULO_LABEL[m]);
              return (
                <tr key={i}>
                  <td>
                    <div style={{fontWeight:700,color:'#0f172a'}}>{u.username}</div>
                    <div style={{fontSize:11,color:'#94a3b8'}}>ID: {u.id}</div>
                  </td>
                  <td>{u.nombre_completo||'—'}</td>
                  <td>
                    <span style={{background:rc.bg,color:rc.color,fontSize:11,fontWeight:700,padding:'3px 10px',borderRadius:20,textTransform:'uppercase'}}>
                      {u.role}
                    </span>
                  </td>
                  <td style={{fontSize:11,color:'#64748b',maxWidth:200}}>
                    {modulosActivos.length > 0
                      ? modulosActivos.join(', ')
                      : <span style={{color:'#c81e1e'}}>Sin acceso</span>
                    }
                  </td>
                  <td>
                    <span style={{display:'inline-flex',alignItems:'center',gap:5,fontSize:11,fontWeight:600,padding:'3px 10px',borderRadius:20,background:u.activo==='yes'?'#f0fdf4':'#fef2f2',color:u.activo==='yes'?'#057a55':'#c81e1e'}}>
                      <span style={{width:6,height:6,borderRadius:'50%',background:'currentColor',display:'inline-block'}}/>{u.activo==='yes'?'Activo':'Inactivo'}
                    </span>
                  </td>
                  <td style={{fontSize:12,color:'#64748b'}}>{u.creado_por||'Sistema'}</td>
                  <td>
                    <div style={{display:'flex',gap:6}}>
                      <button onClick={()=>openPerms(u)} style={{padding:'4px 10px',borderRadius:5,border:'1px solid #e2e8f0',background:'#fff',color:'#475569',fontSize:11,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>Permisos</button>
                      {u.role !== 'superadmin' && (
                        <button onClick={()=>handleToggle(u.id,u.username,u.activo)}
                          style={{padding:'4px 10px',borderRadius:5,fontSize:11,fontWeight:600,cursor:'pointer',fontFamily:'inherit',
                            border: u.activo==='yes'?'1px solid #fee2e2':'1px solid #bbf7d0',
                            background:'#fff', color: u.activo==='yes'?'#c81e1e':'#057a55'}}>
                          {u.activo==='yes'?'Desactivar':'Activar'}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const lbl = {fontSize:11,fontWeight:600,color:'#64748b',textTransform:'uppercase',letterSpacing:'0.5px',marginBottom:4,display:'block'};
const inp = {width:'100%',padding:'8px 12px',border:'1px solid #e2e8f0',borderRadius:7,fontSize:13,fontFamily:'inherit',color:'#0f172a',outline:'none',boxSizing:'border-box'};
