
import { useState, useEffect, useCallback } from 'react';
import apiv1 from '../api_v1';
import api   from '../api';

/* ── helpers ── */
async function safe(fn) { try { return await fn(); } catch { return null; } }

function fmtDate(d) {
  if (!d) return '—';
  try { return new Date(d).toLocaleDateString('es-EC',{day:'2-digit',month:'short',year:'numeric'}); }
  catch { return d; }
}
function fmtDT(d) {
  if (!d) return '—';
  try { return new Date(d).toLocaleString('es-EC',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit',hour12:false}); }
  catch { return d; }
}

const STATUS_COLORS = {
  active:    ['var(--success-bg)','var(--success)'],
  pending:   ['var(--info-bg)',   'var(--info)'   ],
  suspended: ['var(--danger-bg)', 'var(--danger)'  ],
  inactive:  ['var(--bg-hover)',  'var(--text-muted)'],
};
function StatusBadge({ s }) {
  const [bg, color] = STATUS_COLORS[s] || STATUS_COLORS.inactive;
  return <span className="nv-badge" style={{ background:bg, color }}>{s||'—'}</span>;
}

const TABS = ['Resumen','Comercial','Técnico','DIDs','Contrato','Pagos','Historial'];

/* ── Panel detalle ── */
function ClienteDetail({ id, onClose }) {
  const [tab, setTab]     = useState('Resumen');
  const [data, setData]   = useState(null);
  const [busy, setBusy]   = useState(true);
  const [cdr,  setCdr]    = useState(null);
  const [dids, setDids]   = useState(null);
  const [contract, setContract] = useState(null);
  const [payment,  setPayment]  = useState(null);
  const [client,   setClient]   = useState(null);

  const load = useCallback(async () => {
    setBusy(true);
    const [st, di, co, pa, cl] = await Promise.all([
      safe(() => apiv1.get(`/onboarding/status/${id}`)),
      safe(() => apiv1.get(`/did/client/${id}`)),
      safe(() => apiv1.get(`/contracts/status/${id}`)),
      safe(() => apiv1.get(`/payments/status/${id}`)),
      safe(() => api.get(`/clientes`)),
    ]);
    setData(st?.data || null);
    setDids(di?.data || null);
    setContract(co?.data || null);
    setPayment(pa?.data || null);
    // buscar cliente en la lista general
    const lista = cl?.data?.data || [];
    setClient(lista.find(c => c.id == id) || null);
    setBusy(false);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  if (busy) return (
    <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div className="nv-loading"><span className="nv-spinner" /><span>Cargando cliente...</span></div>
    </div>
  );

  const steps = data?.steps || {};
  const progress = data?.progress || '0/0';

  function renderTab() {
    switch(tab) {
      case 'Resumen': return (
        <div>
          {/* Progress bar onboarding */}
          <div className="nv-card" style={{ marginBottom:12 }}>
            <div className="nv-card-header">
              <span className="nv-card-title">Progreso onboarding</span>
              <span style={{ fontFamily:'var(--font-mono)', fontSize:12, color:'var(--brand)' }}>{progress}</span>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))', gap:8 }}>
              {Object.entries(steps).map(([k,v]) => (
                <div key={k} style={{
                  display:'flex', alignItems:'center', gap:8,
                  padding:'8px 10px',
                  background: v ? 'var(--success-bg)' : 'var(--bg-raised)',
                  borderRadius:'var(--r-sm)',
                  border:`1px solid ${v ? 'rgba(0,201,141,0.2)' : 'var(--border)'}`,
                }}>
                  <span style={{ fontSize:14, color: v ? 'var(--success)' : 'var(--text-muted)' }}>{v ? '✓' : '○'}</span>
                  <span style={{ fontSize:11, color: v ? 'var(--success)' : 'var(--text-muted)' }}>
                    {k.replace(/_/g,' ')}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Datos básicos */}
          <div className="nv-card">
            <div className="nv-card-header"><span className="nv-card-title">Datos del cliente</span></div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px 20px' }}>
              {[
                ['ID',          id],
                ['Estado',      <StatusBadge s={data?.status} />],
                ['Origen',      data?.origin || '—'],
                ['Plan',        client?.plan_nombre || '—'],
                ['Crédito límite', client?.credito_limite != null ? `$${parseFloat(client.credito_limite).toFixed(2)}` : '—'],
                ['RUC / CI',    client?.ruc || '—'],
                ['Teléfono',    client?.telefono || '—'],
                ['Ciudad',      client?.ciudad_codigo || '—'],
                ['Tipo cuenta', client?.tipo_cuenta || '—'],
                ['Registrado',  fmtDate(data?.created_at || client?.created_at)],
              ].map(([lbl,val]) => (
                <div key={lbl} style={{ padding:'6px 0', borderBottom:'1px solid var(--border-subtle)' }}>
                  <div style={{ fontSize:9, textTransform:'uppercase', letterSpacing:'.07em', color:'var(--text-muted)', marginBottom:2 }}>{lbl}</div>
                  <div style={{ fontSize:12, color:'var(--text-primary)', fontWeight:500 }}>{val}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      );

      case 'Comercial': return (
        <div className="nv-card">
          <div className="nv-card-header"><span className="nv-card-title">Información comercial</span></div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px 20px' }}>
            {[
              ['Plan contratado',    client?.plan_nombre || '—'],
              ['Pensión mensual',    client?.pension_mensual != null ? `$${parseFloat(client.pension_mensual||0).toFixed(2)}` : '—'],
              ['Límite de crédito',  `$${parseFloat(client?.credito_limite||0).toFixed(2)}`],
              ['Minutos incluidos',  client?.minutos_incluidos || '—'],
              ['Tarifa local',       client?.tarifa_local != null ? `$${client.tarifa_local}/min` : '—'],
              ['Tarifa celular',     client?.tarifa_celular != null ? `$${client.tarifa_celular}/min` : '—'],
              ['Tarifa nacional',    client?.tarifa_nacional != null ? `$${client.tarifa_nacional}/min` : '—'],
              ['Tarifa internacional',client?.tarifa_internacional != null ? `$${client.tarifa_internacional}/min` : '—'],
              ['Estado',             <StatusBadge s={client?.activo === 'yes' ? 'active' : 'inactive'} />],
              ['Tipo identificación',client?.tipo_identificacion || '—'],
            ].map(([lbl,val]) => (
              <div key={lbl} style={{ padding:'6px 0', borderBottom:'1px solid var(--border-subtle)' }}>
                <div style={{ fontSize:9, textTransform:'uppercase', letterSpacing:'.07em', color:'var(--text-muted)', marginBottom:2 }}>{lbl}</div>
                <div style={{ fontSize:12, color:'var(--text-primary)', fontWeight:500 }}>{val}</div>
              </div>
            ))}
          </div>
        </div>
      );

      case 'Técnico': return (
        <div className="nv-card">
          <div className="nv-card-header"><span className="nv-card-title">Configuración técnica SIP</span></div>
          {data?.sip_account ? (
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px 20px' }}>
              {[
                ['Usuario SIP',    data.sip_account.username || '—'],
                ['Dominio',        data.sip_account.domain   || '—'],
                ['Contexto',       data.sip_account.context  || '—'],
                ['Codecs',         data.sip_account.allow    || '—'],
                ['Transporte',     data.sip_account.transport|| '—'],
                ['Canales máx.',   data.sip_account.max_channels || '—'],
                ['CPS máximo',     data.sip_account.max_cps  || '—'],
                ['Estado registro',data.sip_account.registered ? 'Registrado' : 'No registrado'],
              ].map(([lbl,val]) => (
                <div key={lbl} style={{ padding:'6px 0', borderBottom:'1px solid var(--border-subtle)' }}>
                  <div style={{ fontSize:9, textTransform:'uppercase', letterSpacing:'.07em', color:'var(--text-muted)', marginBottom:2 }}>{lbl}</div>
                  <div style={{ fontSize:12, color:'var(--text-primary)', fontWeight:500, fontFamily: lbl==='Usuario SIP'||lbl==='Dominio' ? 'var(--font-mono)' : 'inherit' }}>{val}</div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ textAlign:'center', padding:'32px 0', color:'var(--text-muted)', fontSize:12 }}>
              Sin cuenta SIP configurada aún
            </div>
          )}
        </div>
      );

      case 'DIDs': return (
        <div className="nv-card">
          <div className="nv-card-header">
            <span className="nv-card-title">Números asignados (DIDs)</span>
            <span style={{ fontFamily:'var(--font-mono)', fontSize:11, color:'var(--text-muted)' }}>
              {dids?.dids?.length || 0} números
            </span>
          </div>
          {dids?.dids?.length > 0 ? (
            <div className="nv-table-wrap">
              <table className="nv-table">
                <thead><tr>
                  <th>Número</th><th>Tipo</th><th>Ciudad</th><th>Estado</th><th>Asignado</th>
                </tr></thead>
                <tbody>
                  {dids.dids.map((d,i) => (
                    <tr key={i}>
                      <td className="mono">{d.did_completo || d.numero || '—'}</td>
                      <td><span style={{ fontSize:10, color:'var(--text-muted)' }}>{d.tipo || 'Fijo'}</span></td>
                      <td>{d.ciudad || d.provincia || '—'}</td>
                      <td><span className={`nv-badge ${d.estado==='asignado'?'nv-badge-ok':'nv-badge-muted'}`}>{d.estado||'—'}</span></td>
                      <td style={{ fontSize:10, color:'var(--text-muted)' }}>{fmtDate(d.fecha_asignacion)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ textAlign:'center', padding:'32px 0', color:'var(--text-muted)', fontSize:12 }}>
              Sin DIDs asignados
            </div>
          )}
        </div>
      );

      case 'Contrato': return (
        <div className="nv-card">
          <div className="nv-card-header"><span className="nv-card-title">Contrato</span></div>
          {contract ? (
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px 20px' }}>
              {[
                ['Estado contrato', <span className={`nv-badge ${contract.signed?'nv-badge-ok':'nv-badge-warn'}`}>{contract.signed?'Firmado':'Pendiente'}</span>],
                ['Fecha firma',     fmtDT(contract.signed_at)],
                ['Hash OTP',        contract.contract_hash ? contract.contract_hash.slice(0,16)+'...' : '—'],
                ['IP firma',        contract.signed_ip || '—'],
                ['Plan firmado',    contract.plan_nombre || '—'],
                ['Versión',         contract.version || '—'],
              ].map(([lbl,val]) => (
                <div key={lbl} style={{ padding:'6px 0', borderBottom:'1px solid var(--border-subtle)' }}>
                  <div style={{ fontSize:9, textTransform:'uppercase', letterSpacing:'.07em', color:'var(--text-muted)', marginBottom:2 }}>{lbl}</div>
                  <div style={{ fontSize:12, color:'var(--text-primary)', fontWeight:500 }}>{val}</div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ textAlign:'center', padding:'32px 0', color:'var(--text-muted)', fontSize:12 }}>Sin contrato registrado</div>
          )}
        </div>
      );

      case 'Pagos': return (
        <div className="nv-card">
          <div className="nv-card-header"><span className="nv-card-title">Historial de pagos</span></div>
          {payment ? (
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px 20px', marginBottom:14 }}>
              {[
                ['Estado pago',  <span className={`nv-badge ${payment.paid?'nv-badge-ok':'nv-badge-warn'}`}>{payment.paid?'Pagado':'Pendiente'}</span>],
                ['Monto',        payment.amount != null ? `$${parseFloat(payment.amount).toFixed(2)}` : '—'],
                ['Método',       payment.method || '—'],
                ['Referencia',   payment.reference || payment.transaction_id || '—'],
                ['Fecha pago',   fmtDT(payment.paid_at)],
                ['Gateway',      payment.gateway || 'Sandbox'],
              ].map(([lbl,val]) => (
                <div key={lbl} style={{ padding:'6px 0', borderBottom:'1px solid var(--border-subtle)' }}>
                  <div style={{ fontSize:9, textTransform:'uppercase', letterSpacing:'.07em', color:'var(--text-muted)', marginBottom:2 }}>{lbl}</div>
                  <div style={{ fontSize:12, color:'var(--text-primary)', fontWeight:500 }}>{val}</div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ textAlign:'center', padding:'32px 0', color:'var(--text-muted)', fontSize:12 }}>Sin pagos registrados</div>
          )}
        </div>
      );

      case 'Historial': return (
        <div className="nv-card">
          <div className="nv-card-header"><span className="nv-card-title">Historial de actividad</span></div>
          <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
            {[
              { icon:'◎', label:'Cuenta creada',         date: data?.created_at,        ok: true  },
              { icon:'✉', label:'Email verificado',       date: data?.email_verified_at, ok: steps?.email_verified },
              { icon:'▣', label:'Plan seleccionado',      date: null,                    ok: steps?.plan_selected  },
              { icon:'◈', label:'Contrato firmado (OTP)', date: contract?.signed_at,     ok: contract?.signed      },
              { icon:'◉', label:'Pago procesado',         date: payment?.paid_at,        ok: payment?.paid         },
              { icon:'⊕', label:'SIP activado',           date: null,                    ok: steps?.sip_activated  },
              { icon:'☎', label:'DID asignado',           date: dids?.dids?.[0]?.fecha_asignacion, ok: dids?.dids?.length > 0 },
            ].map(({ icon, label, date, ok }) => (
              <div key={label} style={{
                display:'flex', alignItems:'center', gap:10,
                padding:'8px 10px',
                background: ok ? 'var(--success-bg)' : 'var(--bg-raised)',
                borderRadius:'var(--r-sm)',
                border:`1px solid ${ok ? 'rgba(0,201,141,0.15)' : 'var(--border)'}`,
                opacity: ok ? 1 : 0.5,
              }}>
                <span style={{ fontSize:14, color: ok ? 'var(--success)' : 'var(--text-muted)', width:18, textAlign:'center' }}>{icon}</span>
                <span style={{ flex:1, fontSize:12, color: ok ? 'var(--text-primary)' : 'var(--text-muted)' }}>{label}</span>
                {date && <span style={{ fontSize:10, color:'var(--text-muted)', fontFamily:'var(--font-mono)' }}>{fmtDT(date)}</span>}
                <span style={{ fontSize:10, fontWeight:700, color: ok ? 'var(--success)' : 'var(--text-muted)' }}>{ok ? '✓' : '○'}</span>
              </div>
            ))}
          </div>
        </div>
      );

      default: return null;
    }
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%', overflow:'hidden' }}>
      {/* Header del detalle */}
      <div style={{ padding:'14px 20px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', gap:12, flexShrink:0 }}>
        <div style={{ width:38, height:38, borderRadius:'50%', background:'var(--brand-subtle)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, fontWeight:700, color:'var(--brand)', flexShrink:0 }}>
          {(data?.name||'?').slice(0,2).toUpperCase()}
        </div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:14, fontWeight:700, color:'var(--text-primary)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
            {data?.name || `Cliente #${id}`}
          </div>
          <div style={{ fontSize:11, color:'var(--text-muted)' }}>{data?.email || '—'}</div>
        </div>
        <StatusBadge s={data?.status} />
        <button className="nv-btn nv-btn-ghost nv-btn-sm" onClick={onClose}>✕</button>
      </div>

      {/* Tabs */}
      <div style={{ padding:'8px 14px 0', borderBottom:'1px solid var(--border)', display:'flex', gap:2, flexShrink:0, flexWrap:'wrap' }}>
        {TABS.map(t => (
          <button key={t}
            onClick={() => setTab(t)}
            style={{
              background: tab===t ? 'var(--bg-surface)' : 'transparent',
              border: tab===t ? '1px solid var(--border)' : '1px solid transparent',
              borderBottom: tab===t ? '1px solid var(--bg-surface)' : 'none',
              color: tab===t ? 'var(--brand)' : 'var(--text-secondary)',
              padding:'6px 12px', borderRadius:'var(--r-sm) var(--r-sm) 0 0',
              fontSize:11.5, fontWeight: tab===t ? 700 : 400,
              cursor:'pointer', fontFamily:'var(--font-ui)',
              transition:'all var(--t)',
            }}
          >{t}</button>
        ))}
      </div>

      {/* Contenido tab */}
      <div style={{ flex:1, overflow:'auto', padding:14 }}>
        {renderTab()}
      </div>
    </div>
  );
}

/* ── Componente principal ── */
export default function ClientesV2() {
  const [clientes, setClientes] = useState([]);
  const [loading,  setLoading]  = useState(false);
  const [search,   setSearch]   = useState('');
  const [selected, setSelected] = useState(null);
  const [filter,   setFilter]   = useState('all');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiv1.get('/onboarding/agent/list?limit=200');
      setClientes(res.data.data || []);
    } catch { setClientes([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = clientes.filter(c => {
    const q = search.toLowerCase();
    const matchQ = !q || c.name?.toLowerCase().includes(q) || c.email?.toLowerCase().includes(q);
    const matchF = filter === 'all' || c.status === filter;
    return matchQ && matchF;
  });

  const counts = {
    all:       clientes.length,
    active:    clientes.filter(c => c.status === 'active').length,
    pending:   clientes.filter(c => c.status === 'pending').length,
    suspended: clientes.filter(c => c.status === 'suspended').length,
  };

  return (
    <div>
      {/* Header */}
      <div className="nv-page-header">
        <div>
          <div className="nv-page-title">Gestión de Clientes</div>
          <div className="nv-page-sub">{clientes.length} clientes registrados · Netvoice onboarding</div>
        </div>
        <div className="nv-page-actions">
          <button className="nv-btn nv-btn-secondary nv-btn-sm" onClick={load} disabled={loading}>
            {loading ? <span className="nv-spinner" /> : '↺'} Actualizar
          </button>
        </div>
      </div>

      {/* Filtros rápidos */}
      <div style={{ display:'flex', gap:8, marginBottom:14, flexWrap:'wrap' }}>
        {[
          ['all','Todos',counts.all,'var(--text-muted)'],
          ['active','Activos',counts.active,'var(--success)'],
          ['pending','Pendientes',counts.pending,'var(--info)'],
          ['suspended','Suspendidos',counts.suspended,'var(--danger)'],
        ].map(([key,lbl,cnt,color]) => (
          <button key={key}
            onClick={() => setFilter(key)}
            className={`nv-btn nv-btn-sm ${filter===key ? 'nv-btn-secondary' : 'nv-btn-ghost'}`}
            style={{ borderColor: filter===key ? 'var(--border-active)' : undefined }}
          >
            {lbl}
            <span style={{ fontFamily:'var(--font-mono)', fontSize:10, color }}>{cnt}</span>
          </button>
        ))}
      </div>

      {/* Layout 2 columnas */}
      <div style={{ display:'grid', gridTemplateColumns: selected ? '340px 1fr' : '1fr', gap:14, minHeight:600 }}>

        {/* Lista */}
        <div className="nv-card" style={{ padding:0, display:'flex', flexDirection:'column', overflow:'hidden' }}>
          {/* Buscador */}
          <div style={{ padding:'10px 12px', borderBottom:'1px solid var(--border)' }}>
            <div className="nv-search">
              <span style={{ color:'var(--text-muted)', fontSize:12 }}>⌕</span>
              <input
                placeholder="Buscar por nombre o email..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
              {search && <button onClick={() => setSearch('')} style={{ background:'none', border:'none', color:'var(--text-muted)', cursor:'pointer', fontSize:13 }}>✕</button>}
            </div>
          </div>

          {/* Items */}
          <div style={{ flex:1, overflowY:'auto' }}>
            {loading && <div className="nv-loading"><span className="nv-spinner" /></div>}
            {!loading && filtered.length === 0 && (
              <div style={{ textAlign:'center', padding:'32px 0', color:'var(--text-muted)', fontSize:12 }}>Sin resultados</div>
            )}
            {filtered.map(c => {
              const isActive = selected === c.id;
              const [bg, color] = STATUS_COLORS[c.status] || STATUS_COLORS.inactive;
              return (
                <div key={c.id}
                  onClick={() => setSelected(isActive ? null : c.id)}
                  style={{
                    padding:'10px 14px',
                    borderBottom:'1px solid var(--border-subtle)',
                    cursor:'pointer',
                    background: isActive ? 'var(--brand-subtle)' : 'transparent',
                    borderLeft:`2px solid ${isActive ? 'var(--brand)' : 'transparent'}`,
                    transition:'all var(--t)',
                  }}
                >
                  <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:8 }}>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:12.5, fontWeight:600, color: isActive ? 'var(--brand)' : 'var(--text-primary)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                        {c.name}
                      </div>
                      <div style={{ fontSize:10.5, color:'var(--text-muted)', marginTop:1, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                        {c.email}
                      </div>
                      <div style={{ fontSize:10, color:'var(--text-muted)', marginTop:2 }}>
                        {c.origin} · {fmtDate(c.created_at)}
                      </div>
                    </div>
                    <span className="nv-badge" style={{ background:bg, color, flexShrink:0 }}>{c.status}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer lista */}
          <div style={{ padding:'8px 14px', borderTop:'1px solid var(--border)', fontSize:10, color:'var(--text-muted)', textAlign:'center' }}>
            {filtered.length} de {clientes.length} clientes
          </div>
        </div>

        {/* Detalle */}
        {selected && (
          <div className="nv-card" style={{ padding:0, overflow:'hidden' }}>
            <ClienteDetail id={selected} onClose={() => setSelected(null)} />
          </div>
        )}
      </div>
    </div>
  );
}
