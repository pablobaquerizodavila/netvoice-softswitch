import { useState, useEffect, useCallback } from 'react';
import api from '../api';

const PAGE_SIZE = 25;

const DISPOSITIONS = ['','ANSWERED','NO ANSWER','BUSY','FAILED'];

const SIP_CODES = {
  '200':'OK','404':'Not Found','486':'Busy','408':'Timeout',
  '503':'Unavailable','480':'Temp Unavailable','487':'Cancelled',
  '403':'Forbidden','401':'Unauthorized','407':'Proxy Auth',
};

function fmtDur(s) {
  const n = parseInt(s)||0;
  if (!n) return '0s';
  if (n < 60) return n+'s';
  return `${Math.floor(n/60)}m ${n%60}s`;
}

function fmtDT(d) {
  if (!d) return '—';
  try { return new Date(d).toLocaleString('es-EC',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false}); }
  catch { return d; }
}

function DispBadge({ d }) {
  const map = {
    ANSWERED:   ['nv-badge-ok',   '● Contestada'],
    BUSY:       ['nv-badge-warn', '● Ocupado'],
    'NO ANSWER':['nv-badge-muted','● Sin resp.'],
    FAILED:     ['nv-badge-err',  '● Fallida'],
  };
  const [cls,lbl] = map[d]||['nv-badge-muted',d||'—'];
  return <span className={`nv-badge ${cls}`} style={{ fontSize:10 }}>{lbl}</span>;
}

function exportCSV(data) {
  const headers = ['Fecha','Origen','Destino','Contexto','Duración','Billsec','Estado','Canal','Canal destino'];
  const rows = data.map(r => [
    fmtDT(r.calldate), r.src||'', r.dst||'', r.dcontext||'',
    r.duration||0, r.billsec||0, r.disposition||'',
    r.channel||'', r.dstchannel||''
  ]);
  const csv = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type:'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = `cdr_${new Date().toISOString().slice(0,10)}.csv`;
  a.click(); URL.revokeObjectURL(url);
}

