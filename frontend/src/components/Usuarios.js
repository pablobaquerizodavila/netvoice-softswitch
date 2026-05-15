import { useState, useEffect } from 'react';
import api from '../api';

const MODULOS = ['dashboard','cdr','metricas','extensiones','carriers','clientes','planes','did_series','ajustes','usuarios'];
const MODULO_LABEL = {dashboard:'Dashboard',cdr:'CDR',metricas:'Métricas',extensiones:'Extensiones',carriers:'Carriers',clientes:'Clientes',planes:'Planes',did_series:'Series DID',ajustes:'Ajustes',usuarios:'Usuarios'};

export default function Usuarios() {
  const [tabActiva, setTabActiva] = useState('sistema');
  const [data, setData]           = useState([]);
  const [loading, setLoading]     = useState(true);
  const [showForm, setShowForm]   = useState(false);
  const [showPerms, setShowPerms] = useState(null);
  const [showEdit, setShowEdit]   = useState(null);
  const [msg, setMsg]             = useState(null);
  const [showPwd, setShowPwd]     = useState(false);
  const [showEditPwd, setShowEditPwd] = useState(false);
  const [form, setForm]           = useState({username:'',password:'',role:'admin',nombre_completo:''});
  const [editForm, setEditForm]   = useState({nombre_completo:'',role:'admin',password:'',password_confirm:''});
  const [permsEdit, setPermsEdit] = useState({});

  const load = () => {
    setLoading(true);
    api.get('/usuarios').then(r => setData(r.data.data || [])).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const showMsg = (text, type = 'success') => { setMsg({ text, type }); setTimeout(() => setMsg(null), 4000); };

  const handleCreate = async () => {
    if (!form.username || !form.password) return showMsg('Usuario y password requeridos', 'error');
    try {
      const res = await api.post('/usuarios', form);
      const newId = res.data.id;
      await api.put('/usuarios/' + newId + '/permisos', { permisos: permsEdit });
      showMsg('Usuario ' + form.username + ' creado');
      setShowForm(false);
      setForm({ username: '', password: '', role: 'admin', nombre_completo: '' });
      setPermsEdit({});
      load();
    } catch (e) { showMsg(e.response?.data?.detail || 'Error', 'error'); }
  };

  const handleEdit = async () => {
    if (editForm.password && editForm.password !== editForm.password_confirm)
      return showMsg('Las contraseñas no coinciden', 'error');
    if (editForm.password && editForm.password.length < 6)
      return showMsg('La contraseña debe tener al menos 6 caracteres', 'error');
    try {
      const payload = {
        nombre_completo: editForm.nombre_completo,
        role: editForm.role,
      };
      if (editForm.password) payload.password = editForm.password;
      await api.put('/usuarios/' + showEdit.id, payload);
      showMsg('Usuario ' + showEdit.username + ' actualizado');
      setShowEdit(null);
      setEditForm({ nombre_completo: '', role: 'admin', password: '', password_confirm: '' });
      load();
    } catch (e) { showMsg(e.response?.data?.detail || 'Error', 'error'); }
  };

  const openEdit = (user) => {
    setEditForm({ nombre_completo: user.nombre_completo || '', role: user.role, password: '', password_confirm: '' });
    setShowEditPwd(false);
    setShowEdit(user);
  };

  const handleToggle = async (id, username, activo) => {
    if (!window.confirm((activo === 'yes' ? 'Desactivar' : 'Activar') + ' usuario ' + username + '?')) return;
    try { await api.put('/usuarios/' + id + '/toggle', {}); showMsg('Usuario actualizado'); load(); }
    catch (e) { showMsg('Error', 'error'); }
  };

  const openPerms = (user) => {
    const p = {};
    MODULOS.forEach(m => {
      p[m] = user.permisos?.[m] || { puede_ver: 'no', puede_editar: 'no', puede_crear: 'no', puede_eliminar: 'no' };
    });
    setPermsEdit(p);
    setShowPerms(user);
  };

  const savePerms = async () => {
    try {
      await api.put('/usuarios/' + showPerms.id + '/permisos', { permisos: permsEdit });
      showMsg('Permisos de ' + showPerms.username + ' actualizados');
      setShowPerms(null);
      load();
    } catch (e) { showMsg('Error', 'error'); }
  };

  const togglePerm = (modulo, campo) => {
    setPermsEdit(prev => ({
      ...prev,
      [modulo]: { ...prev[modulo], [campo]: prev[modulo]?.[campo] === 'yes' ? 'no' : 'yes' }
    }));
  };

  const setAllPerms = (modulo, val) => {
    setPermsEdit(prev => ({
      ...prev,
      [modulo]: { puede_ver: val, puede_editar: val, puede_crear: val, puede_eliminar: val }
    }));
  };

  const emptyPerms = () => {
    const p = {};
    MODULOS.forEach(m => { p[m] = { puede_ver: 'no', puede_editar: 'no', puede_crear: 'no', puede_eliminar: 'no' }; });
    return p;
  };

  const roleColors = {
    superadmin: 'badge-amber',
    admin:      'badge-blue',
    viewer:     'badge-accent',
  };

  if (loading) return <div className="loading">Cargando usuarios...</div>;

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 22 }}>
        <div>
          <h1 className="page-title">Gestión de usuarios</h1>
          <p className="page-subtitle">{data.length} usuarios registrados</p>
        </div>
        <button onClick={() => { setForm({ username: '', password: '', role: 'admin', nombre_completo: '' }); setPermsEdit(emptyPerms()); setShowForm(true); }}
          className="btn-primary">+ Nuevo usuario</button>
      </div>

      {/* Mensaje */}
      {msg && (
        <div style={{ padding: '10px 16px', borderRadius: 8, marginBottom: 16, fontSize: 13, fontWeight: 500, background: msg.type === 'error' ? 'var(--red-dim)' : 'var(--green-dim)', color: msg.type === 'error' ? 'var(--red)' : 'var(--green)', border: '1px solid ' + (msg.type === 'error' ? 'var(--red)' : 'var(--green)') }}>
          {msg.text}
        </div>
      )}

      {/* ── MODAL NUEVO USUARIO ── */}
      {showForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-mid)', borderRadius: 12, padding: 28, width: 680, maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)', marginBottom: 20 }}>Nuevo usuario</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 20 }}>
              <div>
                <label style={lbl}>Usuario *</label>
                <input style={inp} placeholder="nombre.usuario" value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} />
              </div>
              <div>
                <label style={lbl}>Nombre completo</label>
                <input style={inp} placeholder="Nombre Apellido" value={form.nombre_completo} onChange={e => setForm({ ...form, nombre_completo: e.target.value })} />
              </div>
              <div>
                <label style={lbl}>Password *</label>
                <div style={{ position: 'relative' }}>
                  <input style={{ ...inp, paddingRight: 40 }} type={showPwd ? 'text' : 'password'} placeholder="Min 8 caracteres" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
                  <button type="button" onClick={() => setShowPwd(!showPwd)} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4, display: 'flex', alignItems: 'center' }}>
                    <EyeIcon open={showPwd} />
                  </button>
                </div>
              </div>
              <div>
                <label style={lbl}>Rol</label>
                <select style={inp} value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
                  <option value="admin">Admin</option>
                  <option value="viewer">Viewer (solo lectura)</option>
                </select>
              </div>
            </div>
            <PermsTable permsEdit={permsEdit} togglePerm={togglePerm} setAllPerms={setAllPerms} />
            <div style={{ display: 'flex', gap: 10, marginTop: 20, justifyContent: 'flex-end' }}>
              <button onClick={() => setShowForm(false)} className="btn-sm">Cancelar</button>
              <button onClick={handleCreate} className="btn-primary">Crear usuario</button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL EDITAR USUARIO ── */}
      {showEdit && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-mid)', borderRadius: 12, padding: 28, width: 480 }}>
            <h2 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>Editar usuario</h2>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 20, fontFamily: 'var(--font-mono)' }}>@{showEdit.username}</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={lbl}>Nombre completo</label>
                <input style={inp} placeholder="Nombre Apellido" value={editForm.nombre_completo} onChange={e => setEditForm({ ...editForm, nombre_completo: e.target.value })} />
              </div>
              {showEdit.role !== 'superadmin' && (
                <div>
                  <label style={lbl}>Rol</label>
                  <select style={inp} value={editForm.role} onChange={e => setEditForm({ ...editForm, role: e.target.value })}>
                    <option value="admin">Admin</option>
                    <option value="viewer">Viewer (solo lectura)</option>
                  </select>
                </div>
              )}

              {/* Sección cambio de contraseña */}
              <div style={{ border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
                <button onClick={() => setShowEditPwd(!showEditPwd)}
                  style={{ width: '100%', padding: '10px 14px', background: 'var(--bg-surface)', border: 'none', color: 'var(--text-sec)', fontSize: 13, cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontFamily: 'var(--font)' }}>
                  <span>Cambiar contraseña</span>
                  <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{showEditPwd ? '▲ ocultar' : '▼ expandir'}</span>
                </button>
                {showEditPwd && (
                  <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div>
                      <label style={lbl}>Nueva contraseña</label>
                      <div style={{ position: 'relative' }}>
                        <input style={{ ...inp, paddingRight: 40 }} type="password" placeholder="Mínimo 6 caracteres" value={editForm.password} onChange={e => setEditForm({ ...editForm, password: e.target.value })} />
                      </div>
                    </div>
                    <div>
                      <label style={lbl}>Confirmar contraseña</label>
                      <input style={{ ...inp, borderColor: editForm.password_confirm && editForm.password !== editForm.password_confirm ? 'var(--red)' : undefined }}
                        type="password" placeholder="Repetir contraseña" value={editForm.password_confirm} onChange={e => setEditForm({ ...editForm, password_confirm: e.target.value })} />
                      {editForm.password_confirm && editForm.password !== editForm.password_confirm && (
                        <span style={{ fontSize: 11, color: 'var(--red)', marginTop: 4, display: 'block' }}>Las contraseñas no coinciden</span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 24, justifyContent: 'flex-end' }}>
              <button onClick={() => setShowEdit(null)} className="btn-sm">Cancelar</button>
              <button onClick={handleEdit} className="btn-primary">Guardar cambios</button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL PERMISOS ── */}
      {showPerms && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-mid)', borderRadius: 12, padding: 28, width: 680, maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>Permisos de {showPerms.username}</h2>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16, fontFamily: 'var(--font-mono)' }}>Rol: {showPerms.role}</p>
            <PermsTable permsEdit={permsEdit} togglePerm={togglePerm} setAllPerms={setAllPerms} />
            <div style={{ display: 'flex', gap: 10, marginTop: 20, justifyContent: 'flex-end' }}>
              <button onClick={() => setShowPerms(null)} className="btn-sm">Cancelar</button>
              <button onClick={savePerms} className="btn-primary">Guardar permisos</button>
            </div>
          </div>
        </div>
      )}

      {/* ── TABLA ── */}
      <div className="section-card">
        <table className="data-table">
          <thead>
            <tr>
              <th>Usuario</th>
              <th>Nombre</th>
              <th>Rol</th>
              <th>Módulos con acceso</th>
              <th>Estado</th>
              <th>Creado por</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {data.map((u, i) => {
              const modulosActivos = Object.entries(u.permisos || {}).filter(([, p]) => p.puede_ver === 'yes').map(([m]) => MODULO_LABEL[m]);
              return (
                <tr key={i}>
                  <td>
                    <div style={{ fontWeight: 500, color: 'var(--text)' }}>{u.username}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>ID: {u.id}</div>
                  </td>
                  <td className="td-muted">{u.nombre_completo || '—'}</td>
                  <td>
                    <span className={`badge ${roleColors[u.role] || 'badge-accent'}`} style={{ textTransform: 'uppercase', fontSize: 10, fontFamily: 'var(--font-mono)' }}>
                      {u.role}
                    </span>
                  </td>
                  <td style={{ fontSize: 11, color: 'var(--text-sec)', maxWidth: 200 }}>
                    {modulosActivos.length > 0
                      ? modulosActivos.join(', ')
                      : <span style={{ color: 'var(--red)' }}>Sin acceso</span>
                    }
                  </td>
                  <td>
                    <span className={`status-pill ${u.activo === 'yes' ? 'pill-green' : 'pill-red'}`}>
                      <span className="dot-sm" />{u.activo === 'yes' ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="td-muted" style={{ fontSize: 12 }}>{u.creado_por || 'Sistema'}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 5 }}>
                      <button onClick={() => openEdit(u)} className="btn-sm">Editar</button>
                      <button onClick={() => openPerms(u)} className="btn-sm">Permisos</button>
                      {u.role !== 'superadmin' && (
                        <button onClick={() => handleToggle(u.id, u.username, u.activo)}
                          className={`btn-sm ${u.activo === 'yes' ? 'btn-danger' : ''}`}>
                          {u.activo === 'yes' ? 'Desactivar' : 'Activar'}
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

function PermsTable({ permsEdit, togglePerm, setAllPerms }) {
  const MODULOS = ['dashboard','cdr','metricas','extensiones','carriers','clientes','planes','did_series','ajustes','usuarios'];
  const MODULO_LABEL = {dashboard:'Dashboard',cdr:'CDR',metricas:'Métricas',extensiones:'Extensiones',carriers:'Carriers',clientes:'Clientes',planes:'Planes',did_series:'Series DID',ajustes:'Ajustes',usuarios:'Usuarios'};
  return (
    <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 8, padding: 14 }}>
      <div style={{ fontWeight: 600, fontSize: 12, color: 'var(--text-sec)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Permisos por módulo</div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', padding: '6px 8px', color: 'var(--text-muted)', fontWeight: 500 }}>Módulo</th>
              {['Ver', 'Editar', 'Crear', 'Eliminar', 'Todo'].map(h => (
                <th key={h} style={{ textAlign: 'center', padding: '6px 8px', color: 'var(--text-muted)', fontWeight: 500 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {MODULOS.map(m => (
              <tr key={m} style={{ borderTop: '1px solid var(--border)' }}>
                <td style={{ padding: '7px 8px', fontWeight: 500, color: 'var(--text)' }}>{MODULO_LABEL[m]}</td>
                {['puede_ver', 'puede_editar', 'puede_crear', 'puede_eliminar'].map(campo => (
                  <td key={campo} style={{ textAlign: 'center', padding: '7px 8px' }}>
                    <input type="checkbox" checked={permsEdit[m]?.[campo] === 'yes'} onChange={() => togglePerm(m, campo)}
                      style={{ width: 15, height: 15, cursor: 'pointer', accentColor: 'var(--accent)' }} />
                  </td>
                ))}
                <td style={{ textAlign: 'center', padding: '7px 8px' }}>
                  <button onClick={() => setAllPerms(m, permsEdit[m]?.puede_ver === 'yes' && permsEdit[m]?.puede_editar === 'yes' ? 'no' : 'yes')}
                    style={{ padding: '2px 8px', borderRadius: 4, border: '1px solid var(--border-mid)', background: 'transparent', fontSize: 10, cursor: 'pointer', fontFamily: 'var(--font)', color: 'var(--text-sec)' }}>
                    {permsEdit[m]?.puede_ver === 'yes' && permsEdit[m]?.puede_editar === 'yes' ? 'Quitar' : 'Todo'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function EyeIcon({ open }) {
  return open
    ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
    : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>;
}

const lbl = { fontSize: 11, fontWeight: 500, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4, display: 'block' };
const inp = { width: '100%', padding: '8px 12px', border: '1px solid var(--border-mid)', borderRadius: 7, fontSize: 13, fontFamily: 'var(--font)', color: 'var(--text)', background: 'var(--bg-surface)', outline: 'none', boxSizing: 'border-box' };

function UsuariosNetvoice() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({email:'',password:'',role:'agent'});
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const token = localStorage.getItem('token');
  const hdrs = {'Content-Type':'application/json', Authorization:`Bearer ${token}`};

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const r = await fetch('/v1/auth/users', {headers: hdrs});
      const d = await r.json();
      setUsers(d.data || []);
    } catch(e) { setUsers([]); }
    finally { setLoading(false); }
  };

  const handleCreate = async e => {
    e.preventDefault(); setError(''); setSuccess('');
    try {
      const r = await fetch('/v1/auth/users', {method:'POST', headers:hdrs, body:JSON.stringify(form)});
      const d = await r.json();
      if (!r.ok) { setError(d.detail || 'Error'); return; }
      setSuccess('Usuario creado: ' + form.email);
      setForm({email:'',password:'',role:'agent'});
      load();
    } catch(e) { setError('Error al crear'); }
  };

  const rColor = r => ({admin:'#4f46e5',agent:'#059669',partner:'#d97706'}[r]||'#6b7280');
  const rLabel = r => ({admin:'Admin',agent:'Agente SAC',partner:'Partner',client:'Cliente'}[r]||r);
  const s = {background:'#1f2937',border:'1px solid #374151',borderRadius:6,padding:'8px 12px',color:'#f9fafb',fontSize:13,width:'100%',boxSizing:'border-box'};

  return (
    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'1.5rem'}}>
      <div style={{background:'#111827',border:'1px solid #1f2937',borderRadius:10,padding:'1.25rem'}}>
        <h3 style={{color:'#f9fafb',fontSize:15,fontWeight:600,margin:'0 0 1rem'}}>Nuevo usuario Netvoice</h3>
        {error && <div style={{background:'#7f1d1d',color:'#fca5a5',padding:'8px 12px',borderRadius:6,marginBottom:12,fontSize:13}}>{error}</div>}
        {success && <div style={{background:'#065f46',color:'#6ee7b7',padding:'8px 12px',borderRadius:6,marginBottom:12,fontSize:13}}>{success}</div>}
        <form onSubmit={handleCreate}>
          <div style={{marginBottom:12}}>
            <label style={{color:'#9ca3af',fontSize:12,display:'block',marginBottom:4}}>Email</label>
            <input style={s} type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} required />
          </div>
          <div style={{marginBottom:12}}>
            <label style={{color:'#9ca3af',fontSize:12,display:'block',marginBottom:4}}>Contraseña</label>
            <input style={s} type="password" value={form.password} onChange={e=>setForm({...form,password:e.target.value})} required />
          </div>
          <div style={{marginBottom:16}}>
            <label style={{color:'#9ca3af',fontSize:12,display:'block',marginBottom:4}}>Rol</label>
            <select style={s} value={form.role} onChange={e=>setForm({...form,role:e.target.value})}>
              <option value="admin">Admin</option>
              <option value="agent">Agente SAC</option>
              <option value="partner">Partner</option>
            </select>
          </div>
          <button type="submit" style={{width:'100%',padding:9,background:'#34d399',color:'#000',border:'none',borderRadius:6,fontWeight:600,fontSize:13,cursor:'pointer'}}>Crear usuario →</button>
        </form>
      </div>
      <div style={{background:'#111827',border:'1px solid #1f2937',borderRadius:10,padding:'1.25rem'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'1rem'}}>
          <h3 style={{color:'#f9fafb',fontSize:15,fontWeight:600,margin:0}}>Usuarios activos</h3>
          <button onClick={load} style={{background:'#1f2937',border:'1px solid #374151',color:'#9ca3af',borderRadius:6,padding:'4px 10px',cursor:'pointer',fontSize:12}}>↻</button>
        </div>
        {loading && <p style={{color:'#9ca3af',fontSize:13}}>Cargando...</p>}
        {users.map(u => (
          <div key={u.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'8px 0',borderBottom:'1px solid #1f2937'}}>
            <div>
              <p style={{color:'#f9fafb',fontSize:13,margin:0}}>{u.email}</p>
              <p style={{color:'#6b7280',fontSize:11,margin:'2px 0 0'}}>{u.status}</p>
            </div>
            <span style={{background:rColor(u.role)+'22',color:rColor(u.role),fontSize:11,padding:'2px 8px',borderRadius:4,fontWeight:600}}>{rLabel(u.role)}</span>
          </div>
        ))}
        {!loading && users.length===0 && <p style={{color:'#9ca3af',fontSize:13}}>Sin usuarios</p>}
      </div>
    </div>
  );
}
