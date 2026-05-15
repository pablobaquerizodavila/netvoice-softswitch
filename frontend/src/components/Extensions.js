import React, { useState, useEffect, useCallback } from 'react';
import api from '../api';

async function safe(fn) { try { return await fn(); } catch { return null; } }

const CODECS = ['ulaw','alaw','gsm','g722','g729','opus','vp8','h264'];
const CONTEXTS = ['internal','from-client','from-external'];

function Alert({ msg, onClose }) {
  if (!msg) return null;
  const cls = msg.type === 'error' ? 'nv-alert-err' : msg.type === 'warn' ? 'nv-alert-warn' : 'nv-alert-ok';
  return (
    <div className={`nv-alert ${cls}`} style={{ marginBottom:14 }}>
      <span style={{ flex:1 }}>{msg.text}</span>
      <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', color:'inherit', fontSize:14 }}>✕</button>
    </div>
  );
}

function ExtModal({ ext, onClose, onSave }) {
  const isEdit = !!ext?.id;
  const [form, setForm] = useState({
    id:       ext?.id       || '',
    password: '',
    context:  ext?.context  || 'internal',
    allow:    ext?.allow    || 'ulaw,alaw,gsm',
  });
  const [busy, setBusy] = useState(false);
  const [err,  setErr]  = useState(null);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const toggleCodec = (codec) => {
    const current = form.allow.split(',').filter(Boolean);
    const next = current.includes(codec)
      ? current.filter(c => c !== codec)
      : [...current, codec];
    set('allow', next.join(',') || 'ulaw');
  };

  const submit = async () => {
    if (!isEdit && !form.id) return setErr('El ID de extensión es requerido');
    if (!isEdit && !form.password) return setErr('La contraseña es requerida');
    setBusy(true); setErr(null);
    try {
      if (isEdit) {
        const payload = { context: form.context, allow: form.allow };
        if (form.password) payload.password = form.password;
        await api.put(`/extensions/${ext.id}`, payload);
      } else {
        await api.post('/extensions', form);
      }
      onSave();
    } catch (e) {
      setErr(e?.response?.data?.detail || 'Error al guardar');
    } finally { setBusy(false); }
  };

  return (
    <div className="nv-modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="nv-modal">
        <div className="nv-modal-header">
          <span className="nv-modal-title">{isEdit ? `Editar extensión ${ext.id}` : 'Nueva extensión SIP'}</span>
          <button className="nv-modal-close" onClick={onClose}>✕</button>
        </div>

        {err && <div className="nv-alert nv-alert-err" style={{ marginBottom:14 }}>{err}</div>}

        <div className="nv-form-row">
          <div className="nv-form-field">
            <label className="nv-label">ID / Extensión</label>
            <input className="nv-input" value={form.id} onChange={e => set('id', e.target.value)}
              disabled={isEdit} placeholder="ej: 1001" />
          </div>
          <div className="nv-form-field">
            <label className="nv-label">{isEdit ? 'Nueva contraseña (opcional)' : 'Contraseña SIP'}</label>
            <input className="nv-input" type="password" value={form.password}
              onChange={e => set('password', e.target.value)}
              placeholder={isEdit ? 'Dejar vacío para no cambiar' : 'Contraseña segura'} />
          </div>
        </div>

        <div className="nv-form-row">
          <div className="nv-form-field">
            <label className="nv-label">Contexto Asterisk</label>
            <select className="nv-select" value={form.context} onChange={e => set('context', e.target.value)}>
              {CONTEXTS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>

        <div className="nv-form-field" style={{ marginBottom:16 }}>
          <label className="nv-label">Codecs permitidos</label>
          <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginTop:6 }}>
            {CODECS.map(codec => {
              const active = form.allow.split(',').includes(codec);
              return (
                <button key={codec} type="button"
                  onClick={() => toggleCodec(codec)}
                  style={{
                    padding:'3px 10px', borderRadius:'var(--r-sm)', fontSize:11, fontWeight:600,
                    cursor:'pointer', fontFamily:'var(--font-mono)',
                    background: active ? 'var(--brand-subtle)' : 'var(--bg-raised)',
                    color: active ? 'var(--brand)' : 'var(--text-muted)',
                    border: `1px solid ${active ? 'var(--brand)' : 'var(--border)'}`,
                    transition:'all var(--t)',
                  }}
                >{codec}</button>
              );
            })}
          </div>
          <div style={{ fontSize:10, color:'var(--text-muted)', marginTop:4, fontFamily:'var(--font-mono)' }}>
            {form.allow || 'ninguno'}
          </div>
        </div>

        <div className="nv-modal-footer">
          <button className="nv-btn nv-btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="nv-btn nv-btn-primary" onClick={submit} disabled={busy}>
            {busy ? <span className="nv-spinner" /> : (isEdit ? '✓ Guardar cambios' : '+ Crear extensión')}
          </button>
        </div>
      </div>
    </div>
  );
}

