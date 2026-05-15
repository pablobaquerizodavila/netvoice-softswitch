import { useState, useEffect } from 'react';
import apiv1 from '../api_v1';

export default function SACDashboard() {
  const [tab, setTab] = useState('nuevo');
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(false);
  const token = localStorage.getItem('token_v1');

  useEffect(() => { if (tab === 'lista') loadClientes(); }, [tab]);

  const loadClientes = async () => {
    setLoading(true);
    try {
      const res = await apiv1.get('/onboarding/agent/list');
      setClientes(res.data.data || []);
    } catch { setClientes([]); }
    finally { setLoading(false); }
  };

  if (!token) return <div style={styles.center}><a href="/sac/login" style={styles.btn}>Iniciar sesión como agente →</a></div>;

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <span style={styles.logo}>Netvoice SAC</span>
        <div style={styles.tabs}>
          {['nuevo','lista'].map(t => (
            <button key={t} onClick={()=>setTab(t)}
              style={{...styles.tab, ...(tab===t?styles.tabActive:{})}}>
              {t === 'nuevo' ? '+ Nuevo cliente' : 'Clientes en proceso'}
            </button>
          ))}
        </div>
        <button onClick={()=>{localStorage.removeItem('token_v1');window.location.reload();}} style={styles.logout}>Salir</button>
      </div>

      <div style={styles.content}>
        {tab === 'nuevo' && <SACRegistroAsistido />}
        {tab === 'lista' && <SACListaClientes clientes={clientes} loading={loading} onRefresh={loadClientes} />}
      </div>
    </div>
  );
}

function SACRegistroAsistido() {
  const [form, setForm] = useState({ name:'', ruc:'', email:'', phone:'', plan_id:'', observations:'' });
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [step, setStep] = useState('form');

  useEffect(() => {
    apiv1.get('/onboarding/plans').then(r => setPlans(r.data.data || [])).catch(()=>{});
  }, []);

  const handleChange = e => setForm({...form, [e.target.name]: e.target.value});

  const handleSubmit = async e => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const res = await apiv1.post('/onboarding/agent/register', form);
      setResult(res.data);
      setStep('done');
    } catch (err) {
      setError(err.response?.data?.detail || 'Error al registrar cliente');
    } finally { setLoading(false); }
  };

  if (step === 'done') return (
    <div style={styles.resultCard}>
      <div style={styles.successIcon}>✓</div>
      <h3 style={styles.cardTitle}>Cliente registrado</h3>
      <p style={styles.cardSub}>ID: <code>{result?.client_id}</code></p>
      <p style={styles.cardSub}>Siguiente paso: firma de contrato</p>
      <SACContrato clientId={result?.client_id} />
    </div>
  );

  return (
    <div style={styles.formCard}>
      <h3 style={styles.cardTitle}>Registro asistido de cliente</h3>
      <p style={styles.cardSub}>Completa los datos del cliente que estás atendiendo</p>
      {error && <div style={styles.errorBox}>{error}</div>}
      <form onSubmit={handleSubmit} style={styles.formGrid}>
        <div style={styles.formGroup}>
          <label style={styles.label}>Nombre / Razón social *</label>
          <input style={styles.input} name="name" value={form.name} onChange={handleChange} required />
        </div>
        <div style={styles.formGroup}>
          <label style={styles.label}>RUC / Cédula</label>
          <input style={styles.input} name="ruc" value={form.ruc} onChange={handleChange} />
        </div>
        <div style={styles.formGroup}>
          <label style={styles.label}>Email *</label>
          <input style={styles.input} name="email" type="email" value={form.email} onChange={handleChange} required />
        </div>
        <div style={styles.formGroup}>
          <label style={styles.label}>Teléfono</label>
          <input style={styles.input} name="phone" value={form.phone} onChange={handleChange} />
        </div>
        <div style={{...styles.formGroup, gridColumn:'1 / -1'}}>
          <label style={styles.label}>Plan</label>
          <select style={styles.input} name="plan_id" value={form.plan_id} onChange={handleChange}>
            <option value="">-- Seleccionar plan --</option>
            {plans.map(p => <option key={p.id} value={p.id}>{p.name} — ${parseFloat(p.monthly_fee).toFixed(2)}/mes</option>)}
          </select>
        </div>
        <div style={{...styles.formGroup, gridColumn:'1 / -1'}}>
          <label style={styles.label}>Observaciones</label>
          <textarea style={{...styles.input, height:80, resize:'vertical'}} name="observations" value={form.observations} onChange={handleChange} />
        </div>
        <div style={{gridColumn:'1 / -1'}}>
          <button style={{...styles.btn, opacity:loading?0.7:1}} type="submit" disabled={loading}>
            {loading ? 'Registrando...' : 'Registrar cliente →'}
          </button>
        </div>
      </form>
    </div>
  );
}

