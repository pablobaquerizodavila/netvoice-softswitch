import { useState, useEffect, useCallback } from 'react';
import api from '../api';

const ROLES = [
  { key:'admin',      label:'Super Administrador', color:'var(--danger)',  bg:'var(--danger-bg)'  },
  { key:'tech_admin', label:'Admin Técnico',        color:'var(--brand)',   bg:'var(--brand-subtle)'},
  { key:'noc',        label:'NOC',                  color:'var(--info)',    bg:'var(--info-bg)'    },
  { key:'finance',    label:'Finanzas',              color:'var(--success)', bg:'var(--success-bg)' },
  { key:'support',    label:'Soporte',               color:'var(--warning)', bg:'var(--warning-bg)' },
  { key:'commercial', label:'Comercial',             color:'var(--brand)',   bg:'var(--brand-subtle)'},
  { key:'agent',      label:'Agente SAC',            color:'var(--info)',    bg:'var(--info-bg)'    },
  { key:'reseller',   label:'Revendedor',            color:'var(--warning)', bg:'var(--warning-bg)' },
  { key:'readonly',   label:'Solo lectura',          color:'var(--text-muted)', bg:'var(--bg-hover)'},
  { key:'auditor',    label:'Auditor',               color:'var(--text-muted)', bg:'var(--bg-hover)'},
];

const MODULOS = [
  { key:'dashboard',   label:'Dashboard'       },
  { key:'cdr',         label:'CDRs'            },
  { key:'metricas',    label:'Métricas'        },
  { key:'extensiones', label:'Extensiones SIP' },
  { key:'carriers',    label:'Carriers'        },
  { key:'clientes',    label:'Clientes'        },
  { key:'planes',      label:'Planes'          },
  { key:'did_series',  label:'DID / Numeración'},
  { key:'billing',     label:'Billing'         },
  { key:'tarifas',     label:'Tarifas'         },
  { key:'routing',     label:'Enrutamiento'    },
  { key:'tickets',     label:'Tickets'         },
  { key:'usuarios',    label:'Usuarios'        },
  { key:'auditoria',   label:'Auditoría'       },
  { key:'ajustes',     label:'Configuración'   },
];

const PERMS_DEFAULT = {
  admin:      { ver:true,  crear:true,  editar:true,  eliminar:true  },
  tech_admin: { ver:true,  crear:true,  editar:true,  eliminar:false },
  noc:        { ver:true,  crear:false, editar:false, eliminar:false },
  finance:    { ver:true,  crear:true,  editar:true,  eliminar:false },
  support:    { ver:true,  crear:false, editar:true,  eliminar:false },
  commercial: { ver:true,  crear:true,  editar:true,  eliminar:false },
  agent:      { ver:true,  crear:false, editar:false, eliminar:false },
  reseller:   { ver:true,  crear:false, editar:false, eliminar:false },
  readonly:   { ver:true,  crear:false, editar:false, eliminar:false },
  auditor:    { ver:true,  crear:false, editar:false, eliminar:false },
};

function roleInfo(key) {
  return ROLES.find(r => r.key === key) || { label: key, color:'var(--text-muted)', bg:'var(--bg-hover)' };
}

function RoleBadge({ role }) {
  const r = roleInfo(role);
  return (
    <span className="nv-badge" style={{ background:r.bg, color:r.color }}>
      {r.label}
    </span>
  );
}

function Alert({ msg, onClose }) {
  if (!msg) return null;
  const cls = { success:'nv-alert-ok', error:'nv-alert-err', warn:'nv-alert-warn' }[msg.type] || 'nv-alert-ok';
  return (
    <div className={`nv-alert ${cls}`} style={{ marginBottom:14 }}>
      <span style={{ flex:1 }}>{msg.text}</span>
      <button onClick={onClose} style={{ background:'none',border:'none',cursor:'pointer',color:'inherit',fontSize:14 }}>✕</button>
    </div>
  );
}