function ExtCard({ ext, registered, onEdit, onDelete }) {
  return (
    <div style={{
      background:'var(--bg-surface)', border:'1px solid var(--border)',
      borderRadius:'var(--r-md)', padding:'14px 16px',
      transition:'border-color var(--t), background var(--t)',
      borderLeft: `3px solid ${registered ? 'var(--success)' : 'var(--border)'}`,
    }}
      onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--border-active)'}
      onMouseLeave={e => e.currentTarget.style.borderColor = registered ? 'var(--success)' : 'var(--border)'}
    >
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:10 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{
            width:38, height:38, borderRadius:'var(--r-sm)',
            background: registered ? 'var(--success-bg)' : 'var(--bg-raised)',
            display:'flex', alignItems:'center', justifyContent:'center',
            fontFamily:'var(--font-mono)', fontSize:13, fontWeight:700,
            color: registered ? 'var(--success)' : 'var(--text-muted)',
            flexShrink:0,
          }}>
            {String(ext.id).slice(-4)}
          </div>
          <div>
            <div style={{ fontSize:13, fontWeight:600, color:'var(--text-primary)' }}>
              Extensión {ext.id}
            </div>
            <div style={{ fontSize:10, color:'var(--text-muted)', marginTop:1 }}>
              {ext.context}
            </div>
          </div>
        </div>
        <span className={`nv-badge ${registered ? 'nv-badge-ok' : 'nv-badge-muted'}`}>
          <span className="dot" />
          {registered ? 'Registrada' : 'Sin registro'}
        </span>
      </div>

      {/* Codecs */}
      <div style={{ display:'flex', flexWrap:'wrap', gap:4, marginBottom:12 }}>
        {(ext.allow || '').split(',').filter(Boolean).map(c => (
          <span key={c} style={{
            fontSize:9, fontWeight:700, padding:'1px 6px',
            background:'var(--bg-raised)', color:'var(--text-muted)',
            borderRadius:3, fontFamily:'var(--font-mono)',
            border:'1px solid var(--border)',
          }}>{c}</span>
        ))}
      </div>

      {/* Acciones */}
      <div style={{ display:'flex', gap:6 }}>
        <button className="nv-btn nv-btn-ghost nv-btn-sm" style={{ flex:1 }}
          onClick={() => onEdit(ext)}>
          ✎ Editar
        </button>
        <button className="nv-btn nv-btn-danger nv-btn-sm"
          onClick={() => onDelete(ext)}>
          ✕
        </button>
      </div>
    </div>
  );
}

