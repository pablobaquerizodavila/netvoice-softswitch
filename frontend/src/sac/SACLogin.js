import { useState } from 'react';
import apiv1 from '../api_v1';


function EyeIcon({ show }) {
  return show ? (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/>
      <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  ) : (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  );
}

export default function SACLogin() {
  const [email, setEmail] = useState('');
  const [showPwd, setShowPwd] = useState(false);
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
          <div style={{ position:"relative", display:"flex", alignItems:"center" }}>
          <input style={{...styles.input, paddingRight:36}} type={showPwd?"text":"password"} placeholder="Contraseña" value={password} onChange={e=>setPassword(e.target.value)} required />
          <button type="button" style={{ position:"absolute", right:10, background:"none", border:"none", cursor:"pointer", color:"#666", display:"flex", alignItems:"center", padding:0 }} onClick={()=>setShowPwd(v=>!v)}><EyeIcon show={showPwd}/></button>
        </div>
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
