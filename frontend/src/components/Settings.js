import { useState } from 'react';
import api from '../api';

export default function Settings() {
  const [current, setCurrent] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState({current:false, new:false, confirm:false});
  const [msg, setMsg] = useState(null);
  const [loading, setLoading] = useState(false);

  const showMsg = (text, type='success') => { setMsg({text,type}); setTimeout(()=>setMsg(null),4000); };

  const handleSubmit = async () => {
    if (!current || !newPwd || !confirm) return showMsg('Todos los campos son requeridos','error');
    if (newPwd !== confirm) return showMsg('Las passwords no coinciden','error');
    if (newPwd.length < 8) return showMsg('La nueva password debe tener al menos 8 caracteres','error');
    if (current === newPwd) return showMsg('La nueva password debe ser diferente a la actual','error');
    setLoading(true);
    try {
      await api.post('/auth/change-password', { current_password: current, new_password: newPwd });
      showMsg('Password actualizada correctamente. Vuelve a iniciar sesion.');
      setCurrent(''); setNewPwd(''); setConfirm('');
    } catch(e) {
      showMsg(e.response?.data?.detail || 'Error al actualizar password','error');
    } finally {
      setLoading(false);
    }
  };

  const Eye = ({show, toggle}) => (
    <button type="button" onClick={toggle}
      style={{position:'absolute',right:10,top:'50%',transform:'translateY(-50%)',background:'none',border:'none',cursor:'pointer',color:'#94a3b8',padding:4,display:'flex',alignItems:'center'}}>
      {show ? (
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
      ) : (
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
      )}
    </button>
  );

  const fields = [
    { label:'Password actual', key:'current', val:current, set:setCurrent },
    { label:'Nueva password', key:'new', val:newPwd, set:setNewPwd },
    { label:'Confirmar nueva password', key:'confirm', val:confirm, set:setConfirm },
  ];

  return (
    <div>
      <div style={{marginBottom:24}}>
        <h1 style={{fontSize:20,fontWeight:700,color:'#0f172a',marginBottom:4}}>Ajustes</h1>
        <p style={{fontSize:13,color:'#94a3b8'}}>Configuracion del panel de administracion</p>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20,alignItems:'start'}}>

        <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:12,overflow:'hidden'}}>
          <div style={{padding:'16px 20px',borderBottom:'1px solid #f1f5f9',background:'#f8fafc'}}>
            <div style={{fontWeight:700,fontSize:15,color:'#0f172a'}}>Cambiar password</div>
            <div style={{fontSize:12,color:'#94a3b8',marginTop:2}}>Actualiza tu password de acceso al panel</div>
          </div>
          <div style={{padding:20}}>
            {msg && (
              <div style={{padding:'10px 14px',borderRadius:8,marginBottom:16,fontSize:13,fontWeight:500,
                background:msg.type==='error'?'#fef2f2':'#f0fdf4',
                color:msg.type==='error'?'#c81e1e':'#057a55',
                border:'1px solid '+(msg.type==='error'?'#fecaca':'#bbf7d0')}}>
                {msg.text}
              </div>
            )}
            <div style={{display:'flex',flexDirection:'column',gap:14}}>
              {fields.map(({label,key,val,set}) => (
                <div key={key}>
                  <label style={{fontSize:11,fontWeight:600,color:'#64748b',textTransform:'uppercase',letterSpacing:'0.5px',marginBottom:5,display:'block'}}>{label}</label>
                  <div style={{position:'relative'}}>
                    <input
                      style={{width:'100%',padding:'8px 40px 8px 12px',border:'1px solid #e2e8f0',borderRadius:7,fontSize:13,fontFamily:'inherit',color:'#0f172a',outline:'none',boxSizing:'border-box'}}
                      type={show[key]?'text':'password'}
                      value={val}
                      onChange={e=>set(e.target.value)}
                      placeholder={key==='current'?'Tu password actual':'Min. 8 caracteres'}
                    />
                    <Eye show={show[key]} toggle={()=>setShow({...show,[key]:!show[key]})} />
                  </div>
                </div>
              ))}
            </div>
            <button onClick={handleSubmit} disabled={loading}
              style={{marginTop:20,width:'100%',padding:'9px',borderRadius:7,border:'none',background:loading?'#93c5fd':'#1d4ed8',color:'#fff',fontSize:13,fontWeight:600,cursor:loading?'not-allowed':'pointer',fontFamily:'inherit'}}>
              {loading ? 'Actualizando...' : 'Actualizar password'}
            </button>
          </div>
        </div>

        <div style={{display:'flex',flexDirection:'column',gap:16}}>
          <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:12,padding:20}}>
            <div style={{fontWeight:700,fontSize:15,color:'#0f172a',marginBottom:12}}>Informacion del sistema</div>
            {[
              {label:'Version API', value:'1.2.0'},
              {label:'Servidor', value:'voip-panel-01'},
              {label:'IP Panel', value:'192.168.0.7'},
              {label:'IP Asterisk', value:'192.168.0.161'},
              {label:'Asterisk', value:'20.19.0'},
              {label:'Base de datos', value:'MySQL 8.0 - asterisk'},
            ].map(({label,value})=>(
              <div key={label} style={{display:'flex',justifyContent:'space-between',padding:'8px 0',borderBottom:'1px solid #f1f5f9'}}>
                <span style={{fontSize:13,color:'#64748b'}}>{label}</span>
                <span style={{fontSize:13,fontWeight:600,color:'#0f172a',fontFamily:'monospace'}}>{value}</span>
              </div>
            ))}
          </div>

          <div style={{background:'#fffbeb',border:'1px solid #fde68a',borderRadius:12,padding:16}}>
            <div style={{fontWeight:600,fontSize:13,color:'#92400e',marginBottom:6}}>Si olvidaste tu password</div>
            <div style={{fontSize:12,color:'#92400e',lineHeight:1.6}}>
              Conéctate a voip-lab-01 (192.168.0.161) y ejecuta:<br/>
              <code style={{background:'#fef3c7',padding:'2px 6px',borderRadius:4,fontSize:11,display:'block',marginTop:6}}>
                sudo mysql -u root -p asterisk
              </code>
              <code style={{background:'#fef3c7',padding:'2px 6px',borderRadius:4,fontSize:11,display:'block',marginTop:4}}>
                UPDATE users SET password_hash='...' WHERE username='admin';
              </code>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