/* ── Análisis SIP codes ── */
function SipAnalysis({ data }) {
  const counts = {};
  data.forEach(r => {
    const code = r.hangupcause || (r.disposition==='ANSWERED'?'200': r.disposition==='BUSY'?'486': r.disposition==='NO ANSWER'?'408':'503');
    counts[code] = (counts[code]||0) + 1;
  });
  const sorted = Object.entries(counts).sort((a,b)=>b[1]-a[1]).slice(0,8);
  const total  = data.length || 1;
  return (
    <div className="nv-card">
      <div className="nv-card-header">
        <span className="nv-card-title">◈ Análisis SIP codes</span>
        <span style={{ fontSize:10, color:'var(--text-muted)' }}>{data.length} registros</span>
      </div>
      {sorted.map(([code,cnt]) => {
        const pct = ((cnt/total)*100).toFixed(1);
        const isOk = code === '200';
        return (
          <div key={code} style={{ marginBottom:9 }}>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:3, fontSize:11 }}>
              <span style={{ display:'flex', alignItems:'center', gap:7 }}>
                <span style={{ fontFamily:'var(--font-mono)', fontWeight:700,
                  color: isOk ? 'var(--success)' : code>='400' ? 'var(--danger)' : 'var(--warning)' }}>
                  {code}
                </span>
                <span style={{ color:'var(--text-muted)', fontSize:10 }}>{SIP_CODES[code]||'Unknown'}</span>
              </span>
              <span style={{ fontFamily:'var(--font-mono)', color:'var(--text-secondary)' }}>
                {cnt} <span style={{ color:'var(--text-muted)' }}>({pct}%)</span>
              </span>
            </div>
            <div className="nv-progress">
              <div className="nv-progress-bar" style={{
                width:`${pct}%`,
                background: isOk ? 'var(--success)' : code>='400' ? 'var(--danger)' : 'var(--warning)'
              }}/>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function CDRPage() {
  const [data,    setData]    = useState([]);
  const [total,   setTotal]   = useState(0);
  const [loading, setLoading] = useState(true);
  const [page,    setPage]    = useState(1);

  const [filters, setFilters] = useState({
    origen:'', destino:'', estado:'', contexto:'',
    fechaDesde:'', fechaHasta:'', limite: 500,
  });
  const [applied, setApplied] = useState(filters);
  const setF = (k,v) => setFilters(f => ({...f,[k]:v}));

  const load = useCallback(async () => {
    setLoading(true);
    try {
      let url = `/cdr?limit=${applied.limite}`;
      const r = await api.get(url);
      let rows = r.data.data || [];

      // Filtros client-side sobre el resultado
      if (applied.origen)     rows = rows.filter(r => r.src?.includes(applied.origen));
      if (applied.destino)    rows = rows.filter(r => r.dst?.includes(applied.destino));
      if (applied.estado)     rows = rows.filter(r => r.disposition === applied.estado);
      if (applied.contexto)   rows = rows.filter(r => r.dcontext?.includes(applied.contexto));
      if (applied.fechaDesde) rows = rows.filter(r => new Date(r.calldate) >= new Date(applied.fechaDesde));
      if (applied.fechaHasta) rows = rows.filter(r => new Date(r.calldate) <= new Date(applied.fechaHasta+' 23:59:59'));

      setData(rows);
      setTotal(rows.length);
    } catch { setData([]); setTotal(0); }
    finally { setLoading(false); }
  }, [applied]);

  useEffect(() => { load(); setPage(1); }, [load]);

  // KPIs
  const answered   = data.filter(r => r.disposition==='ANSWERED').length;
  const totalMins  = data.reduce((s,r) => s+(parseInt(r.billsec)||0), 0);
  const asr        = data.length > 0 ? ((answered/data.length)*100).toFixed(1) : '—';
  const avgDur     = answered > 0 ? Math.round(totalMins/answered) : 0;

  // Paginación
  const pages   = Math.ceil(data.length / PAGE_SIZE);
  const pageData = data.slice((page-1)*PAGE_SIZE, page*PAGE_SIZE);

  // Contextos únicos para filtro
  const contextos = [...new Set(data.map(r => r.dcontext).filter(Boolean))];

  const applyFilters = () => { setApplied({...filters}); };
  const clearFilters = () => {
    const empty = { origen:'',destino:'',estado:'',contexto:'',fechaDesde:'',fechaHasta:'',limite:500 };
    setFilters(empty); setApplied(empty);
  };
  const hasFilters = Object.entries(applied).some(([k,v]) => k!=='limite' && v);

  return (
    <div>
      {/* Header */}
      <div className="nv-page-header">
        <div>
          <div className="nv-page-title">CDRs — Registros de llamadas</div>
          <div className="nv-page-sub">{total.toLocaleString()} registros · página {page}/{pages||1}</div>
        </div>
        <div className="nv-page-actions">
          <button className="nv-btn nv-btn-ghost nv-btn-sm" onClick={() => exportCSV(data)} disabled={!data.length}>
            ↓ Exportar CSV
          </button>
          <button className="nv-btn nv-btn-secondary nv-btn-sm" onClick={load} disabled={loading}>
            {loading ? <span className="nv-spinner" /> : '↺'} Actualizar
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="nv-kpi-grid" style={{ marginBottom:16 }}>
        <div className="nv-kpi">
          <div className="nv-kpi-label">Total registros</div>
          <div className="nv-kpi-value">{total.toLocaleString()}</div>
        </div>
        <div className="nv-kpi">
          <div className="nv-kpi-label">Contestadas</div>
          <div className="nv-kpi-value" style={{ color:'var(--success)' }}>{answered.toLocaleString()}</div>
          <div className="nv-kpi-sub">ASR: {asr}%</div>
        </div>
        <div className="nv-kpi">
          <div className="nv-kpi-label">Minutos totales</div>
          <div className="nv-kpi-value" style={{ color:'var(--brand)' }}>{Math.round(totalMins/60).toLocaleString()}</div>
          <div className="nv-kpi-sub">{totalMins.toLocaleString()}s billsec</div>
        </div>
        <div className="nv-kpi">
          <div className="nv-kpi-label">Duración promedio</div>
          <div className="nv-kpi-value" style={{ color:'var(--info)' }}>{fmtDur(avgDur)}</div>
          <div className="nv-kpi-sub">Por llamada contestada</div>
        </div>
      </div>

      {/* Filtros */}
      <div className="nv-card" style={{ marginBottom:14 }}>
        <div className="nv-card-header">
          <span className="nv-card-title">⊞ Filtros</span>
          {hasFilters && (
            <button className="nv-btn nv-btn-ghost nv-btn-sm" onClick={clearFilters}>✕ Limpiar</button>
          )}
        </div>
        <div className="nv-form-row">
          <div className="nv-form-field">
            <label className="nv-label">Número origen</label>
            <input className="nv-input" placeholder="ej: 1001" value={filters.origen}
              onChange={e => setF('origen',e.target.value)} />
          </div>
          <div className="nv-form-field">
            <label className="nv-label">Número destino</label>
            <input className="nv-input" placeholder="ej: 0987654321" value={filters.destino}
              onChange={e => setF('destino',e.target.value)} />
          </div>
          <div className="nv-form-field">
            <label className="nv-label">Estado</label>
            <select className="nv-select" value={filters.estado} onChange={e => setF('estado',e.target.value)}>
              {DISPOSITIONS.map(d => <option key={d} value={d}>{d||'Todos'}</option>)}
            </select>
          </div>
          <div className="nv-form-field">
            <label className="nv-label">Contexto</label>
            <select className="nv-select" value={filters.contexto} onChange={e => setF('contexto',e.target.value)}>
              <option value="">Todos</option>
              {contextos.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="nv-form-field">
            <label className="nv-label">Fecha desde</label>
            <input className="nv-input" type="date" value={filters.fechaDesde}
              onChange={e => setF('fechaDesde',e.target.value)} />
          </div>
          <div className="nv-form-field">
            <label className="nv-label">Fecha hasta</label>
            <input className="nv-input" type="date" value={filters.fechaHasta}
              onChange={e => setF('fechaHasta',e.target.value)} />
          </div>
          <div className="nv-form-field">
            <label className="nv-label">Límite de carga</label>
            <select className="nv-select" value={filters.limite} onChange={e => setF('limite',parseInt(e.target.value))}>
              {[100,250,500,1000,2000,5000].map(n => <option key={n} value={n}>{n} registros</option>)}
            </select>
          </div>
        </div>
        <div style={{ display:'flex', justifyContent:'flex-end', gap:8, marginTop:4 }}>
          <button className="nv-btn nv-btn-primary" onClick={applyFilters}>
            ⊞ Aplicar filtros
          </button>
        </div>
      </div>

      {/* Grid: tabla + análisis */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 300px', gap:14, alignItems:'start' }}>

        {/* Tabla CDR */}
        <div className="nv-card" style={{ padding:0 }}>
          {loading ? (
            <div className="nv-loading"><span className="nv-spinner" /><span>Cargando CDRs...</span></div>
          ) : data.length === 0 ? (
            <div style={{ textAlign:'center', padding:'48px 20px' }}>
              <div style={{ fontSize:32, opacity:.2, marginBottom:12 }}>▤</div>
              <div style={{ fontSize:13, color:'var(--text-muted)' }}>Sin registros de llamadas</div>
            </div>
          ) : (
            <>
              <div className="nv-table-wrap">
                <table className="nv-table">
                  <thead><tr>
                    <th>Fecha</th><th>Origen</th><th>Destino</th>
                    <th>Contexto</th><th>Duración</th><th>Billsec</th><th>Estado</th>
                  </tr></thead>
                  <tbody>
                    {pageData.map((r,i) => (
                      <tr key={i}>
                        <td style={{ fontSize:10, color:'var(--text-muted)', whiteSpace:'nowrap' }}>{fmtDT(r.calldate)}</td>
                        <td className="mono">{r.src||'—'}</td>
                        <td className="mono">{r.dst||'—'}</td>
                        <td><span style={{ fontSize:10, color:'var(--text-muted)' }}>{r.dcontext||'—'}</span></td>
                        <td className="mono" style={{ color:'var(--text-muted)' }}>{fmtDur(r.duration)}</td>
                        <td className="mono" style={{ color:'var(--brand)', fontWeight:600 }}>{fmtDur(r.billsec)}</td>
                        <td><DispBadge d={r.disposition} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Paginación */}
              {pages > 1 && (
                <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:6, padding:'10px 14px', borderTop:'1px solid var(--border)' }}>
                  <button className="nv-btn nv-btn-ghost nv-btn-sm" onClick={() => setPage(1)} disabled={page===1}>«</button>
                  <button className="nv-btn nv-btn-ghost nv-btn-sm" onClick={() => setPage(p=>Math.max(1,p-1))} disabled={page===1}>‹</button>
                  {Array.from({length:Math.min(5,pages)},(_,i) => {
                    const start = Math.max(1, Math.min(page-2, pages-4));
                    const n = start+i;
                    if (n > pages) return null;
                    return (
                      <button key={n}
                        className={`nv-btn nv-btn-sm ${n===page?'nv-btn-secondary':'nv-btn-ghost'}`}
                        onClick={() => setPage(n)}>{n}</button>
                    );
                  })}
                  <button className="nv-btn nv-btn-ghost nv-btn-sm" onClick={() => setPage(p=>Math.min(pages,p+1))} disabled={page===pages}>›</button>
                  <button className="nv-btn nv-btn-ghost nv-btn-sm" onClick={() => setPage(pages)} disabled={page===pages}>»</button>
                  <span style={{ fontSize:10, color:'var(--text-muted)', marginLeft:8 }}>
                    {((page-1)*PAGE_SIZE)+1}–{Math.min(page*PAGE_SIZE,total)} de {total}
                  </span>
                </div>
              )}
            </>
          )}
        </div>

        {/* Panel lateral análisis */}
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          <SipAnalysis data={data} />

          {/* Distribución por contexto */}
          <div className="nv-card">
            <div className="nv-card-header">
              <span className="nv-card-title">▣ Por contexto</span>
            </div>
            {contextos.slice(0,6).map(ctx => {
              const cnt = data.filter(r => r.dcontext===ctx).length;
              const pct = data.length > 0 ? ((cnt/data.length)*100).toFixed(0) : 0;
              return (
                <div key={ctx} style={{ marginBottom:8 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:3, fontSize:11 }}>
                    <span style={{ color:'var(--text-secondary)', fontFamily:'var(--font-mono)', fontSize:10 }}>{ctx}</span>
                    <span style={{ color:'var(--text-muted)', fontFamily:'var(--font-mono)' }}>{cnt}</span>
                  </div>
                  <div className="nv-progress">
                    <div className="nv-progress-bar" style={{ width:`${pct}%` }}/>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
