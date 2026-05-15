import { useState } from 'react';
import apiv1 from '../api_v1';

export default function SACLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async e => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const params = new URLSearchParams({ username: email, password });
      const res = await apiv1.post('/auth/login', params, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      });
      if (!['admin','agent'].includes(res.data.role)) {
        setError('Acceso solo para agentes y administradores');
        return;
      }
      localStorage.setItem('token_v1', res.data.access_token);
      window.location.href = '/sac';
    } catch (err) {
      setError(err.response?.data?.detail || 'Credenciales incorrectas');
    } finally { setLoading(false); }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h2 style={styles.title}>Panel Agente SAC</h2>
        <p style={styles.subtitle}>Netvoice — Servicio al Cliente</p>
        {error && <div style={styles.error}>{error}</div>}
        <form onSubmit={handleLogin}>
          <input style={styles.input} type="email" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} required />
          <input style={styles.input} type="password" placeholder="Contraseña" value={password} onChange={e=>setPassword(e.target.value)} required />
          <button style={styles.btn} type="submit" disabled={loading}>
            {loading ? 'Ingresando...' : 'Ingresar →'}
          </button>
        </form>
      </div>
    </div>
  );
}

const styles = {
  container: { minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#0a0e1a', fontFamily:'sans-serif' },
  card: { background:'#111827', border:'1px solid #1f2937', borderRadius:12, padding:'2.5rem 2rem', width:'100%', maxWidth:380, textAlign:'center' },
  title: { color:'#f9fafb', fontSize:22, fontWeight:600, margin:'0 0 0.5rem' },
  subtitle: { color:'#9ca3af', fontSize:13, margin:'0 0 1.5rem' },
  input: { width:'100%', padding:'0.75rem 1rem', marginBottom:'0.75rem', background:'#1f2937', border:'1px solid #374151', borderRadius:8, color:'#f9fafb', fontSize:14, boxSizing:'border-box' },
  btn: { width:'100%', padding:'0.85rem', background:'linear-gradient(135deg,#6366f1,#8b5cf6)', color:'#fff', border:'none', borderRadius:8, fontSize:15, fontWeight:600, cursor:'pointer' },
  error: { background:'#7f1d1d', color:'#fca5a5', padding:'0.75rem', borderRadius:8, marginBottom:'1rem', fontSize:13 }
};