function SACContrato({ clientId }) {
  const [step, setStep] = useState('idle');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [signed, setSigned] = useState(false);

  const requestOtp = async () => {
    setLoading(true); setError('');
    try {
      await apiv1.post('/contracts/request-otp', { client_id: clientId });
      setStep('otp');
    } catch (err) { setError(err.response?.data?.detail || 'Error'); }
    finally { setLoading(false); }
  };

  const signContract = async () => {
    setLoading(true); setError('');
    try {
      await apiv1.post('/contracts/sign', { client_id: clientId, otp_code: otp });
      setSigned(true);
    } catch (err) { setError(err.response?.data?.detail || 'OTP inválido'); }
    finally { setLoading(false); }
  };

  if (signed) return (
    <div style={{marginTop:'1rem'}}>
      <p style={{color:'#34d399'}}>✓ Contrato firmado</p>
      <SACPago clientId={clientId} />
    </div>
  );

  return (
    <div style={{marginTop:'1.5rem', borderTop:'1px solid #1f2937', paddingTop:'1.5rem'}}>
      <h4 style={styles.cardTitle}>Firma de contrato</h4>
      {error && <div style={styles.errorBox}>{error}</div>}
      {step === 'idle' && (
        <button style={styles.btnSecondary} onClick={requestOtp} disabled={loading}>
          {loading ? 'Enviando OTP...' : 'Enviar OTP al cliente →'}
        </button>
      )}
      {step === 'otp' && (
        <div>
          <p style={styles.cardSub}>OTP enviado al email del cliente</p>
          <input style={{...styles.input, maxWidth:200, textAlign:'center', letterSpacing:8}}
            placeholder="000000" value={otp} onChange={e=>setOtp(e.target.value)} maxLength={6} />
          <button style={{...styles.btnSecondary, marginLeft:8}} onClick={signContract} disabled={loading||otp.length!==6}>
            {loading ? 'Firmando...' : 'Confirmar firma'}
          </button>
        </div>
      )}
    </div>
  );
}

function SACPago({ clientId }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [paid, setPaid] = useState(false);
  const [activating, setActivating] = useState(false);
  const [activated, setActivated] = useState(null);

  const processPago = async () => {
    setLoading(true); setError('');
    try {
      const init = await apiv1.post('/payments/init', { client_id: clientId, amount: 5.00, gateway: 'sandbox' });
      const pay  = await apiv1.post('/payments/sandbox/pay', { payment_id: init.data.payment_id, card_number: '4111111111111111' });
      if (pay.data.status === 'approved') {
        setPaid(true);
        activateLine();
      } else { setError('Pago rechazado'); }
    } catch (err) { setError(err.response?.data?.detail || 'Error en pago'); }
    finally { setLoading(false); }
  };

  const activateLine = async () => {
    setActivating(true);
    try {
      const res = await apiv1.post(`/activation/activate/${clientId}`);
      setActivated(res.data);
    } catch (err) { setError('Error en activación: ' + (err.response?.data?.detail || '')); }
    finally { setActivating(false); }
  };

  if (activated) return (
    <div style={{marginTop:'1rem', background:'#0f172a', borderRadius:8, padding:'1rem'}}>
      <p style={{color:'#34d399', fontWeight:600}}>✓ Línea activada</p>
      <p style={styles.cardSub}>SIP: <code>{activated.sip_user}</code> | DID: <code>{activated.did_number}</code></p>
      <p style={{color:'#f59e0b', fontSize:12}}>Entrega estas credenciales al cliente</p>
    </div>
  );

  return (
    <div style={{marginTop:'1.5rem', borderTop:'1px solid #1f2937', paddingTop:'1.5rem'}}>
      <h4 style={styles.cardTitle}>Procesar pago y activar</h4>
      {error && <div style={styles.errorBox}>{error}</div>}
      {activating && <p style={styles.cardSub}>Activando línea...</p>}
      {!paid && (
        <button style={styles.btn} onClick={processPago} disabled={loading}>
          {loading ? 'Procesando...' : 'Procesar pago y activar línea →'}
        </button>
      )}
    </div>
  );
}

