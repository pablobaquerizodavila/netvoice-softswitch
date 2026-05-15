import { useState, useEffect } from 'react';
import apiv1 from '../api_v1';

export default function PortalContrato() {
  const [preview, setPreview] = useState(null);
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState('preview');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [scrolled, setScrolled] = useState(false);
  const clientId = localStorage.getItem('portal_client_id');

  useEffect(() => {
    if (!clientId) return;
    apiv1.get(`/contracts/preview/${clientId}`)
      .then(r => setPreview(r.data))
      .catch(() => setError('No se pudo cargar el contrato'));
  }, [clientId]);

  const requestOtp = async () => {
    setLoading(true); setError('');
    try {
      await apiv1.post('/contracts/request-otp', { client_id: clientId });
      setStep('sign');
    } catch (err) {
      setError(err.response?.data?.detail || 'Error al enviar OTP');
    } finally { setLoading(false); }
  };

  const signContract = async () => {
    setLoading(true); setError('');
    try {
      await apiv1.post('/contracts/sign', { client_id: clientId, otp_code: otp });
      window.location.href = '/portal/pago';
    } catch (err) {
      setError(err.response?.data?.detail || 'OTP inválido');
    } finally { setLoading(false); }
  };

  const handleScroll = e => {
    const el = e.target;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 20) setScrolled(true);
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h2 style={styles.title}>Contrato de servicio</h2>
        <p style={styles.subtitle}>Lee el contrato completo antes de firmar</p>
        {error && <div style={styles.error}>{error}</div>}

        {preview && (
          <div style={styles.contractBox} onScroll={handleScroll}>
            <pre style={styles.contractText}>{preview.contract}</pre>
          </div>
        )}

        {!scrolled && <p style={styles.hint}>↓ Desplázate hasta el final para continuar</p>}

        {step === 'preview' && scrolled && (
          <button style={styles.btn} onClick={requestOtp} disabled={loading}>
            {loading ? 'Enviando código...' : 'Aceptar y firmar digitalmente →'}
          </button>
        )}

        {step === 'sign' && (
          <div style={{marginTop:'1rem'}}>
            <p style={styles.subtitle}>Ingresa el código OTP enviado a tu email</p>
            <input style={styles.input} placeholder="Código de 6 dígitos" value={otp} onChange={e=>setOtp(e.target.value)} maxLength={6} />
            <button style={styles.btn} onClick={signContract} disabled={loading||otp.length!==6}>
              {loading ? 'Firmando...' : 'Confirmar firma →'}
            </button>
          </div>
        )}

        {preview && <p style={styles.hash}>Hash: {preview.doc_hash?.substring(0,20)}...</p>}
      </div>
    </div>
  );
}

const styles = {
  container: { minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#0a0e1a', fontFamily:'sans-serif', padding:'2rem' },
  card: { background:'#111827', border:'1px solid #1f2937', borderRadius:12, padding:'2rem', width:'100%', maxWidth:640 },
  title: { color:'#f9fafb', fontSize:22, fontWeight:600, margin:'0 0 0.5rem', textAlign:'center' },
  subtitle: { color:'#9ca3af', fontSize:13, margin:'0 0 1rem', textAlign:'center' },
  contractBox: { background:'#0f172a', border:'1px solid #1e293b', borderRadius:8, height:320, overflowY:'auto', marginBottom:'1rem', padding:'1rem' },
  contractText: { color:'#cbd5e1', fontSize:12, lineHeight:1.7, whiteSpace:'pre-wrap', margin:0 },
  input: { width:'100%', padding:'0.75rem 1rem', marginBottom:'0.75rem', background:'#1f2937', border:'1px solid #374151', borderRadius:8, color:'#f9fafb', fontSize:16, boxSizing:'border-box', textAlign:'center', letterSpacing:8 },
  btn: { width:'100%', padding:'0.85rem', background:'linear-gradient(135deg,#6366f1,#8b5cf6)', color:'#fff', border:'none', borderRadius:8, fontSize:15, fontWeight:600, cursor:'pointer' },
  error: { background:'#7f1d1d', color:'#fca5a5', padding:'0.75rem', borderRadius:8, marginBottom:'1rem', fontSize:13 },
  hint: { color:'#6b7280', fontSize:12, textAlign:'center', marginBottom:'0.5rem' },
  hash: { color:'#374151', fontSize:10, textAlign:'center', marginTop:'1rem', fontFamily:'monospace' }
};
