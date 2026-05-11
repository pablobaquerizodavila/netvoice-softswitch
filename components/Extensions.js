import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API = 'http://192.168.0.7:8000';

function Extensions() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get(`${API}/extensions`)
      .then(res => { setData(res.data.data || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading">Cargando extensiones...</div>;

  return (
    <div>
      <div className="page-toolbar">
        <span className="result-count">{data.length} extensiones registradas</span>
        <button className="btn-primary">+ Nueva extensión</button>
      </div>

      <div className="ext-cards-grid">
        {data.map((ext, i) => (
          <div className="ext-card" key={i}>
            <div className="ext-card-header">
              <div className="ext-avatar-lg">{String(ext.id).slice(0, 2)}</div>
              <div>
                <div className="ext-card-name">Extensión {ext.id}</div>
                <span className="status-pill pill-green">
                  <span className="dot-sm" /> Online
                </span>
              </div>
            </div>
            <div className="ext-card-body">
              <div className="ext-field">
                <span className="ext-field-label">ID</span>
                <span className="ext-field-value">{ext.id}</span>
              </div>
              <div className="ext-field">
                <span className="ext-field-label">AORs</span>
                <span className="ext-field-value">{ext.aors}</span>
              </div>
              <div className="ext-field">
                <span className="ext-field-label">Auth</span>
                <span className="ext-field-value">{ext.auth}</span>
              </div>
              <div className="ext-field">
                <span className="ext-field-label">Contexto</span>
                <span className="ext-field-value">{ext.context}</span>
              </div>
              <div className="ext-field">
                <span className="ext-field-label">Codecs</span>
                <span className="ext-field-value">{ext.allow}</span>
              </div>
            </div>
            <div className="ext-card-actions">
              <button className="btn-sm">Editar</button>
              <button className="btn-sm btn-danger">Eliminar</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Extensions;
