import { useState, useEffect } from 'react';
import apiv1 from '../api_v1';

export default function PortalPlan() {
  const [plans, setPlans] = useState([]);
  const [selected, setSelected] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const clientId = localStorage.getItem('portal_client_id');

  useEffect(() => {
    apiv1.get('/onboarding/plans').then(r => setPlans(r.data.data)).catch(()=>{});
  }, []);

  const handleSelect = async () => {
    if (!selected) return setError('Selecciona un plan');
    if (!clientId) return setError('Sesión expirada, regístrate de nuevo');
    setLoading(true); setError('');
    try {
      await apiv1.post('/onboarding/select-plan', { client_id: clientId, plan_id: selected });
      window.location.href = '/portal/contrato';
    } catch (err) {
      setError(err.response?.data?.detail || 'Error al seleccionar plan');
    } finally { setLoading(false); }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h2 style={styles.title}>Elige tu plan</h2>
        <p style={styles.subtitle}>Selecciona el plan que mejor se adapte a tus necesidades</p>
        {error && <div style={styles.error}>{error}</div>}
        <div style={styles.grid}>
          {plans.map(p => (
            <div key={p.id}
              onClick={() => setSelected(p.id)}
              style={{...styles.planCard, ...(selected===p.id ? styles.planSelected : {})}}>
              <div style={styles.planName}>{p.name}</div>
              <div style={styles.planPrice}>${parseFloat(p.monthly_fee).toFixed(2)}<span style={styles.planPer}>/mes</span></div>
              <div style={styles.planDetail}>{p.description}</div>
              <div style={styles.planDetail}>{p.included_minutes} min incluidos</div>
              <div style={styles.planDetail}>Hasta {p.max_channels} canales</div>
              {p.plan_type === 'prepaid' && <span style={styles.badge}>Prepago</span>}
              {p.plan_type === 'postpaid' && <span style={{...styles.badge, background:'#1d4ed8'}}>Postpago</span>}
            </div>
          ))}
        </div>
        <button style={{...styles.btn, opacity: (!selected||loading)?0.6:1}} onClick={handleSelect} disabled={!selected||loading}>
          {loading ? 'Procesando...' : 'Continuar con este plan →'}
        </button>
      </div>
    </div>
  );
}

const styles = {
  container: { minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#0a0e1a', fontFamily:'sans-serif', padding:'2rem' },
  card: { background:'#111827', border:'1px solid #1f2937', borderRadius:12, padding:'2.5rem 2rem', width:'100%', maxWidth:700, textAlign:'center' },
  title: { color:'#f9fafb', fontSize:24, fontWeight:600, margin:'0 0 0.5rem' },
  subtitle: { color:'#9ca3af', fontSize:14, margin:'0 0 1.5rem' },
  grid: { display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))', gap:16, marginBottom:'1.5rem' },
  planCard: { background:'#1f2937', border:'2px solid #374151', borderRadius:10, padding:'1.25rem 1rem', cursor:'pointer', transition:'all .2s' },
  planSelected: { border:'2px solid #6366f1', background:'#1e1b4b' },
  planName: { color:'#f9fafb', fontWeight:600, fontSize:16, marginBottom:8 },
  planPrice: { color:'#818cf8', fontSize:28, fontWeight:700, margin:'0.5rem 0' },
  planPer: { fontSize:14, color:'#9ca3af', fontWeight:400 },
  planDetail: { color:'#9ca3af', fontSize:12, marginTop:4 },
  badge: { display:'inline-block', background:'#065f46', color:'#6ee7b7', fontSize:11, padding:'2px 8px', borderRadius:4, marginTop:8 },
  btn: { width:'100%', padding:'0.85rem', background:'linear-gradient(135deg,#6366f1,#8b5cf6)', color:'#fff', border:'none', borderRadius:8, fontSize:15, fontWeight:600, cursor:'pointer' },
  error: { background:'#7f1d1d', color:'#fca5a5', padding:'0.75rem', borderRadius:8, marginBottom:'1rem', fontSize:13 }
};