export default function Extensions() {
  const [data,    setData]    = useState([]);
  const [regSet,  setRegSet]  = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState('');
  const [filter,  setFilter]  = useState('all');
  const [modal,   setModal]   = useState(null); // null | 'create' | ext object
  const [msg,     setMsg]     = useState(null);
  const [delConf, setDelConf] = useState(null);

  const showMsg = (text, type='success') => {
    setMsg({ text, type });
    setTimeout(() => setMsg(null), 4000);
  };

  const load = useCallback(async () => {
    setLoading(true);
    const [extRes, statusRes] = await Promise.all([
      safe(() => api.get('/extensions')),
      safe(() => api.get('/extensions/status')),
    ]);
    setData(extRes?.data?.data || []);
    setRegSet(new Set(statusRes?.data?.registered || []));
    setLoading(false);
  }, []);

  useEffect(() => { load(); const iv = setInterval(load, 20000); return () => clearInterval(iv); }, [load]);

  const handleDelete = async (ext) => {
    try {
      await api.delete(`/extensions/${ext.id}`);
      showMsg(`Extensión ${ext.id} eliminada`);
      load();
    } catch (e) {
      showMsg(e?.response?.data?.detail || 'Error al eliminar', 'error');
    }
    setDelConf(null);
  };

  const filtered = data.filter(e => {
    const q = search.toLowerCase();
    const matchQ = !q || String(e.id).includes(q) || e.context?.includes(q) || e.allow?.includes(q);
    const matchF = filter === 'all'
      || (filter === 'registered' && regSet.has(String(e.id)))
      || (filter === 'unregistered' && !regSet.has(String(e.id)));
    return matchQ && matchF;
  });

  const registered = data.filter(e => regSet.has(String(e.id))).length;

  return (
    <div>
      {/* Header */}
      <div className="nv-page-header">
        <div>
          <div className="nv-page-title">Extensiones SIP</div>
          <div className="nv-page-sub">
            {data.length} extensiones · {registered} registradas · auto-refresh 20s
          </div>
        </div>
        <div className="nv-page-actions">
          <button className="nv-btn nv-btn-secondary nv-btn-sm" onClick={load} disabled={loading}>
            {loading ? <span className="nv-spinner" /> : '↺'} Actualizar
          </button>
          <button className="nv-btn nv-btn-primary" onClick={() => setModal('create')}>
            + Nueva extensión
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="nv-kpi-grid" style={{ gridTemplateColumns:'repeat(auto-fill,minmax(140px,1fr))', marginBottom:16 }}>
        {[
          { label:'Total',         value:data.length,               iconBg:'var(--brand-subtle)',  color:'var(--brand)'   },
          { label:'Registradas',   value:registered,                iconBg:'var(--success-bg)',    color:'var(--success)' },
          { label:'Sin registro',  value:data.length - registered,  iconBg:'var(--bg-raised)',     color:'var(--text-muted)' },
          { label:'Contexto int.', value:data.filter(e=>e.context==='internal').length, iconBg:'var(--info-bg)', color:'var(--info)' },
        ].map(({ label, value, iconBg, color }) => (
          <div key={label} className="nv-kpi">
            <div className="nv-kpi-label">{label}</div>
            <div className="nv-kpi-value" style={{ fontSize:22, color }}>{value}</div>
          </div>
        ))}
      </div>

      <Alert msg={msg} onClose={() => setMsg(null)} />

      {/* Filtros + búsqueda */}
      <div style={{ display:'flex', gap:10, marginBottom:16, flexWrap:'wrap', alignItems:'center' }}>
        <div className="nv-search" style={{ flex:'1', minWidth:200 }}>
          <span style={{ color:'var(--text-muted)', fontSize:12 }}>⌕</span>
          <input placeholder="Buscar por ID, contexto o codec..."
            value={search} onChange={e => setSearch(e.target.value)} />
          {search && <button onClick={() => setSearch('')}
            style={{ background:'none', border:'none', color:'var(--text-muted)', cursor:'pointer' }}>✕</button>}
        </div>
        <div style={{ display:'flex', gap:4 }}>
          {[['all','Todas'],['registered','Registradas'],['unregistered','Sin registro']].map(([k,l]) => (
            <button key={k} className={`nv-btn nv-btn-sm ${filter===k?'nv-btn-secondary':'nv-btn-ghost'}`}
              onClick={() => setFilter(k)}>{l}</button>
          ))}
        </div>
      </div>

      {/* Grid de extensiones */}
      {loading && !data.length ? (
        <div className="nv-loading"><span className="nv-spinner" /><span>Cargando extensiones...</span></div>
      ) : filtered.length === 0 ? (
        <div className="nv-card" style={{ textAlign:'center', padding:'48px 20px' }}>
          <div style={{ fontSize:32, opacity:.2, marginBottom:12 }}>◎</div>
          <div style={{ fontSize:13, color:'var(--text-muted)' }}>
            {search ? 'Sin resultados para la búsqueda' : 'Sin extensiones registradas'}
          </div>
          {!search && (
            <button className="nv-btn nv-btn-primary" style={{ marginTop:16 }}
              onClick={() => setModal('create')}>+ Crear primera extensión</button>
          )}
        </div>
      ) : (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))', gap:12 }}>
          {filtered.map(ext => (
            <ExtCard key={ext.id} ext={ext}
              registered={regSet.has(String(ext.id))}
              onEdit={e => setModal(e)}
              onDelete={e => setDelConf(e)} />
          ))}
        </div>
      )}

      {/* Modal crear/editar */}
      {modal && (
        <ExtModal
          ext={modal === 'create' ? null : modal}
          onClose={() => setModal(null)}
          onSave={() => { setModal(null); load(); showMsg(modal === 'create' ? 'Extensión creada' : 'Extensión actualizada'); }}
        />
      )}

      {/* Confirm delete */}
      {delConf && (
        <div className="nv-modal-overlay" onClick={() => setDelConf(null)}>
          <div className="nv-modal" style={{ maxWidth:380 }} onClick={e => e.stopPropagation()}>
            <div className="nv-modal-header">
              <span className="nv-modal-title">Eliminar extensión</span>
              <button className="nv-modal-close" onClick={() => setDelConf(null)}>✕</button>
            </div>
            <p style={{ fontSize:13, color:'var(--text-secondary)', lineHeight:1.6 }}>
              ¿Eliminar la extensión <span style={{ fontFamily:'var(--font-mono)', color:'var(--danger)' }}>{delConf.id}</span>?
              Esta acción eliminará el endpoint, auth y AOR de Asterisk.
            </p>
            <div className="nv-modal-footer">
              <button className="nv-btn nv-btn-ghost" onClick={() => setDelConf(null)}>Cancelar</button>
              <button className="nv-btn nv-btn-danger" onClick={() => handleDelete(delConf)}>
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
