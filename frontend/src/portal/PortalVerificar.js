import { useState, useEffect } from 'react';
import apiv1 from '../api_v1';

export default function PortalVerificar() {
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const t = params.get('token');
    if (t) { setToken(t); handleVerify(t); }
  }, []);

  const handleVerify = async (t) => {
    setLoading(true); setError('');
    try {
      await apiv1.post('/onboarding/verify-email', { token: t || token });
      setDone(true);
    } catch (err) {
      setError(err.response?.data?.detail || 'Token inválido o expirado');
    } finally { setLoading(false); }
  };

  if (done) return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.icon}>✓</div>
        <h2 style={styles.title}>Email verificado</h2>
        <p style={styles.subtitle}>Tu email fue confirmado correctamente.</p>
        <a href="/portal/plan" style={styles.btn}>Seleccionar plan →</a>
      </div>
    </div>
  );

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h2 style={styles.title}>Verificar email</h2>
        <p style={styles.subtitle}>Ingresa el token recibido en tu correo</p>
        {error && <div style={styles.error}>{error}</div>}
        <input style={styles.input} placeholder="Token de verificación" value={token} onChange={e=>setToken(e.target.value)} />
        <button style={styles.btn} onClick={()=>handleVerify()} disabled={loading}>
          {loading ? 'Verificando...' : 'Verificar →'}
        </button>
      </div>
    </div>
  );
}

const styles = {
  container: { minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#0a0e1a', fontFamily:'sans-serif' },
  card: { background:'#111827', border:'1px solid #1f2937', borderRadius:12, padding:'2.5rem 2rem', width:'100%', maxWidth:420, textAlign:'center' },
  title: { color:'#f9fafb', fontSize:24, fontWeight:600, margin:'0 0 0.5rem' },
  subtitle: { color:'#9ca3af', fontSize:14, margin:'0 0 1.5rem' },
  input: { width:'100%', padding:'0.75rem 1rem', marginBottom:'0.75rem', background:'#1f2937', border:'1px solid #374151', borderRadius:8, color:'#f9fafb', fontSize:14, boxSizing:'border-box' },
  btn: { display:'block', width:'100%', padding:'0.85rem', background:'linear-gradient(135deg,#6366f1,#8b5cf6)', color:'#fff', border:'none', borderRadius:8, fontSize:15, fontWeight:600, cursor:'pointer', textDecoration:'none', marginTop:'0.5rem' },
  error: { background:'#7f1d1d', color:'#fca5a5', padding:'0.75rem', borderRadius:8, marginBottom:'1rem', fontSize:13 },
  icon: { fontSize:48, color:'#10b981', marginBottom:'1rem' }
};
