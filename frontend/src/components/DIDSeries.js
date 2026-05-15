import { useState, useEffect, useCallback } from 'react';
import api from '../api';

async function safe(fn) { try { return await fn(); } catch { return null; } }

function Alert({ msg, onClose }) {
  if (!msg) return null;
  const cls = { success:'nv-alert-ok', error:'nv-alert-err', warn:'nv-alert-warn' }[msg.type] || 'nv-alert-ok';
  return (
    <div className={`nv-alert ${cls}`} style={{ marginBottom:14 }}>
      <span style={{ flex:1 }}>{msg.text}</span>
      <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', color:'inherit', fontSize:14 }}>✕</button>
    </div>
  );
}

/* ── Modal Asignar DID ── */
function ModalAsignar({ clientes, trunks, onClose, onSave }) {
  const [form, setForm] = useState({ provincia:'', codigo_area:'', cliente_id:'', trunk_id:'', did_especifico:'' });
  const [busy, setBusy] = useState(false);
  const [err,  setErr]  = useState(null);
  const set = (k,v) => setForm(f => ({...f,[k]:v}));

  const submit = async () => {
    if (!form.cliente_id) return setErr('Selecciona un cliente');
    if (!form.provincia && !form.codigo_area && !form.did_especifico) return setErr('Indica provincia, área o DID específico');
    setBusy(true); setErr(null);
    try {
      const payload = { cliente_id: parseInt(form.cliente_id) };
      if (form.trunk_id)      payload.trunk_id      = parseInt(form.trunk_id);
      if (form.provincia)     payload.provincia     = form.provincia;
      if (form.codigo_area)   payload.codigo_area   = form.codigo_area;
      if (form.did_especifico) payload.did_especifico = form.did_especifico;
      await api.post('/did-asignados/asignar', payload);
      onSave();
    } catch(e) { setErr(e?.response?.data?.detail || 'Error al asignar'); }
    finally { setBusy(false); }
  };

  return (
    <div className="nv-modal-overlay" onClick={e => e.target===e.currentTarget && onClose()}>
      <div className="nv-modal">
        <div className="nv-modal-header">
          <span className="nv-modal-title">Asignar DID a cliente</span>
          <button className="nv-modal-close" onClick={onClose}>✕</button>
        </div>
        {err && <div className="nv-alert nv-alert-err" style={{ marginBottom:14 }}>{err}</div>}

        <div className="nv-form-row">
          <div className="nv-form-field">
            <label className="nv-label">Cliente *</label>
            <select className="nv-select" value={form.cliente_id} onChange={e => set('cliente_id',e.target.value)}>
              <option value="">Seleccionar cliente...</option>
              {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
          </div>
          <div className="nv-form-field">
            <label className="nv-label">Trunk SIP</label>
            <select className="nv-select" value={form.trunk_id} onChange={e => set('trunk_id',e.target.value)}>
              <option value="">Sin trunk</option>
              {trunks.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
            </select>
          </div>
        </div>

        <div style={{ background:'var(--bg-raised)', borderRadius:'var(--r-md)', padding:'12px 14px', marginBottom:14 }}>
          <div style={{ fontSize:10, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'.07em', marginBottom:10 }}>
            Selección de número (una opción)
          </div>
          <div className="nv-form-row">
            <div className="nv-form-field">
              <label className="nv-label">Provincia</label>
              <select className="nv-select" value={form.provincia} onChange={e => set('provincia',e.target.value)}>
                <option value="">Automático</option>
                {['PICHINCHA','GUAYAS','AZUAY','MANABI','LOJA','TUNGURAHUA','IMBABURA','CHIMBORAZO','EL ORO','LOS RIOS'].map(p =>
                  <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div className="nv-form-field">
              <label className="nv-label">Código de área</label>
              <input className="nv-input" placeholder="ej: 2, 4, 7" value={form.codigo_area}
                onChange={e => set('codigo_area',e.target.value)} />
            </div>
          </div>
          <div className="nv-form-field">
            <label className="nv-label">DID específico (opcional)</label>
            <input className="nv-input" placeholder="ej: 5932123456" value={form.did_especifico}
              onChange={e => set('did_especifico',e.target.value)}
              style={{ fontFamily:'var(--font-mono)' }} />
          </div>
        </div>

        <div className="nv-modal-footer">
          <button className="nv-btn nv-btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="nv-btn nv-btn-primary" onClick={submit} disabled={busy}>
            {busy ? <span className="nv-spinner" /> : '+ Asignar DID'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Modal Agregar Rango ── */
function ModalRango({ onClose, onSave }) {
  const [form, setForm] = useState({ provincia:'', cod_provincia:'', codigo_area:'', serie_inicio:'', serie_fin:'', cantidad_total:'', resolucion_arcotel:'', fecha_resolucion:'' });
  const [busy, setBusy] = useState(false);
  const [err,  setErr]  = useState(null);
  const set = (k,v) => setForm(f => ({...f,[k]:v}));

  const submit = async () => {
    if (!form.provincia || !form.serie_inicio || !form.serie_fin) return setErr('Provincia, serie inicio y fin son requeridos');
    setBusy(true); setErr(null);
    try {
      await api.post('/did-ranges', {
        ...form,
        cantidad_total: parseInt(form.cantidad_total) || (parseInt(form.serie_fin) - parseInt(form.serie_inicio) + 1),
      });
      onSave();
    } catch(e) { setErr(e?.response?.data?.detail || 'Error al crear rango'); }
    finally { setBusy(false); }
  };

  return (
    <div className="nv-modal-overlay" onClick={e => e.target===e.currentTarget && onClose()}>
      <div className="nv-modal" style={{ maxWidth:580 }}>
        <div className="nv-modal-header">
          <span className="nv-modal-title">Agregar rango DID (ARCOTEL)</span>
          <button className="nv-modal-close" onClick={onClose}>✕</button>
        </div>
        {err && <div className="nv-alert nv-alert-err" style={{ marginBottom:14 }}>{err}</div>}

        <div className="nv-form-row">
          <div className="nv-form-field">
            <label className="nv-label">Provincia *</label>
            <input className="nv-input" placeholder="ej: PICHINCHA" value={form.provincia}
              onChange={e => set('provincia',e.target.value.toUpperCase())} />
          </div>
          <div className="nv-form-field">
            <label className="nv-label">Cód. provincia</label>
            <input className="nv-input" placeholder="ej: 17" value={form.cod_provincia}
              onChange={e => set('cod_provincia',e.target.value)} />
          </div>
          <div className="nv-form-field">
            <label className="nv-label">Código de área</label>
            <input className="nv-input" placeholder="ej: 2" value={form.codigo_area}
              onChange={e => set('codigo_area',e.target.value)} />
          </div>
        </div>
        <div className="nv-form-row">
          <div className="nv-form-field">
            <label className="nv-label">Serie inicio *</label>
            <input className="nv-input" placeholder="ej: 2000000" value={form.serie_inicio}
              onChange={e => set('serie_inicio',e.target.value)}
              style={{ fontFamily:'var(--font-mono)' }} />
          </div>
          <div className="nv-form-field">
            <label className="nv-label">Serie fin *</label>
            <input className="nv-input" placeholder="ej: 2999999" value={form.serie_fin}
              onChange={e => set('serie_fin',e.target.value)}
              style={{ fontFamily:'var(--font-mono)' }} />
          </div>
          <div className="nv-form-field">
            <label className="nv-label">Cantidad total</label>
            <input className="nv-input" placeholder="Auto-calculado" value={form.cantidad_total}
              onChange={e => set('cantidad_total',e.target.value)} />
          </div>
        </div>
        <div className="nv-form-row">
          <div className="nv-form-field">
            <label className="nv-label">Resolución ARCOTEL</label>
            <input className="nv-input" placeholder="ej: ARCOTEL-2024-001" value={form.resolucion_arcotel}
              onChange={e => set('resolucion_arcotel',e.target.value)} />
          </div>
          <div className="nv-form-field">
            <label className="nv-label">Fecha resolución</label>
            <input className="nv-input" type="date" value={form.fecha_resolucion}
              onChange={e => set('fecha_resolucion',e.target.value)} />
          </div>
        </div>

        <div className="nv-modal-footer">
          <button className="nv-btn nv-btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="nv-btn nv-btn-primary" onClick={submit} disabled={busy}>
            {busy ? <span className="nv-spinner" /> : '+ Agregar rango'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Componente principal ── */
export default function DIDSeries() {
  const [ranges,    setRanges]    = useState([]);
  const [asignados, setAsignados] = useState([]);
  const [clientes,  setClientes]  = useState([]);
  const [trunks,    setTrunks]    = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [tab,       setTab]       = useState('rangos');
  const [search,    setSearch]    = useState('');
  const [modal,     setModal]     = useState(null);
  const [msg,       setMsg]       = useState(null);

  const showMsg = (text, type='success') => { setMsg({text,type}); setTimeout(()=>setMsg(null),4000); };

  const load = useCallback(async () => {
    setLoading(true);
    const [r,a,c,t] = await Promise.all([
      safe(() => api.get('/did-ranges')),
      safe(() => api.get('/did-asignados')),
      safe(() => api.get('/clientes?limit=500')),
      safe(() => api.get('/trunks')),
    ]);
    setRanges(r?.data?.data || []);
    setAsignados(a?.data?.data || []);
    setClientes(c?.data?.data || []);
    setTrunks(t?.data?.data || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const liberarDid = async (id, did) => {
    if (!window.confirm(`¿Liberar el DID ${did}?`)) return;
    try {
      await api.delete(`/did-asignados/${id}`);
      showMsg(`DID ${did} liberado`);
      load();
    } catch(e) { showMsg(e?.response?.data?.detail || 'Error al liberar', 'error'); }
  };

  // KPIs
  const totalDIDs   = ranges.reduce((s,r) => s + (r.cantidad_total||0), 0);
  const usados      = ranges.reduce((s,r) => s + (r.cantidad_usada||0), 0);
  const disponibles = totalDIDs - usados;
  const ocupacion   = totalDIDs > 0 ? ((usados/totalDIDs)*100).toFixed(1) : 0;

  // Filtro asignados
  const filtAsig = asignados.filter(a => {
    const q = search.toLowerCase();
    return !q || a.did_completo?.includes(q) || a.cliente_nombre?.toLowerCase().includes(q);
  });

  return (
    <div>
      {/* Header */}
      <div className="nv-page-header">
        <div>
          <div className="nv-page-title">DID / Numeración</div>
          <div className="nv-page-sub">Gestión de rangos ARCOTEL y asignación de números</div>
        </div>
        <div className="nv-page-actions">
          <button className="nv-btn nv-btn-secondary nv-btn-sm" onClick={load} disabled={loading}>
            {loading ? <span className="nv-spinner" /> : '↺'} Actualizar
          </button>
          <button className="nv-btn nv-btn-ghost" onClick={() => setModal('rango')}>
            + Rango ARCOTEL
          </button>
          <button className="nv-btn nv-btn-primary" onClick={() => setModal('asignar')}>
            + Asignar DID
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="nv-kpi-grid" style={{ marginBottom:16 }}>
        <div className="nv-kpi">
          <div className="nv-kpi-label">Total DIDs</div>
          <div className="nv-kpi-value" style={{ color:'var(--brand)' }}>{totalDIDs.toLocaleString()}</div>
          <div className="nv-kpi-sub">{ranges.length} rangos</div>
        </div>
        <div className="nv-kpi">
          <div className="nv-kpi-label">Asignados</div>
          <div className="nv-kpi-value" style={{ color:'var(--warning)' }}>{usados.toLocaleString()}</div>
          <div className="nv-kpi-sub">{ocupacion}% ocupación</div>
        </div>
        <div className="nv-kpi">
          <div className="nv-kpi-label">Disponibles</div>
          <div className="nv-kpi-value" style={{ color:'var(--success)' }}>{disponibles.toLocaleString()}</div>
          <div className="nv-kpi-sub">Libres para asignar</div>
        </div>
        <div className="nv-kpi">
          <div className="nv-kpi-label">Clientes con DID</div>
          <div className="nv-kpi-value" style={{ color:'var(--info)' }}>
            {new Set(asignados.map(a=>a.cliente_id)).size}
          </div>
          <div className="nv-kpi-sub">De {clientes.length} totales</div>
        </div>
      </div>

      <Alert msg={msg} onClose={() => setMsg(null)} />

      {/* Tabs */}
      <div className="nv-tabs">
        {[['rangos','Rangos ARCOTEL'],['asignados','DIDs asignados']].map(([k,l]) => (
          <div key={k} className={`nv-tab${tab===k?' active':''}`} onClick={() => setTab(k)}>{l}</div>
        ))}
      </div>

      {/* ── Tab Rangos ── */}
      {tab === 'rangos' && (
        <div className="nv-card" style={{ padding:0 }}>
          {loading ? (
            <div className="nv-loading"><span className="nv-spinner" /></div>
          ) : ranges.length === 0 ? (
            <div style={{ textAlign:'center', padding:'48px 20px' }}>
              <div style={{ fontSize:32, opacity:.2, marginBottom:12 }}>◉</div>
              <div style={{ fontSize:13, color:'var(--text-muted)', marginBottom:16 }}>Sin rangos DID registrados</div>
              <button className="nv-btn nv-btn-primary" onClick={() => setModal('rango')}>+ Agregar rango ARCOTEL</button>
            </div>
          ) : (
            <div className="nv-table-wrap">
              <table className="nv-table">
                <thead><tr>
                  <th>Provincia</th><th>Área</th><th>Serie inicio</th><th>Serie fin</th>
                  <th>Total</th><th>Usados</th><th>Disponibles</th><th>Ocupación</th><th>Resolución</th>
                </tr></thead>
                <tbody>
                  {ranges.map(r => {
                    const disp = (r.cantidad_total||0) - (r.cantidad_usada||0);
                    const pct  = r.cantidad_total > 0 ? ((r.cantidad_usada/r.cantidad_total)*100).toFixed(0) : 0;
                    return (
                      <tr key={r.id}>
                        <td style={{ fontWeight:500, color:'var(--text-primary)' }}>{r.provincia}</td>
                        <td className="mono">{r.codigo_area}</td>
                        <td className="mono">{r.serie_inicio}</td>
                        <td className="mono">{r.serie_fin}</td>
                        <td className="mono">{(r.cantidad_total||0).toLocaleString()}</td>
                        <td className="mono" style={{ color:'var(--warning)' }}>{(r.cantidad_usada||0).toLocaleString()}</td>
                        <td className="mono" style={{ color:'var(--success)' }}>{disp.toLocaleString()}</td>
                        <td>
                          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                            <div className="nv-progress" style={{ flex:1, minWidth:60 }}>
                              <div className="nv-progress-bar" style={{
                                width:`${pct}%`,
                                background: pct > 80 ? 'var(--danger)' : pct > 50 ? 'var(--warning)' : 'var(--success)'
                              }} />
                            </div>
                            <span style={{ fontSize:10, fontFamily:'var(--font-mono)', color:'var(--text-muted)', minWidth:28 }}>{pct}%</span>
                          </div>
                        </td>
                        <td style={{ fontSize:10, color:'var(--text-muted)' }}>{r.resolucion_arcotel || '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Tab Asignados ── */}
      {tab === 'asignados' && (
        <div className="nv-card" style={{ padding:0 }}>
          <div style={{ padding:'10px 14px', borderBottom:'1px solid var(--border)' }}>
            <div className="nv-search">
              <span style={{ color:'var(--text-muted)', fontSize:12 }}>⌕</span>
              <input placeholder="Buscar por número o cliente..."
                value={search} onChange={e => setSearch(e.target.value)} />
              {search && <button onClick={() => setSearch('')}
                style={{ background:'none', border:'none', color:'var(--text-muted)', cursor:'pointer' }}>✕</button>}
            </div>
          </div>
          {loading ? (
            <div className="nv-loading"><span className="nv-spinner" /></div>
          ) : filtAsig.length === 0 ? (
            <div style={{ textAlign:'center', padding:'48px 20px' }}>
              <div style={{ fontSize:32, opacity:.2, marginBottom:12 }}>◉</div>
              <div style={{ fontSize:13, color:'var(--text-muted)', marginBottom:16 }}>
                {search ? 'Sin resultados' : 'Sin DIDs asignados aún'}
              </div>
              {!search && <button className="nv-btn nv-btn-primary" onClick={() => setModal('asignar')}>+ Asignar primer DID</button>}
            </div>
          ) : (
            <div className="nv-table-wrap">
              <table className="nv-table">
                <thead><tr>
                  <th>DID</th><th>Cliente</th><th>Trunk</th><th>Provincia</th><th>Estado</th><th>Asignado</th><th></th>
                </tr></thead>
                <tbody>
                  {filtAsig.map(a => (
                    <tr key={a.id}>
                      <td className="mono" style={{ color:'var(--brand)', fontWeight:600 }}>{a.did_completo}</td>
                      <td style={{ color:'var(--text-primary)', fontWeight:500 }}>{a.cliente_nombre || '—'}</td>
                      <td style={{ fontSize:11, color:'var(--text-muted)' }}>{a.trunk_nombre || '—'}</td>
                      <td style={{ fontSize:11, color:'var(--text-muted)' }}>{a.provincia || '—'}</td>
                      <td>
                        <span className={`nv-badge ${a.estado==='asignado'?'nv-badge-ok':'nv-badge-muted'}`}>
                          <span className="dot" />{a.estado}
                        </span>
                      </td>
                      <td style={{ fontSize:10, color:'var(--text-muted)' }}>
                        {a.fecha_asignacion ? new Date(a.fecha_asignacion).toLocaleDateString('es-EC',{day:'2-digit',month:'short',year:'numeric'}) : '—'}
                      </td>
                      <td>
                        <button className="nv-btn nv-btn-danger nv-btn-sm"
                          onClick={() => liberarDid(a.id, a.did_completo)}
                          title="Liberar DID">✕ Liberar</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div style={{ padding:'8px 14px', borderTop:'1px solid var(--border)', fontSize:10, color:'var(--text-muted)', textAlign:'center' }}>
                {filtAsig.length} DIDs asignados
              </div>
            </div>
          )}
        </div>
      )}

      {modal === 'asignar' && (
        <ModalAsignar clientes={clientes} trunks={trunks}
          onClose={() => setModal(null)}
          onSave={() => { setModal(null); load(); showMsg('DID asignado correctamente'); }} />
      )}
      {modal === 'rango' && (
        <ModalRango
          onClose={() => setModal(null)}
          onSave={() => { setModal(null); load(); showMsg('Rango ARCOTEL agregado'); }} />
      )}
    </div>
  );
}
