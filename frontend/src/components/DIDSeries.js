import { useState, useEffect } from 'react';
import api from '../api';

export default function DIDSeries() {
  const [ranges, setRanges] = useState([]);
  const [asignados, setAsignados] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [trunks, setTrunks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('rangos');
  const [searchDid, setSearchDid] = useState('');
  const [showAsignar, setShowAsignar] = useState(false);
  const [showRango, setShowRango] = useState(false);
  const [msg, setMsg] = useState(null);

  const emptyAsignar = {provincia:'',codigo_area:'',cliente_id:'',trunk_id:'',did_especifico:''};
  const emptyRango = {provincia:'',cod_provincia:'',codigo_area:'',serie_inicio:'',serie_fin:'',cantidad_total:'',resolucion_arcotel:'',fecha_resolucion:''};
  const [formAsignar, setFormAsignar] = useState(emptyAsignar);
  const [formRango, setFormRango] = useState(emptyRango);

  const load = () => {
    setLoading(true);
    Promise.all([
      api.get('/did-ranges'),
      api.get('/did-asignados'),
      api.get('/clientes'),
      api.get('/trunks'),
    ]).then(([r,a,c,t]) => {
      setRanges(r.data.data||[]);
      setAsignados(a.data.data||[]);
      setClientes(c.data.data||[]);
      setTrunks(t.data.data||[]);
    }).finally(()=>setLoading(false));
  };
  useEffect(()=>{ load(); },[]);

  const showMsg = (text,type='success') => { setMsg({text,type}); setTimeout(()=>setMsg(null),4000); };

  const handleAsignar = async () => {
    if (!formAsignar.cliente_id) return showMsg('Selecciona un cliente','error');
    if (!formAsignar.provincia && !formAsignar.codigo_area && !formAsignar.did_especifico)
      return showMsg('Selecciona provincia, codigo de area o DID especifico','error');
    try {
      const res = await api.post('/did-asignados/asignar', {
        ...formAsignar,
        cliente_id: parseInt(formAsignar.cliente_id),
        trunk_id: formAsignar.trunk_id ? parseInt(formAsignar.trunk_id) : null,
      });
      showMsg('DID asignado: '+res.data.did_asignado);
      setShowAsignar(false);
      setFormAsignar(emptyAsignar);
      load();
    } catch(e) { showMsg(e.response?.data?.detail||'Error','error'); }
  };

  const handleNuevoRango = async () => {
    if (!formRango.provincia || !formRango.serie_inicio || !formRango.serie_fin)
      return showMsg('Provincia, serie inicio y fin son requeridos','error');
    try {
      await api.post('/did-ranges', {...formRango, cantidad_total: parseInt(formRango.cantidad_total)||0});
      showMsg('Rango ARCOTEL agregado correctamente');
      setShowRango(false);
      setFormRango(emptyRango);
      load();
    } catch(e) { showMsg(e.response?.data?.detail||'Error','error'); }
  };

  const handleLiberar = async (id, did) => {
    if (!window.confirm('Liberar DID '+did+'?')) return;
    try { await api.delete('/did-asignados/'+id); showMsg('DID '+did+' liberado'); load(); }
    catch(e) { showMsg('Error','error'); }
  };

  const totalDids = ranges.reduce((s,r)=>s+r.cantidad_total,0);
  const totalUsados = ranges.reduce((s,r)=>s+r.cantidad_usada,0);
  const totalDisponibles = totalDids - totalUsados;

  const provincias = [...new Set(ranges.map(r=>r.provincia))].sort();

  if (loading) return <div className="loading">Cargando series DID...</div>;

  return (
    <div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:24}}>
        <div>
          <h1 style={{fontSize:20,fontWeight:700,color:'#0f172a',marginBottom:4}}>Series DID</h1>
          <p style={{fontSize:13,color:'#94a3b8'}}>Numeracion asignada por ARCOTEL · {totalDids.toLocaleString()} DIDs totales</p>
        </div>
        <div style={{display:'flex',gap:10}}>
          <button onClick={load} style={{padding:'7px 14px',borderRadius:7,border:'1px solid #e2e8f0',background:'#f8fafc',color:'#475569',fontSize:13,cursor:'pointer',fontFamily:'inherit'}}>Actualizar</button>
          <button onClick={()=>setShowRango(true)} style={{padding:'7px 14px',borderRadius:7,border:'1px solid #1d4ed8',background:'#fff',color:'#1d4ed8',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>+ Nuevo rango ARCOTEL</button>
          <button onClick={()=>setShowAsignar(true)} style={{padding:'7px 16px',borderRadius:7,border:'none',background:'#1d4ed8',color:'#fff',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>Asignar DID</button>
        </div>
      </div>

      {msg && <div style={{padding:'10px 16px',borderRadius:8,marginBottom:16,fontSize:13,fontWeight:500,background:msg.type==='error'?'#fef2f2':'#f0fdf4',color:msg.type==='error'?'#c81e1e':'#057a55',border:'1px solid '+(msg.type==='error'?'#fecaca':'#bbf7d0')}}>{msg.text}</div>}

      <div style={{display:'flex',gap:12,marginBottom:20,flexWrap:'wrap'}}>
        {[{label:'Total DIDs',val:totalDids.toLocaleString(),bg:'#f1f5f9',color:'#475569'},{label:'Disponibles',val:totalDisponibles.toLocaleString(),bg:'#f0fdf4',color:'#057a55'},{label:'Asignados',val:totalUsados.toLocaleString(),bg:'#eff6ff',color:'#1d4ed8'},{label:'Provincias',val:provincias.length,bg:'#fffbeb',color:'#b45309'},{label:'Rangos',val:ranges.length,bg:'#fef2f2',color:'#c81e1e'}].map(({label,val,bg,color})=>(
          <div key={label} style={{background:bg,borderRadius:8,padding:'10px 18px',minWidth:110}}>
            <div style={{fontSize:11,color,fontWeight:600,textTransform:'uppercase',letterSpacing:'0.5px',marginBottom:2}}>{label}</div>
            <div style={{fontSize:20,fontWeight:700,color,fontFamily:'monospace'}}>{val}</div>
          </div>
        ))}
      </div>

      {/* TABS */}
      <div style={{display:'flex',gap:2,marginBottom:16,borderBottom:'2px solid #e2e8f0'}}>
        {[{key:'rangos',label:'Rangos ARCOTEL ('+ranges.length+')'},{key:'asignados',label:'DIDs asignados ('+asignados.length+')'}].map(({key,label})=>(
          <button key={key} onClick={()=>setTab(key)}
            style={{padding:'8px 18px',border:'none',borderBottom:tab===key?'2px solid #1d4ed8':'2px solid transparent',background:'transparent',color:tab===key?'#1d4ed8':'#64748b',fontSize:13,fontWeight:tab===key?700:500,cursor:'pointer',fontFamily:'inherit',marginBottom:-2}}>
            {label}
          </button>
        ))}
      </div>

      {/* MODAL ASIGNAR DID */}
      {showAsignar && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.4)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000}}>
          <div style={{background:'#fff',borderRadius:14,padding:28,width:500,boxShadow:'0 20px 60px rgba(0,0,0,0.2)'}}>
            <h2 style={{fontSize:17,fontWeight:700,color:'#0f172a',marginBottom:6}}>Asignar DID a cliente</h2>
            <p style={{fontSize:12,color:'#94a3b8',marginBottom:20}}>El sistema asignara automaticamente el siguiente DID disponible de la provincia seleccionada, o puedes especificar uno.</p>
            <div style={{display:'flex',flexDirection:'column',gap:14}}>
              <div>
                <label style={lbl}>Cliente *</label>
                <select style={inp} value={formAsignar.cliente_id} onChange={e=>setFormAsignar({...formAsignar,cliente_id:e.target.value})}>
                  <option value="">Seleccionar cliente...</option>
                  {clientes.filter(c=>c.activo==='yes').map(c=>(
                    <option key={c.id} value={c.id}>{c.nombre} {c.ruc?'('+c.ruc+')':''}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={lbl}>Trunk / Carrier</label>
                <select style={inp} value={formAsignar.trunk_id} onChange={e=>setFormAsignar({...formAsignar,trunk_id:e.target.value})}>
                  <option value="">Sin trunk asignado</option>
                  {trunks.filter(t=>t.activo==='yes').map(t=>(
                    <option key={t.id} value={t.id}>{t.nombre}</option>
                  ))}
                </select>
              </div>
              <div style={{background:'#f8fafc',border:'1px solid #e2e8f0',borderRadius:8,padding:14}}>
                <div style={{fontSize:12,fontWeight:700,color:'#475569',marginBottom:10}}>ASIGNACION AUTOMATICA</div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
                  <div>
                    <label style={lbl}>Provincia</label>
                    <select style={inp} value={formAsignar.provincia} onChange={e=>setFormAsignar({...formAsignar,provincia:e.target.value,codigo_area:''})}>
                      <option value="">Cualquier provincia</option>
                      {provincias.map(p=>(
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={lbl}>Codigo de area</label>
                    <select style={inp} value={formAsignar.codigo_area} onChange={e=>setFormAsignar({...formAsignar,codigo_area:e.target.value,provincia:''})}>
                      <option value="">Cualquiera</option>
                      {[...new Set(ranges.map(r=>r.codigo_area))].sort().map(a=>(
                        <option key={a} value={a}>{a} — {ranges.find(r=>r.codigo_area===a)?.provincia}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
              <div>
                <label style={lbl}>O especificar DID manual (ej. 59343920100)</label>
                <input style={inp} placeholder="593XXXXXXXXXX" value={formAsignar.did_especifico} onChange={e=>setFormAsignar({...formAsignar,did_especifico:e.target.value,provincia:'',codigo_area:''})} />
              </div>
            </div>
            <div style={{display:'flex',gap:10,marginTop:24,justifyContent:'flex-end'}}>
              <button onClick={()=>setShowAsignar(false)} style={{padding:'8px 18px',borderRadius:7,border:'1px solid #e2e8f0',background:'#f8fafc',color:'#475569',fontSize:13,cursor:'pointer',fontFamily:'inherit'}}>Cancelar</button>
              <button onClick={handleAsignar} style={{padding:'8px 18px',borderRadius:7,border:'none',background:'#1d4ed8',color:'#fff',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>Asignar DID</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL NUEVO RANGO ARCOTEL */}
      {showRango && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.4)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000}}>
          <div style={{background:'#fff',borderRadius:14,padding:28,width:500,boxShadow:'0 20px 60px rgba(0,0,0,0.2)'}}>
            <h2 style={{fontSize:17,fontWeight:700,color:'#0f172a',marginBottom:6}}>Nuevo rango ARCOTEL</h2>
            <p style={{fontSize:12,color:'#94a3b8',marginBottom:20}}>Agrega nuevas series numericas asignadas por ARCOTEL.</p>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
              <div style={{gridColumn:'1/-1'}}>
                <label style={lbl}>Provincia *</label>
                <input style={inp} placeholder="ej. GUAYAS" value={formRango.provincia} onChange={e=>setFormRango({...formRango,provincia:e.target.value.toUpperCase()})} />
              </div>
              <div>
                <label style={lbl}>Cod. provincia</label>
                <input style={inp} placeholder="ej. 9" value={formRango.cod_provincia} onChange={e=>setFormRango({...formRango,cod_provincia:e.target.value})} />
              </div>
              <div>
                <label style={lbl}>Codigo de area *</label>
                <input style={inp} placeholder="ej. 4" value={formRango.codigo_area} onChange={e=>setFormRango({...formRango,codigo_area:e.target.value})} />
              </div>
              <div>
                <label style={lbl}>Serie inicio *</label>
                <input style={inp} placeholder="ej. 3900000" value={formRango.serie_inicio} onChange={e=>setFormRango({...formRango,serie_inicio:e.target.value})} />
              </div>
              <div>
                <label style={lbl}>Serie fin *</label>
                <input style={inp} placeholder="ej. 3903999" value={formRango.serie_fin} onChange={e=>setFormRango({...formRango,serie_fin:e.target.value})} />
              </div>
              <div>
                <label style={lbl}>Cantidad de numeros</label>
                <input style={inp} type="number" placeholder="4000" value={formRango.cantidad_total} onChange={e=>setFormRango({...formRango,cantidad_total:e.target.value})} />
              </div>
              <div>
                <label style={lbl}>Resolucion ARCOTEL</label>
                <input style={inp} placeholder="ej. ARCOTEL-2025-001" value={formRango.resolucion_arcotel} onChange={e=>setFormRango({...formRango,resolucion_arcotel:e.target.value})} />
              </div>
              <div style={{gridColumn:'1/-1'}}>
                <label style={lbl}>Fecha resolucion</label>
                <input style={inp} type="date" value={formRango.fecha_resolucion} onChange={e=>setFormRango({...formRango,fecha_resolucion:e.target.value})} />
              </div>
            </div>
            <div style={{display:'flex',gap:10,marginTop:24,justifyContent:'flex-end'}}>
              <button onClick={()=>setShowRango(false)} style={{padding:'8px 18px',borderRadius:7,border:'1px solid #e2e8f0',background:'#f8fafc',color:'#475569',fontSize:13,cursor:'pointer',fontFamily:'inherit'}}>Cancelar</button>
              <button onClick={handleNuevoRango} style={{padding:'8px 18px',borderRadius:7,border:'none',background:'#1d4ed8',color:'#fff',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>Agregar rango</button>
            </div>
          </div>
        </div>
      )}

      {/* TAB RANGOS */}
      {tab === 'rangos' && (
        <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:12,overflow:'hidden'}}>
          <table className="data-table" style={{width:'100%'}}>
            <thead>
              <tr>
                <th>Provincia</th>
                <th>Area</th>
                <th>Serie inicio</th>
                <th>Serie fin</th>
                <th>Total</th>
                <th>Usados</th>
                <th>Disponibles</th>
                <th>Uso %</th>
                <th>Resolucion</th>
              </tr>
            </thead>
            <tbody>
              {ranges.map((r,i)=>{
                const pct = r.cantidad_total > 0 ? Math.round((r.cantidad_usada/r.cantidad_total)*100) : 0;
                return (
                  <tr key={i}>
                    <td style={{fontWeight:600}}>{r.provincia}</td>
                    <td style={{textAlign:'center'}}>
                      <span style={{background:'#eff6ff',color:'#1d4ed8',fontWeight:700,padding:'2px 8px',borderRadius:5,fontFamily:'monospace',fontSize:12}}>0{r.codigo_area}</span>
                    </td>
                    <td style={{fontFamily:'monospace',fontSize:12}}>593{r.codigo_area}{r.serie_inicio}</td>
                    <td style={{fontFamily:'monospace',fontSize:12}}>593{r.codigo_area}{r.serie_fin}</td>
                    <td style={{textAlign:'center',fontFamily:'monospace'}}>{r.cantidad_total.toLocaleString()}</td>
                    <td style={{textAlign:'center',fontFamily:'monospace',color:'#1d4ed8'}}>{r.cantidad_usada}</td>
                    <td style={{textAlign:'center',fontFamily:'monospace',color:'#057a55'}}>{(r.cantidad_total-r.cantidad_usada).toLocaleString()}</td>
                    <td>
                      <div style={{display:'flex',alignItems:'center',gap:8}}>
                        <div style={{flex:1,background:'#e2e8f0',borderRadius:4,height:6}}>
                          <div style={{width:pct+'%',background:pct>80?'#c81e1e':pct>50?'#b45309':'#057a55',height:6,borderRadius:4}}/>
                        </div>
                        <span style={{fontSize:11,color:'#64748b',minWidth:30}}>{pct}%</span>
                      </div>
                    </td>
                    <td style={{fontSize:11,color:'#94a3b8'}}>{r.resolucion_arcotel||'—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB ASIGNADOS */}
      {tab === 'asignados' && (
        <div>
          <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:10,padding:14,marginBottom:16,display:'flex',gap:12,alignItems:'center'}}>
            <input
              style={{flex:1,padding:'7px 12px',border:'1px solid #e2e8f0',borderRadius:7,fontSize:13,fontFamily:'inherit',outline:'none'}}
              placeholder="Buscar por numero DID o nombre de cliente..."
              value={searchDid}
              onChange={e=>setSearchDid(e.target.value)}
            />
            <span style={{fontSize:12,color:'#94a3b8',whiteSpace:'nowrap'}}>
              {asignados.filter(d=>!searchDid||d.did_completo?.includes(searchDid)||d.cliente_nombre?.toLowerCase().includes(searchDid.toLowerCase())).length} de {asignados.length}
            </span>
          </div>
        <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:12,overflow:'hidden'}}>
          {asignados.length === 0 ? (
            <div className="td-empty" style={{padding:48,textAlign:'center',color:'#94a3b8'}}>No hay DIDs asignados aun</div>
          ) : (
            <table className="data-table" style={{width:'100%'}}>
              <thead>
                <tr>
                  <th>DID</th>
                  <th>Provincia</th>
                  <th>Cliente</th>
                  <th>Trunk</th>
                  <th>Estado</th>
                  <th>Fecha asignacion</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {asignados.filter(d=>!searchDid||d.did_completo?.includes(searchDid)||d.cliente_nombre?.toLowerCase().includes(searchDid.toLowerCase())).map((d,i)=>(
                  <tr key={i}>
                    <td style={{fontFamily:'monospace',fontWeight:700,fontSize:14,color:'#0f172a'}}>{d.did_completo}</td>
                    <td><span style={{background:'#eff6ff',color:'#1d4ed8',fontSize:11,fontWeight:600,padding:'2px 8px',borderRadius:5}}>{d.provincia||'—'} (0{d.codigo_area})</span></td>
                    <td style={{fontWeight:600}}>{d.cliente_nombre||'—'}</td>
                    <td style={{fontSize:12,color:'#64748b'}}>{d.trunk_nombre||'—'}</td>
                    <td>
                      <span style={{display:'inline-flex',alignItems:'center',gap:5,fontSize:11,fontWeight:600,padding:'3px 10px',borderRadius:20,
                        background:d.estado==='asignado'?'#eff6ff':d.estado==='disponible'?'#f0fdf4':'#fef2f2',
                        color:d.estado==='asignado'?'#1d4ed8':d.estado==='disponible'?'#057a55':'#c81e1e'}}>
                        <span style={{width:6,height:6,borderRadius:'50%',background:'currentColor',display:'inline-block'}}/>{d.estado}
                      </span>
                    </td>
                    <td style={{fontSize:12,color:'#64748b'}}>{d.fecha_asignacion?.split('T')[0]||'—'}</td>
                    <td>
                      <button onClick={()=>handleLiberar(d.id,d.did_completo)} style={{padding:'4px 10px',borderRadius:5,border:'1px solid #fee2e2',background:'#fff',color:'#c81e1e',fontSize:11,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>Liberar</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        </div>
      )}
    </div>
  );
}

const lbl = {fontSize:11,fontWeight:600,color:'#64748b',textTransform:'uppercase',letterSpacing:'0.5px',marginBottom:4,display:'block'};
const inp = {width:'100%',padding:'8px 12px',border:'1px solid #e2e8f0',borderRadius:7,fontSize:13,fontFamily:'inherit',color:'#0f172a',outline:'none',boxSizing:'border-box'};
