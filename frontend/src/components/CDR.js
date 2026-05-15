import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API = 'http://192.168.0.7:8000';

function CDR() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get(`${API}/cdr`)
      .then(res => { setData(res.data.data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <p>Cargando CDR...</p>;

  return (
    <div>
      <h2>Registro de Llamadas (CDR)</h2>
      <p>Total: {data.length}</p>
      <table>
        <thead>
          <tr>
            <th>Fecha</th>
            <th>Origen</th>
            <th>Destino</th>
            <th>Duración</th>
            <th>Estado</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr key={i}>
              <td>{row.calldate}</td>
              <td>{row.src}</td>
              <td>{row.dst}</td>
              <td>{row.duration}s</td>
              <td>{row.disposition}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default CDR;