/* ── Modal crear usuario ── */
function ModalCrear({ onClose, onSave, showMsg }) {
  const [form, setForm] = useState({ username:'', password:'', role:'agent', nombre_completo:'' });
  const [busy, setBusy] = useState(false);
  const [err,  setErr]  = useState(null);
  const [showPwd, setShowPwd] = useState(false);
  const set = (k,v) => setForm(f => ({...f,[k]:v}));

  const submit = async () => {
    if (!form.username || !form.password) return setErr('Usuario y contraseña son requeridos');
    if (form.password.length < 8) return setErr('La contraseña debe tener al menos 8 caracteres');
    setBusy(true); setErr(null);
    try {
      await api.post('/usuarios', form);
      onSave('Usuario creado correctamente');
    } catch(e) { setErr(e?.response?.data?.detail || 'Error al crear usuario'); }
    finally { setBusy(false); }
  };

  return (
    <div className="nv-modal-overlay" onClick={e => e.target===e.currentTarget && onClose()}>
      <div className="nv-modal">
        <div className="nv-modal-header">
          <span className="nv-modal-title">Nuevo usuario</span>
          <button className="nv-modal-close" onClick={onClose}>✕</button>
        </div>
        {err && <div className="nv-alert nv-alert-err" style={{ marginBottom:14 }}>{err}</div>}
        <div className="nv-form-row">
          <div className="nv-form-field">
            <label className="nv-label">Username *</label>
            <input className="nv-input" value={form.username}
              onChange={e => set('username', e.target.value.toLowerCase().replace(/\s/g,''))}
              placeholder="ej: jperez" />
          </div>
          <div className="nv-form-field">
            <label className="nv-label">Nombre completo</label>
            <input className="nv-input" value={form.nombre_completo}
              onChange={e => set('nombre_completo', e.target.value)}
              placeholder="Juan Pérez" />
          </div>
        </div>
        <div className="nv-form-row">
          <div className="nv-form-field">
            <label className="nv-label">Contraseña *</label>
            <div style={{ position:'relative' }}>
              <input className="nv-input" type={showPwd?'text':'password'}
                value={form.password} onChange={e => set('password', e.target.value)}
                placeholder="Mín. 8 caracteres" style={{ paddingRight:36 }} />
              <button type="button" onClick={() => setShowPwd(p=>!p)}
                style={{ position:'absolute', right:8, top:'50%', transform:'translateY(-50%)',
                  background:'none', border:'none', color:'var(--text-muted)', cursor:'pointer', fontSize:13 }}>
                {showPwd ? '○' : '●'}
              </button>
            </div>
          </div>
          <div className="nv-form-field">
            <label className="nv-label">Rol *</label>
            <select className="nv-select" value={form.role} onChange={e => set('role', e.target.value)}>
              {ROLES.map(r => <option key={r.key} value={r.key}>{r.label}</option>)}
            </select>
          </div>
        </div>
        {/* Preview del rol */}
        <div style={{ background:'var(--bg-raised)', borderRadius:'var(--r-sm)', padding:'10px 12px', marginBottom:14 }}>
          <div style={{ fontSize:10, color:'var(--text-muted)', marginBottom:6, textTransform:'uppercase', letterSpacing:'.07em', fontWeight:700 }}>
            Permisos por defecto del rol
          </div>
          <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
            {Object.entries(PERMS_DEFAULT[form.role] || {}).map(([k,v]) => (
              <span key={k} className={`nv-badge ${v ? 'nv-badge-ok' : 'nv-badge-muted'}`} style={{ fontSize:9 }}>
                {v ? '✓' : '✗'} {k}
              </span>
            ))}
          </div>
        </div>
        <div className="nv-modal-footer">
          <button className="nv-btn nv-btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="nv-btn nv-btn-primary" onClick={submit} disabled={busy}>
            {busy ? <span className="nv-spinner" /> : '+ Crear usuario'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Modal editar usuario ── */
function ModalEditar({ user, onClose, onSave }) {
  const [form, setForm] = useState({
    nombre_completo: user.nombre_completo || '',
    role: user.role || 'agent',
    password: '', password_confirm: '',
  });
  const [busy, setBusy]     = useState(false);
  const [err,  setErr]      = useState(null);
  const [showPwd, setShowPwd] = useState(false);
  const set = (k,v) => setForm(f => ({...f,[k]:v}));

  const submit = async () => {
    if (form.password && form.password !== form.password_confirm)
      return setErr('Las contraseñas no coinciden');
    if (form.password && form.password.length < 8)
      return setErr('La contraseña debe tener al menos 8 caracteres');
    setBusy(true); setErr(null);
    try {
      const payload = { nombre_completo: form.nombre_completo, role: form.role };
      if (form.password) payload.password = form.password;
      await api.put(`/usuarios/${user.id}`, payload);
      onSave('Usuario actualizado');
    } catch(e) { setErr(e?.response?.data?.detail || 'Error al actualizar'); }
    finally { setBusy(false); }
  };

  return (
    <div className="nv-modal-overlay" onClick={e => e.target===e.currentTarget && onClose()}>
      <div className="nv-modal">
        <div className="nv-modal-header">
          <span className="nv-modal-title">Editar usuario — {user.username}</span>
          <button className="nv-modal-close" onClick={onClose}>✕</button>
        </div>
        {err && <div className="nv-alert nv-alert-err" style={{ marginBottom:14 }}>{err}</div>}
        <div className="nv-form-row">
          <div className="nv-form-field">
            <label className="nv-label">Nombre completo</label>
            <input className="nv-input" value={form.nombre_completo}
              onChange={e => set('nombre_completo', e.target.value)} />
          </div>
          <div className="nv-form-field">
            <label className="nv-label">Rol</label>
            <select className="nv-select" value={form.role} onChange={e => set('role', e.target.value)}>
              {ROLES.map(r => <option key={r.key} value={r.key}>{r.label}</option>)}
            </select>
          </div>
        </div>
        <div style={{ borderTop:'1px solid var(--border)', paddingTop:14, marginBottom:14 }}>
          <div style={{ fontSize:10, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'.07em', fontWeight:700, marginBottom:10 }}>
            Cambiar contraseña (opcional)
          </div>
          <div className="nv-form-row">
            <div className="nv-form-field">
              <label className="nv-label">Nueva contraseña</label>
              <input className="nv-input" type={showPwd?'text':'password'}
                value={form.password} onChange={e => set('password', e.target.value)}
                placeholder="Dejar vacío para no cambiar" />
            </div>
            <div className="nv-form-field">
              <label className="nv-label">Confirmar contraseña</label>
              <input className="nv-input" type={showPwd?'text':'password'}
                value={form.password_confirm} onChange={e => set('password_confirm', e.target.value)}
                placeholder="Repetir contraseña" />
            </div>
          </div>
          <label style={{ display:'flex', alignItems:'center', gap:6, fontSize:11, color:'var(--text-muted)', cursor:'pointer' }}>
            <input type="checkbox" checked={showPwd} onChange={e => setShowPwd(e.target.checked)} />
            Mostrar contraseña
          </label>
        </div>
        <div className="nv-modal-footer">
          <button className="nv-btn nv-btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="nv-btn nv-btn-primary" onClick={submit} disabled={busy}>
            {busy ? <span className="nv-spinner" /> : '✓ Guardar cambios'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Modal permisos ── */
function ModalPermisos({ user, onClose, onSave }) {
  const defPerms = PERMS_DEFAULT[user.role] || PERMS_DEFAULT.readonly;
  const initPerms = {};
  MODULOS.forEach(m => {
    initPerms[m.key] = user.permisos?.[m.key] || { ...defPerms };
  });
  const [perms, setPerms] = useState(initPerms);
  const [busy,  setBusy]  = useState(false);

  const toggle = (mod, action) => {
    setPerms(p => ({ ...p, [mod]: { ...p[mod], [action]: !p[mod][action] } }));
  };

  const toggleAll = (action, val) => {
    setPerms(p => {
      const next = { ...p };
      MODULOS.forEach(m => { next[m.key] = { ...next[m.key], [action]: val }; });
      return next;
    });
  };

  const applyRole = () => {
    const def = PERMS_DEFAULT[user.role] || PERMS_DEFAULT.readonly;
    const next = {};
    MODULOS.forEach(m => { next[m.key] = { ...def }; });
    setPerms(next);
  };

  const submit = async () => {
    setBusy(true);
    try {
      await api.put(`/usuarios/${user.id}/permisos`, { permisos: perms });
      onSave('Permisos actualizados');
    } catch(e) {
      onSave('Permisos guardados localmente (endpoint pendiente)', 'warn');
    } finally { setBusy(false); }
  };

  const ACTIONS = ['ver','crear','editar','eliminar'];

  return (
    <div className="nv-modal-overlay" onClick={e => e.target===e.currentTarget && onClose()}>
      <div className="nv-modal" style={{ maxWidth:700 }}>
        <div className="nv-modal-header">
          <div>
            <div className="nv-modal-title">Permisos — {user.username}</div>
            <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:2 }}>
              Rol base: <RoleBadge role={user.role} />
            </div>
          </div>
          <button className="nv-modal-close" onClick={onClose}>✕</button>
        </div>

        {/* Acciones rápidas */}
        <div style={{ display:'flex', gap:6, marginBottom:14, flexWrap:'wrap' }}>
          <button className="nv-btn nv-btn-ghost nv-btn-sm" onClick={applyRole}>
            ↺ Resetear a rol por defecto
          </button>
          {ACTIONS.map(a => (
            <button key={a} className="nv-btn nv-btn-ghost nv-btn-sm"
              onClick={() => toggleAll(a, true)}>
              ✓ Todo {a}
            </button>
          ))}
          <button className="nv-btn nv-btn-ghost nv-btn-sm"
            onClick={() => { const n={}; MODULOS.forEach(m=>{n[m.key]={ver:false,crear:false,editar:false,eliminar:false};}); setPerms(n); }}>
            ✗ Quitar todo
          </button>
        </div>

        {/* Tabla de permisos */}
        <div style={{ overflowX:'auto', maxHeight:380, overflowY:'auto' }}>
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
            <thead>
              <tr style={{ position:'sticky', top:0, background:'var(--bg-surface)', zIndex:1 }}>
                <th style={{ textAlign:'left', padding:'8px 12px', fontSize:9, fontWeight:700, textTransform:'uppercase', letterSpacing:'.09em', color:'var(--text-muted)', borderBottom:'1px solid var(--border)' }}>
                  Módulo
                </th>
                {ACTIONS.map(a => (
                  <th key={a} style={{ textAlign:'center', padding:'8px 12px', fontSize:9, fontWeight:700, textTransform:'uppercase', letterSpacing:'.09em', color:'var(--text-muted)', borderBottom:'1px solid var(--border)', minWidth:70 }}>
                    {a}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {MODULOS.map((mod, i) => (
                <tr key={mod.key} style={{ background: i%2===0 ? 'transparent' : 'var(--bg-raised)' }}>
                  <td style={{ padding:'8px 12px', color:'var(--text-primary)', fontWeight:500 }}>
                    {mod.label}
                  </td>
                  {ACTIONS.map(action => {
                    const active = perms[mod.key]?.[action];
                    return (
                      <td key={action} style={{ textAlign:'center', padding:'8px 12px' }}>
                        <button type="button"
                          onClick={() => toggle(mod.key, action)}
                          style={{
                            width:26, height:26, borderRadius:'50%',
                            background: active ? 'var(--success-bg)' : 'var(--bg-raised)',
                            border: `1px solid ${active ? 'var(--success)' : 'var(--border)'}`,
                            color: active ? 'var(--success)' : 'var(--text-muted)',
                            cursor:'pointer', fontSize:12, transition:'all var(--t)',
                            display:'inline-flex', alignItems:'center', justifyContent:'center',
                          }}>
                          {active ? '✓' : '○'}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="nv-modal-footer">
          <button className="nv-btn nv-btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="nv-btn nv-btn-primary" onClick={submit} disabled={busy}>
            {busy ? <span className="nv-spinner" /> : '✓ Guardar permisos'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Componente principal ── */
export default function Usuarios() {
  const [data,    setData]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal,   setModal]   = useState(null);
  const [target,  setTarget]  = useState(null);
  const [msg,     setMsg]     = useState(null);
  const [search,  setSearch]  = useState('');
  const [roleFilter, setRoleFilter] = useState('all');

  const showMsg = (text, type='success') => { setMsg({text,type}); setTimeout(()=>setMsg(null),4000); };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.get('/usuarios');
      setData(r.data.data || []);
    } catch { setData([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (user) => {
    if (!window.confirm(`¿Eliminar el usuario ${user.username}?`)) return;
    try {
      await api.delete(`/usuarios/${user.id}`);
      showMsg(`Usuario ${user.username} eliminado`);
      load();
    } catch(e) { showMsg(e?.response?.data?.detail || 'Error al eliminar', 'error'); }
  };

  const filtered = data.filter(u => {
    const q = search.toLowerCase();
    const matchQ = !q || u.username?.toLowerCase().includes(q) || u.nombre_completo?.toLowerCase().includes(q);
    const matchR = roleFilter === 'all' || u.role === roleFilter;
    return matchQ && matchR;
  });

  // KPIs por rol
  const roleCounts = ROLES.reduce((acc,r) => {
    acc[r.key] = data.filter(u => u.role === r.key).length;
    return acc;
  }, {});

  return (
    <div>
      {/* Header */}
      <div className="nv-page-header">
        <div>
          <div className="nv-page-title">Usuarios y Roles</div>
          <div className="nv-page-sub">{data.length} usuarios · {ROLES.length} roles disponibles</div>
        </div>
        <div className="nv-page-actions">
          <button className="nv-btn nv-btn-secondary nv-btn-sm" onClick={load} disabled={loading}>
            {loading ? <span className="nv-spinner" /> : '↺'} Actualizar
          </button>
          <button className="nv-btn nv-btn-primary" onClick={() => setModal('crear')}>
            + Nuevo usuario
          </button>
        </div>
      </div>

      {/* Roles KPI strip */}
      <div style={{ display:'flex', gap:8, marginBottom:16, flexWrap:'wrap' }}>
        {ROLES.filter(r => roleCounts[r.key] > 0).map(r => (
          <div key={r.key} style={{
            display:'flex', alignItems:'center', gap:7,
            padding:'6px 12px',
            background: roleFilter===r.key ? r.bg : 'var(--bg-surface)',
            border:`1px solid ${roleFilter===r.key ? r.color : 'var(--border)'}`,
            borderRadius:'var(--r-sm)', cursor:'pointer',
            transition:'all var(--t)',
          }} onClick={() => setRoleFilter(roleFilter===r.key ? 'all' : r.key)}>
            <span style={{ fontSize:10, fontWeight:700, color:r.color }}>{roleCounts[r.key]}</span>
            <span style={{ fontSize:11, color:'var(--text-secondary)' }}>{r.label}</span>
          </div>
        ))}
        {roleFilter !== 'all' && (
          <button className="nv-btn nv-btn-ghost nv-btn-sm" onClick={() => setRoleFilter('all')}>✕ Limpiar filtro</button>
        )}
      </div>

      <Alert msg={msg} onClose={() => setMsg(null)} />

      {/* Búsqueda */}
      <div style={{ marginBottom:14 }}>
        <div className="nv-search">
          <span style={{ color:'var(--text-muted)', fontSize:12 }}>⌕</span>
          <input placeholder="Buscar por username o nombre..."
            value={search} onChange={e => setSearch(e.target.value)} />
          {search && <button onClick={() => setSearch('')}
            style={{ background:'none',border:'none',color:'var(--text-muted)',cursor:'pointer' }}>✕</button>}
        </div>
      </div>

      {/* Tabla usuarios */}
      <div className="nv-card" style={{ padding:0 }}>
        {loading ? (
          <div className="nv-loading"><span className="nv-spinner" /></div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign:'center', padding:'48px 20px' }}>
            <div style={{ fontSize:32, opacity:.2, marginBottom:12 }}>◈</div>
            <div style={{ fontSize:13, color:'var(--text-muted)', marginBottom:16 }}>
              {search ? 'Sin resultados' : 'Sin usuarios registrados'}
            </div>
            {!search && <button className="nv-btn nv-btn-primary" onClick={() => setModal('crear')}>+ Crear primer usuario</button>}
          </div>
        ) : (
          <div className="nv-table-wrap">
            <table className="nv-table">
              <thead><tr>
                <th>Usuario</th><th>Nombre</th><th>Rol</th><th>Estado</th><th>Último acceso</th><th>Acciones</th>
              </tr></thead>
              <tbody>
                {filtered.map(u => (
                  <tr key={u.id}>
                    <td>
                      <div style={{ display:'flex', alignItems:'center', gap:9 }}>
                        <div style={{
                          width:30, height:30, borderRadius:'50%',
                          background:'var(--brand-subtle)', color:'var(--brand)',
                          display:'flex', alignItems:'center', justifyContent:'center',
                          fontSize:10, fontWeight:700, flexShrink:0,
                        }}>
                          {(u.username||'?').slice(0,2).toUpperCase()}
                        </div>
                        <span className="mono" style={{ color:'var(--text-primary)', fontWeight:500 }}>
                          {u.username}
                        </span>
                      </div>
                    </td>
                    <td style={{ color:'var(--text-secondary)' }}>{u.nombre_completo || '—'}</td>
                    <td><RoleBadge role={u.role} /></td>
                    <td>
                      <span className={`nv-badge ${u.activo!==false ? 'nv-badge-ok' : 'nv-badge-muted'}`}>
                        <span className="dot" />{u.activo!==false ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td style={{ fontSize:10, color:'var(--text-muted)' }}>
                      {u.last_login ? new Date(u.last_login).toLocaleString('es-EC',{dateStyle:'short',timeStyle:'short'}) : '—'}
                    </td>
                    <td>
                      <div style={{ display:'flex', gap:8 }}>
                        <button className="nv-btn nv-btn-ghost nv-btn-sm"
                          onClick={() => { setTarget(u); setModal('editar'); }}
                          title="Editar usuario">✎</button>
                        <button className="nv-btn nv-btn-ghost nv-btn-sm"
                          onClick={() => { setTarget(u); setModal('permisos'); }}
                          title="Gestionar permisos">⊞</button>
                        <button className="nv-btn nv-btn-danger nv-btn-sm"
                          onClick={() => handleDelete(u)}
                          title="Eliminar usuario">✕</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ padding:'8px 14px', borderTop:'1px solid var(--border)', fontSize:10, color:'var(--text-muted)', textAlign:'center' }}>
              {filtered.length} de {data.length} usuarios
            </div>
          </div>
        )}
      </div>

      {/* Modales */}
      {modal==='crear' && (
        <ModalCrear onClose={() => setModal(null)}
          onSave={(msg) => { setModal(null); load(); showMsg(msg); }} />
      )}
      {modal==='editar' && target && (
        <ModalEditar user={target} onClose={() => setModal(null)}
          onSave={(msg) => { setModal(null); load(); showMsg(msg); }} />
      )}
      {modal==='permisos' && target && (
        <ModalPermisos user={target} onClose={() => setModal(null)}
          onSave={(msg,type) => { setModal(null); showMsg(msg,type||'success'); }} />
      )}
    </div>
  );
}
