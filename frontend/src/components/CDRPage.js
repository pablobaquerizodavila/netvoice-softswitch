import React, { useState, useEffect } from 'react';
import api from '../api';

const PAGE_SIZE = 20;

export default function CDRPage() {
  const [data, setData]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState('');
  const [origen, setOrigen]   = useState('');
  const [destino, setDestino] = useState('');
  const [estado, setEstado]   = useState('');
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [page, setPage]       = useState(1);

  useEffect(() => {
    api.get('/cdr?limit=500')
      .then(res => setData(res.data.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = data.filter(r => {
    if (origen  && !r.src?.includes(origen))   return false;
    if (destino && !r.dst?.includes(destino))  return false;
    if (estado  && r.disposition !== estado)   return false;
    if (fechaDesde && r.calldate < fechaDesde) return false;
    if (fechaHasta && r.calldate > fechaHasta + 'T23:59:59') return false;
    if (search && !r.src?.includes(search) && !r.dst?.includes(search) &&
        !r.channel?.includes(search) && !r.disposition?.includes(search.toUpperCase()))
      return false;
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const resetFilters = () => {
    setSearch(''); setOrigen(''); setDestino('');
    setEstado(''); setFechaDesde(''); setFechaHasta('');
    setPage(1);
  };

  const statCount = (d) => data.filter(r => r.disposition === d).length;

  if (loading) return <div className="loading">Cargando CDR...</div>;

  return (
    <div>
      {/* HEADER */}
      <div style={{marginBottom:24}}>
        <h1 style={{fontSize:20,fontWeight:700,color:'#0f172a',marginBottom:4}}>CDR — Registro de llamadas</h1>
        <p style={{fontSize:13,color:'#94a3b8'}}>{data.length} registros totales · voip-lab-01 (192.168.0.161)</p>
      </div>

      {/* STAT PILLS */}
      <div style={{display:'flex',gap:12,marginBottom:20,flexWrap:'wrap'}}>
        {[
          { label:'Total',      val: data.length,         bg:'#f1f5f9', color:'#475569' },
          { label:'Contestadas',val: statCount('ANSWERED'),bg:'#f0fdf4', color:'#057a55' },
          { label:'No contest.', val: statCount('NO ANSWER'),bg:'#fffbeb',color:'#b45309' },
          { label:'Fallidas',   val: statCount('FAILED'),  bg:'#fef2f2', color:'#c81e1e' },
        ].map(({label,val,bg,color}) => (
          <div key={label} style={{background:bg,border:`1px solid ${bg}`,borderRadius:8,padding:'10px 18px',minWidth:110}}>
            <div style={{fontSize:11,color,fontWeight:600,textTransform:'uppercase',letterSpacing:'0.5px',marginBottom:2}}>{label}</div>
            <div style={{fontSize:22,fontWeight:700,color,fontFamily:'monospace'}}>{val}</div>
          </div>
        ))}
      </div>

      {/* FILTROS */}
      <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:10,padding:16,marginBottom:16}}>
        <div style={{display:'flex',gap:10,flexWrap:'wrap',alignItems:'flex-end'}}>
          <div style={{display:'flex',flexDirection:'column',gap:4}}>
            <label style={labelStyle}>Buscar</label>
            <input style={inputStyle} placeholder="Origen, destino, canal..." value={search} onChange={e=>{setSearch(e.target.value);setPage(1);}} />
          </div>
          <div style={{display:'flex',flexDirection:'column',gap:4}}>
            <label style={labelStyle}>Origen</label>
            <input style={inputStyle} placeholder="ej. 1001" value={origen} onChange={e=>{setOrigen(e.target.value);setPage(1);}} />
          </div>
          <div style={{display:'flex',flexDirection:'column',gap:4}}>
            <label style={labelStyle}>Destino</label>
            <input style={inputStyle} placeholder="ej. 1002" value={destino} onChange={e=>{setDestino(e.target.value);setPage(1);}} />
          </div>
          <div style={{display:'flex',flexDirection:'column',gap:4}}>
            <label style={labelStyle}>Estado</label>
            <select style={inputStyle} value={estado} onChange={e=>{setEstado(e.target.value);setPage(1);}}>
              <option value="">Todos</option>
              <option value="ANSWERED">ANSWERED</option>
              <option value="NO ANSWER">NO ANSWER</option>
              <option value="BUSY">BUSY</option>
              <option value="FAILED">FAILED</option>
            </select>
          </div>
          <div style={{display:'flex',flexDirection:'column',gap:4}}>
            <label style={labelStyle}>Desde</label>
            <input style={inputStyle} type="date" value={fechaDesde} onChange={e=>{setFechaDesde(e.target.value);setPage(1);}} />
          </div>
          <div style={{display:'flex',flexDirection:'column',gap:4}}>
            <label style={labelStyle}>Hasta</label>
            <input style={inputStyle} type="date" value={fechaHasta} onChange={e=>{setFechaHasta(e.target.value);setPage(1);}} />
          </div>
          <button onClick={resetFilters} style={{padding:'7px 14px',borderRadius:7,border:'1px solid #e2e8f0',background:'#f8fafc',color:'#64748b',fontSize:13,cursor:'pointer',fontFamily:'inherit',height:34}}>
            Limpiar
          </button>
        </div>
        <div style={{marginTop:10,fontSize:12,color:'#94a3b8'}}>
          Mostrando <strong style={{color:'#475569'}}>{filtered.length}</strong> de {data.length} registros
        </div>
      </div>

      {/* TABLA */}
      <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:10,overflow:'hidden'}}>
        <table className="data-table" style={{width:'100%'}}>
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
            {paginated.map((row, i) => (
              <tr key={i}>
                <td className="td-muted" style={{fontFamily:'monospace',fontSize:12}}>{row.calldate}</td>
                <td><strong>{row.src}</strong></td>
                <td>{row.dst}</td>
                <td style={{fontFamily:'monospace',fontSize:11,color:'#94a3b8'}}>{row.channel?.split('/')[0]}</td>
                <td>{row.duration}s</td>
                <td>{row.billsec}s</td>
                <td>
                  <span className={`status-pill ${
                    row.disposition==='ANSWERED' ? 'pill-green' :
                    row.disposition==='BUSY'     ? 'pill-amber' : 'pill-red'
                  }`}>
                    <span className="dot-sm" /> {row.disposition}
                  </span>
                </td>
              </tr>
            ))}
            {paginated.length === 0 && (
              <tr><td colSpan="7" className="td-empty">Sin registros con los filtros aplicados</td></tr>
            )}
          </tbody>
        </table>

        {/* PAGINACION */}
        {totalPages > 1 && (
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'12px 16px',borderTop:'1px solid #e2e8f0',background:'#f8fafc'}}>
            <span style={{fontSize:12,color:'#94a3b8'}}>
              Página {page} de {totalPages}
            </span>
            <div style={{display:'flex',gap:6}}>
              <button onClick={()=>setPage(1)} disabled={page===1} style={pageBtn}>«</button>
              <button onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page===1} style={pageBtn}>‹</button>
              {Array.from({length:Math.min(5,totalPages)},(_,i)=>{
                const p = Math.min(Math.max(page-2,1)+i, totalPages);
                return (
                  <button key={p} onClick={()=>setPage(p)}
                    style={{...pageBtn, background:p===page?'#1d4ed8':'#fff', color:p===page?'#fff':'#475569', borderColor:p===page?'#1d4ed8':'#e2e8f0'}}>
                    {p}
                  </button>
                );
              })}
              <button onClick={()=>setPage(p=>Math.min(totalPages,p+1))} disabled={page===totalPages} style={pageBtn}>›</button>
              <button onClick={()=>setPage(totalPages)} disabled={page===totalPages} style={pageBtn}>»</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const labelStyle = { fontSize:11, fontWeight:600, color:'#64748b', textTransform:'uppercase', letterSpacing:'0.5px' };
const inputStyle = { padding:'6px 10px', border:'1px solid #e2e8f0', borderRadius:7, fontSize:13, fontFamily:'inherit', color:'#0f172a', background:'#fff', outline:'none', height:34 };
const pageBtn   = { padding:'4px 10px', border:'1px solid #e2e8f0', borderRadius:6, background:'#fff', color:'#475569', fontSize:13, cursor:'pointer', fontFamily:'inherit' };
