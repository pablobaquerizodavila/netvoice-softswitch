
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';

/* ── helpers ─────────────────────────────────────────────── */
async function get(path) {
  try { const r = await api.get(path); return r.data; }
  catch { return null; }
}

function fmtDur(s) {
  const n = parseInt(s) || 0;
  if (n === 0) return '0s';
  if (n < 60)  return n + 's';
  return Math.floor(n/60) + 'm ' + (n%60) + 's';
}

function fmtDate(raw) {
  if (!raw) return '—';
  try {
    return new Date(raw).toLocaleString('es-EC', {
      day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit', hour12:false
    });
  } catch { return raw; }
}

/* ── sub-componentes ─────────────────────────────────────── */
function KpiCard({ icon, label, value, unit, sub, subColor, iconBg }) {
  return (
    <div className="nv-kpi">
      <div className="nv-kpi-header">
        <span className="nv-kpi-label">{label}</span>
        <div className="nv-kpi-icon" style={{ background: iconBg || 'var(--brand-subtle)', color: 'var(--brand)' }}>
          {icon}
        </div>
      </div>
      <div className="nv-kpi-value">
        {value ?? <span className="nv-spinner" />}
        {unit && value != null &&
          <span style={{ fontSize:11, fontWeight:400, color:'var(--text-muted)', marginLeft:4 }}>{unit}</span>}
      </div>
      {sub && <div className="nv-kpi-sub" style={{ color: subColor || 'var(--text-muted)' }}>{sub}</div>}
    </div>
  );
}

