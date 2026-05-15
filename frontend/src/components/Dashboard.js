import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import api from '../api';
const API = '';



function fmtDate(raw) {
  if (!raw) return '—';
  const d = new Date(raw.replace('T', ' ').replace(' ', 'T'));
  if (isNaN(d)) return raw;
  return d.toLocaleDateString('es-EC', { day: '2-digit', month: 'short', year: 'numeric' })
    + ' ' + d.toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' });
}

export default function Dashboard() {
  const [cdr, setCdr] = useState([]);
  const [extensions, setExtensions] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const [regSet, setRegSet] = useState(new Set());

  useEffect(() => {
    Promise.all([
      axios.get('/api/cdr'),
      api.get('/extensions'),
      api.get('/extensions/status'),
    ]).then(([cdrRes, extRes, statusRes]) => {
      setCdr(cdrRes.data.data || []);
      setExtensions(extRes.data.data || []);
      setRegSet(new Set(statusRes.data.registered || []));
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const answered = cdr.filter(r => r.disposition === 'ANSWERED').length;
  const avgDuration = cdr.length > 0
    ? Math.round(cdr.reduce((a, r) => a + (r.billsec || 0), 0) / cdr.length)
    : 0;

  if (loading) return <div className="loading">Cargando datos...</div>;

  return (
    <div>
      {/* Métricas */}
      <div className="metrics-grid">
        <div className="metric-card m-blue">
          <div className="metric-label">Llamadas registradas</div>
          <div className="metric-value v-blue">{cdr.length}</div>
          <div className="metric-sub">↑ {answered} contestadas</div>
        </div>
        <div className="metric-card m-green">
          <div className="metric-label">Duración promedio</div>
          <div className="metric-value v-green">{avgDuration}s</div>
          <div className="metric-sub">billsec promedio</div>
        </div>
        <div className="metric-card m-amber">
          <div className="metric-label">Extensiones activas</div>
          <div className="metric-value v-amber">{regSet.size}</div>
          <div className="metric-sub">{regSet.size} registradas</div>
        </div>
        <div className="metric-card m-green">
          <div className="metric-label">Estado sistema</div>
          <div className="metric-value" style={{ fontSize: 14, paddingTop: 4 }}>
            <span className="status-pill pill-green"><span className="dot-sm" /> Online</span>
          </div>
          <div className="metric-sub">Asterisk 20.19.0</div>
        </div>
      </div>

      {/* CDR reciente */}
      <div className="section-card">
        <div className="section-header">
          <div className="section-title">Últimas llamadas (CDR)</div>
          <button className="btn-sm" onClick={() => navigate('/cdr')}>Ver todas →</button>
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Origen</th>
              <th>Destino</th>
              <th>Duración</th>
              <th>Billsec</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {cdr.slice(0, 5).map((row, i) => (
              <tr key={i}>
                <td className="td-muted td-mono">{fmtDate(row.calldate)}</td>
                <td><strong>{row.src}</strong></td>
                <td className="td-mono">{row.dst}</td>
                <td className="td-mono">{row.duration}s</td>
                <td className="td-mono">{row.billsec}s</td>
                <td>
                  <span className={`status-pill ${row.disposition === 'ANSWERED' ? 'pill-green' : row.disposition === 'NO ANSWER' ? 'pill-amber' : 'pill-red'}`}>
                    <span className="dot-sm" />
                    {row.disposition === 'ANSWERED' ? 'Contestada' : row.disposition === 'NO ANSWER' ? 'Sin resp.' : row.disposition}
                  </span>
                </td>
              </tr>
            ))}
            {cdr.length === 0 && (
              <tr><td colSpan="6" className="td-empty">Sin registros</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Extensiones */}
      <div className="section-card">
        <div className="section-header">
          <div className="section-title">Extensiones registradas</div>
          <button className="btn-sm" onClick={() => navigate('/extensions')}>Ver todas →</button>
        </div>
        <div style={{ padding: '12px 16px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10 }}>
          {extensions.map((ext, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 12px' }}>
              <div style={{ width: 34, height: 34, borderRadius: 7, background: 'var(--blue-dim)', color: 'var(--blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 12, fontFamily: 'var(--font-mono)', flexShrink: 0 }}>
                {String(ext.id)}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>Extensión {ext.id}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>{ext.allow} · {ext.context}</div>
              </div>
              <span className={`status-pill ${regSet.has(String(ext.id)) ? 'pill-green' : 'pill-red'}`} style={{ flexShrink: 0 }}>
                <span className="dot-sm" /> {regSet.has(String(ext.id)) ? 'Registrada' : 'No registrada'}
              </span>
            </div>
          ))}
          {extensions.length === 0 && (
            <div style={{ gridColumn: '1/-1', textAlign: 'center', color: 'var(--text-muted)', padding: 24, fontSize: 13 }}>Sin extensiones</div>
          )}
        </div>
      </div>
    </div>
  );
}
