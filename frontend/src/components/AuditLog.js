import { useState, useEffect, useCallback } from 'react';
import api from '../api';

const MODULE_COLORS = {
  extensiones: 'pill-blue',
  usuarios:    'pill-green',
  clientes:    'pill-amber',
  trunks:      'pill-red',
  auth:        'pill-purple',
};

const ACTION_ICONS = {
  login:               '🔐',
  logout:              '🚪',
  crear_extension:     '➕',
  editar_extension:    '✏️',
  eliminar_extension:  '🗑️',
  crear_usuario:       '👤',
  editar_usuario:      '✏️',
  crear_cliente:       '🏢',
  eliminar_cliente:    '🗑️',
  crear_trunk:         '📡',
  eliminar_trunk:      '🗑️',
  actualizar_permisos: '🔑',
};

export default function AuditLog() {
  const [data, setData]         = useState([]);
  const [loading, setLoading]   = useState(true);
  const [filterMod, setFilterMod]   = useState('');
  const [filterUser, setFilterUser] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(true);

  const [search, setSearch] = useState('');

  const load = useCallback(() => {
    const params = new URLSearchParams({ limit: 200 });
    if (filterMod)  params.append('modulo',   filterMod);
    if (search) params.append('username', search);
    api.get(`/audit-log?${params}`).then(r => {
      setData(r.data.data || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [filterMod, filterUser]);

  useEffect(() => { load(); }, [filterMod]);  // solo recarga al cambiar módulo

  useEffect(() => {
    if (!autoRefresh) return;
    const t = setInterval(load, 15000);
    return () => clearInterval(t);
  }, [load, autoRefresh]);

  const fmt = (dt) => {
    if (!dt) return '—';
    return new Date(dt).toLocaleString('es-EC', {
      day:'2-digit', month:'2-digit', year:'numeric',
      hour:'2-digit', minute:'2-digit', second:'2-digit'
    });
  };

  const modules = ['', 'extensiones', 'usuarios', 'clientes', 'trunks', 'auth'];

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:24 }}>
        <div>
          <h1 className="page-title">Auditoría</h1>
          <p className="page-subtitle">Registro de acciones de usuarios en tiempo real</p>
        </div>
        <div style={{ display:'flex', gap:10, alignItems:'center' }}>
          <label style={{ fontSize:12, color:'var(--text-muted)', display:'flex', alignItems:'center', gap:6 }}>
            <input type="checkbox" checked={autoRefresh} onChange={e => setAutoRefresh(e.target.checked)} />
            Auto (15s)
          </label>
          <button onClick={load} className="btn-sm">↻ Actualizar</button>
        </div>
      </div>

      {/* Filtros */}
      <div style={{ display:'flex', gap:12, marginBottom:20, flexWrap:'wrap' }}>
        <select
          value={filterMod}
          onChange={e => setFilterMod(e.target.value)}
          style={{ background:'var(--bg-panel)', border:'1px solid var(--border)', borderRadius:8,
            padding:'8px 12px', fontSize:13, color:'var(--text)', minWidth:160 }}
        >
          {modules.map(m => <option key={m} value={m}>{m || 'Todos los módulos'}</option>)}
        </select>
        <input
          type="text"
          placeholder="Buscar usuario..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && load()}
          style={{ background:'var(--bg-panel)', border:'1px solid var(--border)', borderRadius:8,
            padding:'8px 12px', fontSize:13, color:'var(--text)', minWidth:200 }}
        />
        <button onClick={load}
          style={{ background:'var(--accent)', border:'none', borderRadius:8,
            padding:'8px 16px', fontSize:13, color:'#fff', cursor:'pointer', fontWeight:500 }}>
          Buscar
        </button>
        <button onClick={() => { setFilterMod(''); setSearch(''); setTimeout(load, 100); }}
          style={{ background:'var(--bg-surface)', border:'1px solid var(--border)', borderRadius:8,
            padding:'8px 14px', fontSize:13, color:'var(--text-muted)', cursor:'pointer' }}>
          Limpiar
        </button>
        <span style={{ fontSize:12, color:'var(--text-muted)', alignSelf:'center', marginLeft:'auto' }}>
          {data.length} registros
        </span>
      </div>

      {/* Stats */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:24 }}>
        {['superadmin','admin','viewer','extensiones'].map(mod => {
          const count = mod === 'superadmin' || mod === 'admin' || mod === 'viewer' ? data.filter(r => r.user_role === mod).length : data.filter(r => r.accion?.includes(mod.slice(0,-1))).length;
          return (
            <div key={mod} style={{ background:'var(--bg-panel)', border:'1px solid var(--border)',
              borderRadius:10, padding:'12px 16px' }}>
              <div style={{ fontSize:11, color:'var(--text-muted)', textTransform:'uppercase',
                letterSpacing:1, marginBottom:4 }}>{mod}</div>
              <div style={{ fontSize:22, fontWeight:600, color:'var(--accent)' }}>{count}</div>
            </div>
          );
        })}
      </div>

      {/* Tabla */}
      <div className="section-card">
        <div className="section-header">
          <div className="section-title">Registro de eventos</div>
        </div>
        {loading ? (
          <div className="loading">Cargando...</div>
        ) : data.length === 0 ? (
          <div style={{ textAlign:'center', padding:40, color:'var(--text-muted)' }}>Sin registros</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Fecha y hora</th>
                <th>Usuario</th>
                <th>Rol</th>
                <th>Acción</th>
                <th>Detalle</th>
                <th>IP</th>
              </tr>
            </thead>
            <tbody>
              {data.map((row, i) => (
                <tr key={i}>
                  <td className="td-mono" style={{ fontSize:11, whiteSpace:'nowrap' }}>{fmt(row.created_at)}</td>
                  <td>
                    <span style={{ fontWeight:600, color:'var(--text)' }}>{row.nombre_display || row.username}</span>
                    <div style={{ fontSize:10, color:'var(--text-muted)', fontFamily:'var(--font-mono)' }}>@{row.username}</div>
                  </td>
                  <td>
                    <span className={`status-pill ${
                      row.user_role === 'superadmin' ? 'pill-purple' :
                      row.user_role === 'admin' ? 'pill-blue' : 'pill-gray'
                    }`}>
                      {row.user_role || '—'}
                    </span>
                  </td>
                  <td style={{ fontFamily:'var(--font-mono)', fontSize:12 }}>
                    {ACTION_ICONS[row.accion] || '•'} {row.accion}
                  </td>
                  <td style={{ fontSize:12, color:'var(--text-sec)', maxWidth:280,
                    overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                    {row.detalle}
                  </td>
                  <td className="td-mono" style={{ fontSize:11 }}>{row.ip}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