function SACListaClientes({ clientes, loading, onRefresh }) {
  const [search, setSearch] = useState('');
  const filtered = clientes.filter(c =>
    c.name?.toLowerCase().includes(search.toLowerCase()) ||
    c.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={styles.formCard}>
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1rem'}}>
        <h3 style={styles.cardTitle}>Clientes en proceso</h3>
        <button style={styles.btnSecondary} onClick={onRefresh}>↻ Actualizar</button>
      </div>
      <input style={{...styles.input, marginBottom:'1rem'}}
        placeholder="Buscar por nombre o email..."
        value={search} onChange={e=>setSearch(e.target.value)} />
      {loading && <p style={styles.cardSub}>Cargando...</p>}
      {filtered.map(c => (
        <div key={c.id} style={styles.clientRow}>
          <div>
            <p style={styles.clientName}>{c.name}</p>
            <p style={styles.clientEmail}>{c.email}</p>
          </div>
          <div style={{textAlign:'right'}}>
            <span style={{...styles.badge, background: c.status==='active'?'#065f46':'#1e3a5f'}}>
              {c.status}
            </span>
            <p style={styles.clientEmail}>{c.origin}</p>
          </div>
        </div>
      ))}
      {!loading && filtered.length === 0 && <p style={styles.cardSub}>No hay clientes</p>}
    </div>
  );
}

const styles = {
  container: { minHeight:'100vh', background:'#0a0e1a', fontFamily:'sans-serif' },
  header: { background:'#111827', borderBottom:'1px solid #1f2937', padding:'1rem 2rem', display:'flex', alignItems:'center', gap:'1.5rem' },
  logo: { color:'#818cf8', fontWeight:700, fontSize:18, marginRight:'auto' },
  tabs: { display:'flex', gap:8 },
  tab: { background:'transparent', border:'1px solid #374151', color:'#9ca3af', padding:'0.5rem 1rem', borderRadius:6, cursor:'pointer', fontSize:13 },
  tabActive: { background:'#1e1b4b', border:'1px solid #6366f1', color:'#818cf8' },
  logout: { background:'transparent', border:'1px solid #374151', color:'#6b7280', padding:'0.4rem 0.8rem', borderRadius:6, cursor:'pointer', fontSize:12 },
  content: { padding:'2rem', maxWidth:800, margin:'0 auto' },
  center: { minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#0a0e1a' },
  formCard: { background:'#111827', border:'1px solid #1f2937', borderRadius:12, padding:'2rem' },
  resultCard: { background:'#111827', border:'1px solid #1f2937', borderRadius:12, padding:'2rem', textAlign:'center' },
  successIcon: { fontSize:48, color:'#10b981', marginBottom:'1rem' },
  cardTitle: { color:'#f9fafb', fontSize:18, fontWeight:600, margin:'0 0 0.5rem' },
  cardSub: { color:'#9ca3af', fontSize:13, margin:'0 0 1rem' },
  formGrid: { display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1rem' },
  formGroup: { display:'flex', flexDirection:'column', gap:4 },
  label: { color:'#9ca3af', fontSize:12 },
  input: { background:'#1f2937', border:'1px solid #374151', borderRadius:6, padding:'0.6rem 0.8rem', color:'#f9fafb', fontSize:14, width:'100%', boxSizing:'border-box' },
  btn: { width:'100%', padding:'0.8rem', background:'linear-gradient(135deg,#6366f1,#8b5cf6)', color:'#fff', border:'none', borderRadius:8, fontSize:14, fontWeight:600, cursor:'pointer' },
  btnSecondary: { padding:'0.6rem 1.2rem', background:'#1f2937', border:'1px solid #374151', color:'#e2e8f0', borderRadius:6, fontSize:13, cursor:'pointer' },
  errorBox: { background:'#7f1d1d', color:'#fca5a5', padding:'0.6rem', borderRadius:6, marginBottom:'0.75rem', fontSize:13 },
  clientRow: { display:'flex', justifyContent:'space-between', alignItems:'center', padding:'0.75rem', borderBottom:'1px solid #1f2937' },
  clientName: { color:'#f9fafb', fontSize:14, fontWeight:500, margin:0 },
  clientEmail: { color:'#6b7280', fontSize:12, margin:'2px 0 0' },
  badge: { display:'inline-block', color:'#6ee7b7', fontSize:11, padding:'2px 8px', borderRadius:4 }
};
