import { useState, useEffect } from 'react';
import apiv1 from '../api_v1';

export default function PortalActivacion() {
  const [status, setStatus] = useState('activating');
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const clientId = localStorage.getItem('portal_client_id');

  useEffect(() => {
    if (!clientId) return;
    activate();
  }, []);

  const activate = async () => {
    try {
      const res = await apiv1.post(`/activation/activate/${clientId}`);
      setData(res.data);
      setStatus('done');
    } catch (err) {
      const msg = err.response?.data?.detail || '';
      if (msg.includes('already_active') || err.response?.status === 200) {
        const r2 = await apiv1.get(`/activation/status/${clientId}`);
        setData(r2.data); setStatus('done');
      } else {
        setError(msg || 'Error al activar la línea');
        setStatus('error');
      }
    }
  };

  if (status === 'activating') return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.spinner}/>
        <h2 style={styles.title}>Activando tu línea...</h2>
        <p style={styles.subtitle}>Estamos configurando tu servicio VoIP</p>
      </div>
    </div>
  );

  if (status === 'error') return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={{fontSize:48, color:'#ef4444', marginBottom:'1rem'}}>✗</div>
        <h2 style={styles.title}>Error de activación</h2>
        <p style={styles.error}>{error}</p>
        <button style={styles.btn} onClick={activate}>Reintentar</button>
      </div>
    </div>
  );

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.icon}>✓</div>
        <h2 style={styles.title}>¡Línea activada!</h2>
        <p style={styles.subtitle}>Tu servicio VoIP está listo para usar</p>

        <div style={styles.credsBox}>
          <div style={styles.credRow}>
            <span style={styles.credLabel}>Servidor SIP</span>
            <span style={styles.credValue}>{data?.sip_server}</span>
          </div>
          <div style={styles.credRow}>
            <span style={styles.credLabel}>Puerto</span>
            <span style={styles.credValue}>{data?.sip_port || 5060}</span>
          </div>
          <div style={styles.credRow}>
            <span style={styles.credLabel}>Usuario SIP</span>
            <span style={styles.credValue}>{data?.sip_user}</span>
          </div>
          <div style={styles.credRow}>
            <span style={styles.credLabel}>Contraseña</span>
            <span style={styles.credValue}>{data?.sip_password}</span>
          </div>
          <div style={styles.credRow}>
            <span style={styles.credLabel}>Número DID</span>
            <span style={{...styles.credValue, color:'#34d399'}}>{data?.did_number}</span>
          </div>
          <div style={styles.credRow}>
            <span style={styles.credLabel}>Codecs</span>
            <span style={styles.credValue}>{data?.codecs}</span>
          </div>
        </div>

        <p style={styles.warn}>⚠ Guarda estas credenciales — no se mostrarán de nuevo</p>
        <button style={styles.btn} onClick={() => window.print()}>Imprimir credenciales</button>
      </div>
    </div>
  );
}

const styles = {
  container: { minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#0a0e1a', fontFamily:'sans-serif', padding:'2rem' },
  card: { background:'#111827', border:'1px solid #1f2937', borderRadius:12, padding:'2.5rem 2rem', width:'100%', maxWidth:480, textAlign:'center' },
  title: { color:'#f9fafb', fontSize:22, fontWeight:600, margin:'0 0 0.5rem' },
  subtitle: { color:'#9ca3af', fontSize:14, margin:'0 0 1.5rem' },
  icon: { fontSize:48, color:'#10b981', marginBottom:'1rem' },
  spinner: { width:48, height:48, border:'4px solid #1f2937', borderTop:'4px solid #6366f1', borderRadius:'50%', animation:'spin 1s linear infinite', margin:'0 auto 1.5rem' },
  credsBox: { background:'#0f172a', border:'1px solid #1e293b', borderRadius:10, padding:'1.25rem', marginBottom:'1.5rem', textAlign:'left' },
  credRow: { display:'flex', justifyContent:'space-between', padding:'0.5rem 0', borderBottom:'1px solid #1e293b' },
  credLabel: { color:'#6b7280', fontSize:13 },
  credValue: { color:'#e2e8f0', fontSize:13, fontFamily:'monospace', fontWeight:600 },
  warn: { color:'#f59e0b', fontSize:12, marginBottom:'1rem' },
  btn: { width:'100%', padding:'0.85rem', background:'linear-gradient(135deg,#6366f1,#8b5cf6)', color:'#fff', border:'none', borderRadius:8, fontSize:15, fontWeight:600, cursor:'pointer' },
  error: { background:'#7f1d1d', color:'#fca5a5', padding:'0.75rem', borderRadius:8, marginBottom:'1rem', fontSize:13 }
};
