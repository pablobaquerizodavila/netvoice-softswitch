import React, { useState, useEffect } from 'react';
import api from '../api';

export default function Extensions() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editExt, setEditExt] = useState(null);
  const [msg, setMsg] = useState(null);
  const [form, setForm] = useState({ id: '', password: '', context: 'internal', allow: 'ulaw,alaw,gsm' });
  const [showPwd, setShowPwd] = useState(false);

  const [regSet, setRegSet] = useState(new Set());

  const load = () => {
    setLoading(true);
    Promise.all([
      api.get('/extensions'),
      api.get('/extensions/status'),
    ]).then(([extRes, statusRes]) => {
      setData(extRes.data.data || []);
      setRegSet(new Set(statusRes.data.registered || []));
    }).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const showMsg = (text, type = 'success') => { setMsg({ text, type }); setTimeout(() => setMsg(null), 3000); };
  const openCreate = () => { setEditExt(null); setForm({ id: '', password: '', context: 'internal', allow: 'ulaw,alaw,gsm' }); setShowForm(true); };
  const openEdit = (ext) => { setEditExt(ext); setForm({ id: ext.id, password: '', context: ext.context, allow: ext.allow }); setShowForm(true); };

  const handleSubmit = async () => {
    if (!editExt && (!form.id || !form.password)) return showMsg('ID y password requeridos', 'error');
    try {
      if (editExt) {
        await api.put('/extensions/' + editExt.id, { password: form.password || undefined, context: form.context, allow: form.allow });
        showMsg('Extensión ' + editExt.id + ' actualizada');
      } else {
        await api.post('/extensions', form);
        showMsg('Extensión ' + form.id + ' creada');
      }
      setShowForm(false); load();
    } catch (e) { showMsg(e.response?.data?.detail || 'Error', 'error'); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Eliminar extensión ' + id + '?')) return;
    try { await api.delete('/extensions/' + id); showMsg('Extensión ' + id + ' eliminada'); load(); }
    catch (e) { showMsg(e.response?.data?.detail || 'Error', 'error'); }
  };

  const filtered = data.filter(e => !search || String(e.id).includes(search) || e.context?.includes(search));
  const codecs = (allow) => (allow || '').split(',').map(c => c.trim()).filter(Boolean);

  if (loading) return <div className="loading">Cargando extensiones...</div>;

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 22 }}>
        <div>
          <h1 className="page-title">Extensiones</h1>
          <p className="page-subtitle">{data.length} extensiones registradas</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={load} className="btn-sm">Actualizar</button>
          <button onClick={openCreate} className="btn-primary">+ Nueva extensión</button>
        </div>
      </div>

      {/* Mensaje */}
      {msg && (
        <div style={{ padding: '10px 16px', borderRadius: 8, marginBottom: 16, fontSize: 13, fontWeight: 500, background: msg.type === 'error' ? 'var(--red-dim)' : 'var(--green-dim)', color: msg.type === 'error' ? 'var(--red)' : 'var(--green)', border: '1px solid ' + (msg.type === 'error' ? 'var(--red)' : 'var(--green)') }}>
          {msg.text}
        </div>
      )}

      {/* Modal */}
      {showForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-mid)', borderRadius: 12, padding: 28, width: 420 }}>
            <h2 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)', marginBottom: 20 }}>
              {editExt ? 'Editar extensión ' + editExt.id : 'Nueva extensión'}
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {!editExt && (
                <div>
                  <label style={lbl}>Número de extensión *</label>
                  <input style={inp} placeholder="ej. 1004" value={form.id} onChange={e => setForm({ ...form, id: e.target.value })} />
                </div>
              )}
              <div>
                <label style={lbl}>{editExt ? 'Nueva password (vacío = no cambiar)' : 'Password SIP *'}</label>
                <div style={{ position: 'relative' }}>
                  <input style={{ ...inp, paddingRight: 42 }} type={showPwd ? 'text' : 'password'} placeholder="MiPass123!" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
                  <button type="button" onClick={() => setShowPwd(!showPwd)}
                    style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4, display: 'flex', alignItems: 'center' }}>
                    {showPwd ? (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" /></svg>
                    ) : (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                    )}
                  </button>
                </div>
              </div>
              <div>
                <label style={lbl}>Contexto</label>
                <select style={inp} value={form.context} onChange={e => setForm({ ...form, context: e.target.value })}>
                  <option value="internal">internal</option>
                  <option value="from-internal">from-internal</option>
                  <option value="default">default</option>
                </select>
              </div>
              <div>
                <label style={lbl}>Codecs</label>
                <select style={inp} value={form.allow} onChange={e => setForm({ ...form, allow: e.target.value })}>
                  <option value="ulaw,alaw,gsm">ulaw, alaw, gsm</option>
                  <option value="ulaw,alaw">ulaw, alaw</option>
                  <option value="ulaw">Solo ulaw</option>
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 24, justifyContent: 'flex-end' }}>
              <button onClick={() => setShowForm(false)} className="btn-sm">Cancelar</button>
              <button onClick={handleSubmit} className="btn-primary">
                {editExt ? 'Guardar cambios' : 'Crear extensión'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Métricas mini */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
        {[
          { label: 'Total', val: data.length, cls: 'm-blue', vcls: 'v-blue' },
          { label: 'Online', val: data.filter(e => regSet.has(String(e.id))).length, cls: 'm-green', vcls: 'v-green' },
          { label: 'Offline', val: data.filter(e => !regSet.has(String(e.id))).length, cls: 'm-red', vcls: 'v-red' },
        ].map(({ label, val, cls, vcls }) => (
          <div key={label} className={`metric-card ${cls}`} style={{ minWidth: 110 }}>
            <div className="metric-label">{label}</div>
            <div className={`metric-value ${vcls}`}>{val}</div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="search-wrap">
        <input className="search-input" placeholder="Buscar por ID o contexto..." value={search} onChange={e => setSearch(e.target.value)} />
        <span className="result-count">{filtered.length} de {data.length}</span>
      </div>

      {/* Cards */}
      <div className="ext-cards-grid">
        {filtered.map((ext, i) => (
          <div key={i} className="ext-card">
            <div className="ext-card-header">
              <div className="ext-avatar-lg">{String(ext.id)}</div>
              <div>
                <div className="ext-card-name">Extensión {ext.id}</div>
                <span className={`status-pill ${regSet.has(String(ext.id)) ? 'pill-green' : 'pill-red'}`}>
                  <span className="dot-sm" />
                  {regSet.has(String(ext.id)) ? 'Registrada' : 'No registrada'}
                </span>
              </div>
            </div>
            <div className="ext-card-body">
              {[{ label: 'ID', value: ext.id }, { label: 'AORs', value: ext.aors }, { label: 'Auth', value: ext.auth }, { label: 'Contexto', value: ext.context }].map(({ label, value }) => (
                <div key={label} className="ext-field">
                  <span className="ext-field-label">{label}</span>
                  <span className="ext-field-value">{value || '—'}</span>
                </div>
              ))}
              <div className="ext-field" style={{ borderBottom: 'none', paddingTop: 8 }}>
                <span className="ext-field-label">Codecs</span>
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  {codecs(ext.allow).map(c => (
                    <span key={c} className="badge badge-blue" style={{ fontFamily: 'var(--font-mono)', fontSize: 10 }}>{c}</span>
                  ))}
                </div>
              </div>
            </div>
            <div className="ext-card-actions">
              <button onClick={() => openEdit(ext)} className="btn-sm" style={{ flex: 1, justifyContent: 'center' }}>Editar</button>
              <button onClick={() => handleDelete(ext.id)} className="btn-sm btn-danger" style={{ flex: 1, justifyContent: 'center' }}>Eliminar</button>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div style={{ gridColumn: '1/-1', textAlign: 'center', color: 'var(--text-muted)', padding: 40, fontSize: 13 }}>Sin extensiones</div>
        )}
      </div>
    </div>
  );
}

const lbl = { fontSize: 11, fontWeight: 500, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4, display: 'block' };
const inp = { width: '100%', padding: '8px 12px', border: '1px solid var(--border-mid)', borderRadius: 7, fontSize: 13, fontFamily: 'var(--font)', color: 'var(--text)', background: 'var(--bg-surface)', outline: 'none', boxSizing: 'border-box' };