function Sparkline({ data, color='var(--brand)', h=54 }) {
  if (!data?.length) return null;
  const vals = data.map(d => parseFloat(d.minutos) || 0);
  const mx   = Math.max(...vals, 1);
  const W    = 300;
  const pts  = vals.map((v,i) => {
    const x = (i / Math.max(vals.length-1,1)) * W;
    const y = h - (v/mx) * h * 0.84 - 2;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
  return (
    <svg width="100%" viewBox={`0 0 ${W} ${h}`} style={{ display:'block', overflow:'visible' }}>
      <polyline points={`0,${h} ${pts} ${W},${h}`} fill={color} fillOpacity=".09" stroke="none" />
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.8"
        strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

function NodeRow({ name, ip, role, ok }) {
  return (
    <div style={{
      display:'flex', alignItems:'center', gap:10,
      padding:'7px 11px', marginBottom:5,
      background:'var(--bg-raised)', borderRadius:'var(--r-sm)',
      border:'1px solid var(--border)',
    }}>
      <div style={{
        width:7, height:7, borderRadius:'50%', flexShrink:0,
        background: ok ? 'var(--success)' : 'var(--danger)',
        boxShadow: ok ? '0 0 6px var(--success)' : 'none',
      }}/>
      <div style={{ flex:1 }}>
        <div style={{ fontSize:12, fontWeight:500, color:'var(--text-primary)' }}>{name}</div>
        <div style={{ fontSize:10, color:'var(--text-muted)', fontFamily:'var(--font-mono)' }}>{ip}</div>
      </div>
      <div style={{ textAlign:'right' }}>
        <div style={{ fontSize:10, fontWeight:700, color: ok ? 'var(--success)' : 'var(--danger)' }}>
          {ok ? 'Online' : 'Offline'}
        </div>
        <div style={{ fontSize:9, color:'var(--text-muted)' }}>{role}</div>
      </div>
    </div>
  );
}

function BarRow({ label, value, max, color }) {
  const pct = max > 0 ? Math.min(100,(value/max)*100) : 0;
  return (
    <div style={{ marginBottom:9 }}>
      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:3, fontSize:11 }}>
        <span style={{ color:'var(--text-secondary)', fontFamily:'var(--font-mono)' }}>{label}</span>
        <span style={{ color, fontFamily:'var(--font-mono)', fontWeight:600 }}>{value} min</span>
      </div>
      <div className="nv-progress">
        <div className="nv-progress-bar" style={{ width:`${pct}%`, background:color }} />
      </div>
    </div>
  );
}

function DispBadge({ d }) {
  const map = {
    ANSWERED:  ['nv-badge-ok',   '● Contestada'],
    BUSY:      ['nv-badge-warn', '● Ocupado'],
    'NO ANSWER':['nv-badge-muted','● Sin resp.'],
    FAILED:    ['nv-badge-err',  '● Fallida'],
  };
  const [cls, lbl] = map[d] || ['nv-badge-muted', d];
  return <span className={`nv-badge ${cls}`}>{lbl}</span>;
}

const NODES = [
  { name:'Kamailio SBC',  ip:'192.168.0.10',  role:'Session Border Controller', ok:true },
  { name:'Asterisk PBX',  ip:'192.168.0.161', role:'PBX Principal',             ok:true },
  { name:'Asterisk HA',   ip:'192.168.0.216', role:'High Availability',         ok:true },
  { name:'MySQL 8.0',     ip:'192.168.0.161', role:'Base de datos',             ok:true },
  { name:'Nginx + Panel', ip:'192.168.0.7',   role:'Web / API Gateway',         ok:true },
];

const BAR_COLORS = ['var(--brand)','var(--success)','var(--info)','var(--warning)','var(--text-secondary)'];

/* ── componente principal ────────────────────────────────── */
export default function Dashboard() {
  const navigate = useNavigate();
  const [res,  setRes]  = useState(null);
  const [mes,  setMes]  = useState(null);
  const [dst,  setDst]  = useState(null);
  const [cdr,  setCdr]  = useState(null);
  const [cl,   setCl]   = useState(null);
  const [tr,   setTr]   = useState(null);
  const [ext,  setExt]  = useState(null);
  const [busy, setBusy] = useState(true);
  const [ts,   setTs]   = useState(new Date());

  const load = useCallback(async () => {
    setBusy(true);
    const [a,b,c,d,e,f,g] = await Promise.all([
      get('/metricas/resumen?meses=1'),
      get('/metricas/por-mes?meses=6'),
      get('/metricas/top-destinos?meses=1&limit=5'),
      get('/cdr?limit=8'),
      get('/clientes?limit=1'),
      get('/trunks'),
      get('/extensions'),
    ]);
    setRes(a); setMes(b); setDst(c); setCdr(d);
    setCl(e);  setTr(f);  setExt(g);
    setBusy(false); setTs(new Date());
  }, []);

  useEffect(() => {
    load();
    const iv = setInterval(load, 30000);
    return () => clearInterval(iv);
  }, [load]);

  /* KPIs calculados */
  const total = parseInt(res?.total_llamadas) || 0;
  const cont  = parseInt(res?.contestadas)    || 0;
  const mins  = parseFloat(res?.total_minutos)|| 0;
  const asr   = total > 0 ? ((cont/total)*100).toFixed(1) : null;
  const acd   = cont  > 0 ? Math.round((mins/cont)*60)   : null;
  const tAct  = tr?.data?.filter(t => t.activo==='yes').length ?? null;
  const extTotal = ext?.total ?? ext?.data?.length ?? null;

  return (
    <div>
      {/* ── Header ── */}
      <div className="nv-page-header">
        <div>
          <div className="nv-page-title">Dashboard Operativo</div>
          <div className="nv-page-sub">
            Actualizado: {ts.toLocaleTimeString('es-EC',{hour12:false})}
            {' · '}auto-refresh 30s
          </div>
        </div>
        <div className="nv-page-actions">
          <button className="nv-btn nv-btn-secondary nv-btn-sm" onClick={load} disabled={busy}>
            {busy ? <span className="nv-spinner" /> : '↺'} Actualizar
          </button>
          <button className="nv-btn nv-btn-ghost nv-btn-sm" onClick={() => navigate('/metricas')}>
            Ver métricas →
          </button>
        </div>
      </div>

      {/* ── KPIs ── */}
      <div className="nv-kpi-grid">
        <KpiCard icon="☎" label="Llamadas (30d)"
          value={busy ? null : total.toLocaleString()}
          sub={`${cont.toLocaleString()} contestadas`}
          subColor="var(--success)" iconBg="var(--success-bg)" />
        <KpiCard icon="⏱" label="Minutos (30d)"
          value={busy ? null : Math.round(mins).toLocaleString()} unit="min"
          sub={`${(mins/60).toFixed(1)} horas`} iconBg="var(--info-bg)" />
        <KpiCard icon="%" label="ASR"
          value={busy ? null : asr != null ? `${asr}%` : '—'}
          sub="Answer Seizure Ratio"
          subColor={asr && parseFloat(asr)>65 ? 'var(--success)' : 'var(--warning)'}
          iconBg={asr && parseFloat(asr)>65 ? 'var(--success-bg)' : 'var(--warning-bg)'} />
        <KpiCard icon="⏲" label="ACD"
          value={busy ? null : acd != null ? `${acd}s` : '—'}
          sub="Avg Call Duration" iconBg="var(--brand-subtle)" />
        <KpiCard icon="⊕" label="Troncales activas"
          value={busy ? null : tAct ?? '—'}
          sub="SIP Trunks online"
          subColor="var(--success)" iconBg="var(--success-bg)" />
        <KpiCard icon="◻" label="Clientes"
          value={busy ? null : cl?.total?.toLocaleString() ?? '—'}
          sub="Total registrados" iconBg="var(--brand-subtle)" />
        <KpiCard icon="◎" label="Extensiones"
          value={busy ? null : extTotal ?? '—'}
          sub="SIP endpoints" iconBg="var(--info-bg)" />
        <KpiCard icon="▦" label="Llamadas activas"
          value={busy ? null : '0'}
          sub="En este momento"
          subColor="var(--text-muted)" iconBg="var(--bg-raised)" />
      </div>

      {/* ── Fila 2: Tráfico + Infraestructura ── */}
      <div className="nv-grid-2" style={{ marginBottom:14 }}>

        {/* Sparkline tráfico */}
        <div className="nv-card">
          <div className="nv-card-header">
            <span className="nv-card-title">◈ Tráfico — 6 meses</span>
            <span style={{ fontSize:10, color:'var(--text-muted)' }}>Minutos totales por mes</span>
          </div>
          {mes?.data?.length > 0 ? (
            <>
              <Sparkline data={mes.data} />
              <div style={{
                display:'flex', justifyContent:'space-between',
                marginTop:10, paddingTop:10,
                borderTop:'1px solid var(--border-subtle)'
              }}>
                {mes.data.slice(-6).map(m => (
                  <div key={m.mes} style={{ textAlign:'center', flex:1 }}>
                    <div style={{ fontFamily:'var(--font-mono)', fontSize:11, fontWeight:600, color:'var(--text-primary)' }}>
                      {Math.round(parseFloat(m.minutos)||0)}
                    </div>
                    <div style={{ fontSize:9, color:'var(--text-muted)' }}>{m.mes?.slice(5)}</div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="nv-loading" style={{ padding:'28px 0' }}>
              <span style={{ fontSize:11, color:'var(--text-muted)' }}>Sin datos de tráfico aún</span>
            </div>
          )}
        </div>

        {/* Estado nodos */}
        <div className="nv-card">
          <div className="nv-card-header">
            <span className="nv-card-title">◉ Infraestructura</span>
            <span className="nv-badge nv-badge-ok"><span className="dot" />Todos operativos</span>
          </div>
          {NODES.map(n => <NodeRow key={n.name} {...n} />)}
        </div>
      </div>

      {/* ── Fila 3: Top destinos + Distribución ── */}
      <div className="nv-grid-2" style={{ marginBottom:14 }}>

        {/* Top destinos */}
        <div className="nv-card">
          <div className="nv-card-header">
            <span className="nv-card-title">▤ Top destinos (30d)</span>
            <span style={{ fontSize:10, color:'var(--text-muted)' }}>Por minutos</span>
          </div>
          {dst?.data?.length > 0 ? (
            dst.data.map((d,i) => (
              <BarRow key={d.numero}
                label={d.numero || '—'}
                value={Math.round(parseFloat(d.minutos)||0)}
                max={parseFloat(dst.data[0]?.minutos)||1}
                color={BAR_COLORS[i]} />
            ))
          ) : (
            <div style={{ fontSize:11, color:'var(--text-muted)', textAlign:'center', padding:'24px 0' }}>
              Sin datos de destinos
            </div>
          )}
        </div>

        {/* Distribución */}
        <div className="nv-card">
          <div className="nv-card-header">
            <span className="nv-card-title">◈ Distribución (30d)</span>
          </div>
          {res ? (
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
              {[
                { lbl:'Contestadas',  val:res.contestadas,    color:'var(--success)' },
                { lbl:'No contest.',  val:res.no_contestadas, color:'var(--danger)'  },
                { lbl:'Salientes',    val:res.salientes,      color:'var(--info)'    },
                { lbl:'Entrantes',    val:res.entrantes,      color:'var(--warning)' },
                { lbl:'On-net',       val:res.onnet,          color:'var(--brand)'   },
                { lbl:'Min. totales', val:Math.round(mins),   color:'var(--text-primary)' },
              ].map(({ lbl, val, color }) => (
                <div key={lbl} style={{
                  background:'var(--bg-raised)', borderRadius:'var(--r-sm)',
                  padding:'10px 12px', textAlign:'center'
                }}>
                  <div style={{ fontFamily:'var(--font-mono)', fontSize:16, fontWeight:700, color }}>
                    {(parseInt(val)||0).toLocaleString()}
                  </div>
                  <div style={{ fontSize:9, textTransform:'uppercase', letterSpacing:'.08em', color:'var(--text-muted)', marginTop:2 }}>
                    {lbl}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="nv-loading"><span className="nv-spinner" /></div>
          )}
        </div>
      </div>

      {/* ── Últimas llamadas ── */}
      <div className="nv-card">
        <div className="nv-card-header">
          <span className="nv-card-title">▤ Últimas llamadas</span>
          <button className="nv-btn nv-btn-ghost nv-btn-sm" onClick={() => navigate('/cdr')}>
            Ver CDR completo →
          </button>
        </div>
        {busy ? (
          <div className="nv-loading"><span className="nv-spinner" /></div>
        ) : (
          <div className="nv-table-wrap">
            <table className="nv-table">
              <thead><tr>
                <th>Origen</th><th>Destino</th><th>Contexto</th>
                <th>Duración</th><th>Estado</th><th>Fecha</th>
              </tr></thead>
              <tbody>
                {(cdr?.data||[]).slice(0,8).map((r,i) => (
                  <tr key={i}>
                    <td className="mono">{r.src||'—'}</td>
                    <td className="mono">{r.dst||'—'}</td>
                    <td><span style={{ fontSize:10, color:'var(--text-muted)' }}>{r.dcontext||'—'}</span></td>
                    <td className="mono">{fmtDur(r.billsec)}</td>
                    <td><DispBadge d={r.disposition} /></td>
                    <td style={{ fontSize:10, color:'var(--text-muted)' }}>{fmtDate(r.calldate)}</td>
                  </tr>
                ))}
                {!cdr?.data?.length && (
                  <tr><td colSpan={6} style={{ textAlign:'center', color:'var(--text-muted)', padding:22 }}>
                    Sin registros de llamadas
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Extensiones grid ── */}
      <div className="nv-card" style={{ marginTop:14 }}>
        <div className="nv-card-header">
          <span className="nv-card-title">◎ Extensiones SIP</span>
          <button className="nv-btn nv-btn-ghost nv-btn-sm" onClick={() => navigate('/extensions')}>
            Gestionar →
          </button>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))', gap:8 }}>
          {(ext?.data||[]).slice(0,12).map((e,i) => (
            <div key={i} style={{
              display:'flex', alignItems:'center', gap:9,
              background:'var(--bg-raised)', border:'1px solid var(--border)',
              borderRadius:'var(--r-sm)', padding:'9px 11px',
            }}>
              <div style={{
                width:32, height:32, borderRadius:7,
                background:'var(--brand-subtle)', color:'var(--brand)',
                display:'flex', alignItems:'center', justifyContent:'center',
                fontWeight:700, fontSize:11, fontFamily:'var(--font-mono)', flexShrink:0,
              }}>{String(e.id).slice(-3)}</div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:12, fontWeight:500, color:'var(--text-primary)' }}>
                  Ext. {e.id}
                </div>
                <div style={{ fontSize:10, color:'var(--text-muted)', marginTop:1 }}>
                  {e.allow} · {e.context}
                </div>
              </div>
              <span className="nv-badge nv-badge-ok" style={{ fontSize:9 }}>SIP</span>
            </div>
          ))}
          {!ext?.data?.length && (
            <div style={{ gridColumn:'1/-1', textAlign:'center', color:'var(--text-muted)', padding:24, fontSize:12 }}>
              Sin extensiones registradas
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
