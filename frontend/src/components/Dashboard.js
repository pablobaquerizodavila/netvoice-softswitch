import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API = 'http://192.168.0.7:8000';

function Dashboard({ onNavigate }) {
  const [cdr, setCdr] = useState([]);
  const [extensions, setExtensions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      axios.get(`${API}/cdr`),
      axios.get(`${API}/extensions`),
    ]).then(([cdrRes, extRes]) => {
      setCdr(cdrRes.data.data || []);
      setExtensions(extRes.data.data || []);
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
      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-label">Llamadas registradas</div>
          <div className="metric-value">{cdr.length}</div>
          <div className="metric-sub metric-up">↑ {answered} contestadas</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Duración promedio</div>
          <div className="metric-value">{avgDuration}s</div>
          <div className="metric-sub">billsec promedio</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Extensiones activas</div>
          <div className="metric-value">{extensions.length}</div>
          <div className="metric-sub metric-up">↑ {extensions.length} registradas</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Estado sistema</div>
          <div className="metric-value metric-status">
            <span className="status-pill pill-green"><span className="dot-sm" /> Online</span>
          </div>
          <div className="metric-sub">Asterisk 20.19.0</div>
        </div>
      </div>

      <div className="section-card">
        <div className="section-header">
          <div className="section-title">Últimas llamadas (CDR)</div>
          <button className="btn-sm" onClick={() => onNavigate('cdr')}>
            Ver todas →
          </button>
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
                <td className="td-muted">{row.calldate}</td>
                <td><strong>{row.src}</strong></td>
                <td>{row.dst}</td>
                <td>{row.duration}s</td>
                <td>{row.billsec}s</td>
                <td>
                  <span className={`status-pill ${row.disposition === 'ANSWERED' ? 'pill-green' : 'pill-amber'}`}>
                    <span className="dot-sm" /> {row.disposition}
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

      <div className="section-card">
        <div className="section-header">
          <div className="section-title">Extensiones registradas</div>
          <button className="btn-sm" onClick={() => onNavigate('extensions')}>
            Ver todas →
          </button>
        </div>
        <div className="ext-grid">
          {extensions.map((ext, i) => (
            <div className="ext-item" key={i}>
              <div className="ext-avatar">{String(ext.id).slice(0, 2)}</div>
              <div className="ext-info">
                <div className="ext-name">Extensión {ext.id}</div>
                <div className="ext-detail">{ext.allow} · {ext.context}</div>
              </div>
              <span className="status-pill pill-green" style={{ marginLeft: 'auto' }}>
                <span className="dot-sm" /> Online
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
