import { useState } from 'react';
import apiv1 from '../api_v1';

export default function PortalRegistro() {
  const [form, setForm] = useState({ name:'', ruc:'', email:'', password:'', phone:'' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [clientId, setClientId] = useState('');

  const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async e => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const res = await apiv1.post('/onboarding/register', form);
      setClientId(res.data.client_id);
      localStorage.setItem('portal_client_id', res.data.client_id);
      setDone(true);
    } catch (err) {
      setError(err.response?.data?.detail || 'Error al registrar');
    } finally { setLoading(false); }
  };

  if (done) return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.icon}>✓</div>
        <h2 style={styles.title}>¡Cuenta creada!</h2>
        <p style={styles.subtitle}>Revisa tu email y haz clic en el enlace de verificación para continuar.</p>
        <p style={styles.small}>ID: {clientId}</p>
        <a href="/verificar" style={styles.btn}>Verificar email →</a>
      </div>
    </div>
  );

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <img src="/logo.png" alt="Netvoice" style={styles.logo} onError={e=>e.target.style.display='none'}/>
        <h2 style={styles.title}>Crear cuenta</h2>
        <p style={styles.subtitle}>Contrata tu línea telefónica IP</p>
        {error && <div style={styles.error}>{error}</div>}
        <form onSubmit={handleSubmit}>
          <input style={styles.input} name="name" placeholder="Nombre completo o razón social *" value={form.name} onChange={handleChange} required />
          <input style={styles.input} name="ruc" placeholder="RUC / Cédula" value={form.ruc} onChange={handleChange} />
          <input style={styles.input} name="email" type="email" placeholder="Email *" value={form.email} onChange={handleChange} required />
          <input style={styles.input} name="phone" placeholder="Teléfono de contacto" value={form.phone} onChange={handleChange} />
          <input style={styles.input} name="password" type="password" placeholder="Contraseña (mín. 8 caracteres) *" value={form.password} onChange={handleChange} required />
          <button style={{...styles.btn, opacity: loading ? 0.7 : 1}} type="submit" disabled={loading}>
            {loading ? 'Creando cuenta...' : 'Crear cuenta →'}
          </button>
        </form>
        <p style={styles.small}>¿Ya tienes cuenta? <a href="/login" style={styles.link}>Iniciar sesión</a></p>
      </div>
    </div>
  );
}

const styles = {
  container: { minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#0a0e1a', fontFamily:'sans-serif' },
  card: { background:'#111827', border:'1px solid #1f2937', borderRadius:12, padding:'2.5rem 2rem', width:'100%', maxWidth:420, textAlign:'center' },
  logo: { height:48, marginBottom:'1.5rem' },
  title: { color:'#f9fafb', fontSize:24, fontWeight:600, margin:'0 0 0.5rem' },
  subtitle: { color:'#9ca3af', fontSize:14, margin:'0 0 1.5rem' },
  input: { width:'100%', padding:'0.75rem 1rem', marginBottom:'0.75rem', background:'#1f2937', border:'1px solid #374151', borderRadius:8, color:'#f9fafb', fontSize:14, boxSizing:'border-box' },
  btn: { display:'block', width:'100%', padding:'0.85rem', background:'linear-gradient(135deg,#6366f1,#8b5cf6)', color:'#fff', border:'none', borderRadius:8, fontSize:15, fontWeight:600, cursor:'pointer', textDecoration:'none', marginTop:'0.5rem' },
  error: { background:'#7f1d1d', color:'#fca5a5', padding:'0.75rem', borderRadius:8, marginBottom:'1rem', fontSize:13 },
  small: { color:'#6b7280', fontSize:12, marginTop:'1rem' },
  link: { color:'#818cf8' },
  icon: { fontSize:48, color:'#10b981', marginBottom:'1rem' }
};
