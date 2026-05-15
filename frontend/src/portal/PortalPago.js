import { useState } from 'react';
import apiv1 from '../api_v1';

const TEST_CARDS = [
  { number:'4111111111111111', label:'Visa — Aprobada', color:'#065f46' },
  { number:'4000000000000002', label:'Visa — Rechazada', color:'#7f1d1d' },
];

export default function PortalPago() {
  const [card, setCard] = useState('4111111111111111');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const clientId = localStorage.getItem('portal_client_id');

  const handlePay = async () => {
    setLoading(true); setError('');
    try {
      const initRes = await apiv1.post('/payments/init', {
        client_id: clientId, amount: 5.00, gateway: 'sandbox'
      });
      const payRes = await apiv1.post('/payments/sandbox/pay', {
        payment_id: initRes.data.payment_id, card_number: card
      });
      setResult(payRes.data);
      if (payRes.data.status === 'approved') {
        setTimeout(() => window.location.href = '/portal/activacion', 2000);
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Error en el pago');
    } finally { setLoading(false); }
  };

  if (result?.status === 'approved') return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.icon}>✓</div>
        <h2 style={styles.title}>¡Pago aprobado!</h2>
        <p style={styles.subtitle}>Ref: {result.gateway_ref}</p>
        <p style={styles.subtitle}>Activando tu línea...</p>
      </div>
    </div>
  );

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h2 style={styles.title}>Pago de activación</h2>
        <p style={styles.subtitle}>Monto: <strong style={{color:'#818cf8'}}>$5.00 USD</strong></p>
        {error && <div style={styles.error}>{error}</div>}

        <div style={styles.section}>
          <p style={styles.label}>Selecciona tarjeta de prueba:</p>
          {TEST_CARDS.map(tc => (
            <div key={tc.number}
              onClick={() => setCard(tc.number)}
              style={{...styles.cardOpt, ...(card===tc.number?{border:`2px solid #6366f1`}:{})}}>
              <span style={{...styles.cardDot, background: tc.color}}/>
              <span style={styles.cardLabel}>{tc.label}</span>
              <span style={styles.cardNum}>...{tc.number.slice(-4)}</span>
            </div>
          ))}
        </div>

        <button style={{...styles.btn, opacity:loading?0.7:1}} onClick={handlePay} disabled={loading}>
          {loading ? 'Procesando pago...' : 'Pagar $5.00 →'}
        </button>
        <p style={styles.small}>Ambiente de pruebas — no se realizan cobros reales</p>
      </div>
    </div>
  );
}

const styles = {
  container: { minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#0a0e1a', fontFamily:'sans-serif', padding:'2rem' },
  card: { background:'#111827', border:'1px solid #1f2937', borderRadius:12, padding:'2.5rem 2rem', width:'100%', maxWidth:440, textAlign:'center' },
  title: { color:'#f9fafb', fontSize:22, fontWeight:600, margin:'0 0 0.5rem' },
  subtitle: { color:'#9ca3af', fontSize:14, margin:'0 0 1.5rem' },
  section: { textAlign:'left', marginBottom:'1.5rem' },
  label: { color:'#9ca3af', fontSize:13, marginBottom:'0.75rem' },
  cardOpt: { display:'flex', alignItems:'center', gap:10, background:'#1f2937', border:'2px solid #374151', borderRadius:8, padding:'0.75rem 1rem', marginBottom:'0.5rem', cursor:'pointer' },
  cardDot: { width:12, height:12, borderRadius:'50%', flexShrink:0 },
  cardLabel: { color:'#f9fafb', fontSize:14, flex:1 },
  cardNum: { color:'#6b7280', fontSize:13, fontFamily:'monospace' },
  btn: { width:'100%', padding:'0.85rem', background:'linear-gradient(135deg,#6366f1,#8b5cf6)', color:'#fff', border:'none', borderRadius:8, fontSize:15, fontWeight:600, cursor:'pointer' },
  error: { background:'#7f1d1d', color:'#fca5a5', padding:'0.75rem', borderRadius:8, marginBottom:'1rem', fontSize:13 },
  small: { color:'#4b5563', fontSize:11, marginTop:'1rem' },
  icon: { fontSize:48, color:'#10b981', marginBottom:'1rem' }
};
