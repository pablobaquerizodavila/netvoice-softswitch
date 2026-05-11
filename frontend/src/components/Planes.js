import { useState, useEffect } from 'react';
import api from '../api';

export default function Planes() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [msg, setMsg] = useState(null);
  const emptyForm = {nombre:'',descripcion:'',pension_mensual:'',minutos_incluidos:0,minutos_onnet:0,tarifa_local:'',tarifa_regional:'',tarifa_nacional:'',tarifa_celular:'',tarifa_onnet:'0',tarifa_internacional:''};
  const [form, setForm] = useState(emptyForm);

  const load = () => { setLoading(true); api.get('/planes').then(r=>setData(r.data.data||[])).finally(()=>setLoading(false)); };
  useEffect(()=>{ load(); },[]);

  const showMsg = (text,type='success') => { setMsg({text,type}); setTimeout(()=>setMsg(null),4000); };

  const handleSubmit = async () => {
    if (!form.nombre) return showMsg('El nombre es requerido','error');
    try {
      await api.post('/planes', {
        nombre: form.nombre,
        descripcion: form.descripcion,
        pension_mensual: parseFloat(form.pension_mensual)||0,
        minutos_incluidos: parseInt(form.minutos_incluidos)||0,
        minutos_onnet: parseInt(form.minutos_onnet)||0,
        tarifa_local: parseFloat(form.tarifa_local)||0,
        tarifa_regional: parseFloat(form.tarifa_regional)||0,
        tarifa_nacional: parseFloat(form.tarifa_nacional)||0,
        tarifa_celular: parseFloat(form.tarifa_celular)||0,
        tarifa_onnet: parseFloat(form.tarifa_onnet)||0,
        tarifa_internacional: parseFloat(form.tarifa_internacional)||0,
      });
      showMsg('Plan '+form.nombre+' creado');
      setShowForm(false);
      setForm(emptyForm);
      load();
    } catch(e) { showMsg(e.response?.data?.detail||'Error','error'); }
  };

  const handleDelete = async (id, nombre) => {
    if (!window.confirm('Desactivar plan '+nombre+'?')) return;
    try { await api.delete('/planes/'+id); showMsg('Plan desactivado'); load(); }
    catch(e) { showMsg('Error','error'); }
  };

  const f = (v) => parseFloat(v||0).toFixed(4);
  const activos = data.filter(p=>p.activo==='yes');

  if (loading) return <div className="loading">Cargando planes...</div>;

  return (
    <div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:24}}>
        <div>
          <h1 style={{fontSize:20,fontWeight:700,color:'#0f172a',marginBottom:4}}>Planes de cobro</h1>
          <p style={{fontSize:13,color:'#94a3b8'}}>Tarifas comerciales por minuto segun destino</p>
        </div>
        <div style={{display:'flex',gap:10}}>
          <button onClick={load} style={{padding:'7px 14px',borderRadius:7,border:'1px solid #e2e8f0',background:'#f8fafc',color:'#475569',fontSize:13,cursor:'pointer',fontFamily:'inherit'}}>Actualizar</button>
          <button onClick={()=>{setForm(emptyForm);setShowForm(true);}} style={{padding:'7px 16px',borderRadius:7,border:'none',background:'#1d4ed8',color:'#fff',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>+ Nuevo plan</button>
        </div>
      </div>

      {msg && <div style={{padding:'10px 16px',borderRadius:8,marginBottom:16,fontSize:13,fontWeight:500,background:msg.type==='error'?'#fef2f2':'#f0fdf4',color:msg.type==='error'?'#c81e1e':'#057a55',border:'1px solid '+(msg.type==='error'?'#fecaca':'#bbf7d0')}}>{msg.text}</div>}

      <div style={{display:'flex',gap:12,marginBottom:20}}>
        {[{label:'Total planes',val:data.length,bg:'#f1f5f9',color:'#475569'},{label:'Activos',val:activos.length,bg:'#f0fdf4',color:'#057a55'}].map(({label,val,bg,color})=>(
          <div key={label} style={{background:bg,borderRadius:8,padding:'10px 18px',minWidth:120}}>
            <div style={{fontSize:11,color,fontWeight:600,textTransform:'uppercase',letterSpacing:'0.5px',marginBottom:2}}>{label}</div>
            <div style={{fontSize:22,fontWeight:700,color,fontFamily:'monospace'}}>{val}</div>
          </div>
        ))}
      </div>

      {showForm && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.4)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000}}>
          <div style={{background:'#fff',borderRadius:14,padding:28,width:560,boxShadow:'0 20px 60px rgba(0,0,0,0.2)',maxHeight:'90vh',overflowY:'auto'}}>
            <h2 style={{fontSize:17,fontWeight:700,color:'#0f172a',marginBottom:20}}>Nuevo plan de cobro</h2>
            <div style={{display:'flex',flexDirection:'column',gap:14}}>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                <div style={{gridColumn:'1/-1'}}>
                  <label style={lbl}>Nombre del plan *</label>
                  <input style={inp} placeholder="ej. Netvoice Premium" value={form.nombre} onChange={e=>setForm({...form,nombre:e.target.value})} />
                </div>
                <div style={{gridColumn:'1/-1'}}>
                  <label style={lbl}>Descripcion</label>
                  <input style={inp} placeholder="Descripcion opcional" value={form.descripcion} onChange={e=>setForm({...form,descripcion:e.target.value})} />
                </div>
                <div>
                  <label style={lbl}>Pension mensual (USD)</label>
                  <input style={inp} type="number" step="0.01" placeholder="10.00" value={form.pension_mensual} onChange={e=>setForm({...form,pension_mensual:e.target.value})} />
                </div>
                <div>
                  <label style={lbl}>Minutos incluidos</label>
                  <input style={inp} type="number" placeholder="0" value={form.minutos_incluidos} onChange={e=>setForm({...form,minutos_incluidos:e.target.value})} />
                </div>
              </div>
              <div style={{background:'#f8fafc',border:'1px solid #e2e8f0',borderRadius:8,padding:14}}>
                <div style={{fontSize:12,fontWeight:700,color:'#475569',marginBottom:12,textTransform:'uppercase',letterSpacing:'0.5px'}}>Tarifas por destino (USD/min)</div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:10}}>
                  {[{label:'Local',key:'tarifa_local',ph:'0.0185'},{label:'Regional',key:'tarifa_regional',ph:'0.0200'},{label:'Nacional fijo',key:'tarifa_nacional',ph:'0.0200'},{label:'Celular',key:'tarifa_celular',ph:'0.1000'},{label:'Onnet',key:'tarifa_onnet',ph:'0.0000'},{label:'Internacional',key:'tarifa_internacional',ph:'0.0000'}].map(({label,key,ph})=>(
                    <div key={key}>
                      <label style={lbl}>{label}</label>
                      <input style={inp} type="number" step="0.0001" placeholder={ph} value={form[key]} onChange={e=>setForm({...form,[key]:e.target.value})} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div style={{display:'flex',gap:10,marginTop:24,justifyContent:'flex-end'}}>
              <button onClick={()=>setShowForm(false)} style={{padding:'8px 18px',borderRadius:7,border:'1px solid #e2e8f0',background:'#f8fafc',color:'#475569',fontSize:13,cursor:'pointer',fontFamily:'inherit'}}>Cancelar</button>
              <button onClick={handleSubmit} style={{padding:'8px 18px',borderRadius:7,border:'none',background:'#1d4ed8',color:'#fff',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>Crear plan</button>
            </div>
          </div>
        </div>
      )}

      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(340px,1fr))',gap:16}}>
        {data.map((p,i)=>(
          <div key={i} style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:12,overflow:'hidden',opacity:p.activo==='no'?0.6:1}}>
            <div style={{padding:'14px 18px',borderBottom:'1px solid #f1f5f9',background:'#f8fafc',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <div>
                <div style={{fontWeight:700,fontSize:15,color:'#0f172a'}}>{p.nombre}</div>
                <div style={{fontSize:11,color:'#94a3b8',marginTop:2}}>{p.descripcion||'Sin descripcion'}</div>
              </div>
              <div style={{textAlign:'right'}}>
                <div style={{fontSize:11,color:'#94a3b8'}}>Pension mensual</div>
                <div style={{fontSize:18,fontWeight:700,color:'#0f172a',fontFamily:'monospace'}}>${parseFloat(p.pension_mensual).toFixed(2)}</div>
              </div>
            </div>
            <div style={{padding:'14px 18px'}}>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8,marginBottom:12}}>
                {[{label:'Local',val:p.tarifa_local,color:'#1d4ed8'},{label:'Regional',val:p.tarifa_regional,color:'#0369a1'},{label:'Nacional',val:p.tarifa_nacional,color:'#057a55'},{label:'Celular',val:p.tarifa_celular,color:'#b45309'},{label:'Onnet',val:p.tarifa_onnet,color:'#475569'},{label:'Internac.',val:p.tarifa_internacional,color:'#c81e1e'}].map(({label,val,color})=>(
                  <div key={label} style={{background:'#f8fafc',borderRadius:6,padding:'8px 10px',textAlign:'center'}}>
                    <div style={{fontSize:10,color:'#94a3b8',fontWeight:600,textTransform:'uppercase',marginBottom:3}}>{label}</div>
                    <div style={{fontSize:13,fontWeight:700,color,fontFamily:'monospace'}}>${f(val)}</div>
                  </div>
                ))}
              </div>
              <div style={{display:'flex',gap:8}}>
                <div style={{flex:1,background:'#eff6ff',borderRadius:6,padding:'6px 10px',textAlign:'center'}}>
                  <div style={{fontSize:10,color:'#1d4ed8',fontWeight:600,textTransform:'uppercase'}}>Min. incluidos</div>
                  <div style={{fontSize:14,fontWeight:700,color:'#1d4ed8',fontFamily:'monospace'}}>{p.minutos_incluidos}</div>
                </div>
                <div style={{flex:1,background:'#f0fdf4',borderRadius:6,padding:'6px 10px',textAlign:'center'}}>
                  <div style={{fontSize:10,color:'#057a55',fontWeight:600,textTransform:'uppercase'}}>Min. Onnet</div>
                  <div style={{fontSize:14,fontWeight:700,color:'#057a55',fontFamily:'monospace'}}>{p.minutos_onnet}</div>
                </div>
              </div>
            </div>
            <div style={{padding:'10px 18px',borderTop:'1px solid #f1f5f9',display:'flex',justifyContent:'space-between',alignItems:'center',background:'#fafafa'}}>
              <span style={{display:'inline-flex',alignItems:'center',gap:5,fontSize:11,fontWeight:600,padding:'3px 10px',borderRadius:20,background:p.activo==='yes'?'#f0fdf4':'#fef2f2',color:p.activo==='yes'?'#057a55':'#c81e1e'}}>
                <span style={{width:6,height:6,borderRadius:'50%',background:'currentColor',display:'inline-block'}}/>{p.activo==='yes'?'Activo':'Inactivo'}
              </span>
              <button onClick={()=>handleDelete(p.id,p.nombre)} style={{padding:'5px 12px',borderRadius:6,border:'1px solid #fee2e2',background:'#fff',color:'#c81e1e',fontSize:12,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>Desactivar</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const lbl = {fontSize:11,fontWeight:600,color:'#64748b',textTransform:'uppercase',letterSpacing:'0.5px',marginBottom:4,display:'block'};
const inp = {width:'100%',padding:'8px 12px',border:'1px solid #e2e8f0',borderRadius:7,fontSize:13,fontFamily:'inherit',color:'#0f172a',outline:'none',boxSizing:'border-box'};
