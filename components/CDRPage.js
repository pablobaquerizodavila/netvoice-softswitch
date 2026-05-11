import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API = 'http://192.168.0.7:8000';

function CDRPage() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    axios.get(`${API}/cdr`)
      .then(res => { setData(res.data.data || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const filtered = data.filter(r =>
    !filter || r.src?.includes(filter) || r.dst?.includes(filter) || r.disposition?.includes(filter.toUpperCase())
  );

  if (loading) return <div className="loading">Cargando CDR...</div>;

  return (
    <div>
      <div className="page-toolbar">
        <input
          className="search-input"
          type="text"
          placeholder="Filtrar por origen, destino o estado..."
          value={filter}
          onChange={e => setFilter(e.target.value)}
        />
        <span className="result-count">{filtered.length} registros</span>
      </div>

      <div className="section-card">
        <table className="data-table">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Origen</th>
              <th>Destino</th>
              <th>Canal</th>
              <th>Duración</th>
              <th>Billsec</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((row, i) => (
              <tr key={i}>
                <td className="td-muted">{row.calldate}</td>
                <td><strong>{row.src}</strong></td>
                <td>{row.dst}</td>
                <td className="td-muted td-mono">{row.channel?.split('/')[0]}</td>
                <td>{row.duration}s</td>
                <td>{row.billsec}s</td>
                <td>
                  <span className={`status-pill ${row.disposition === 'ANSWERED' ? 'pill-green' : 'pill-amber'}`}>
                    <span className="dot-sm" /> {row.disposition}
                  </span>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan="7" className="td-empty">Sin registros</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default CDRPage;
