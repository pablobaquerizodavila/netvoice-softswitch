import { useState, useEffect } from 'react';
import api from '../api';

export default function BuscarCliente() {
  const [data, setData] = useState([]);
  const [planes, setPlanes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [msg, setMsg] = useState(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const LIMIT = 50;
  const [filtros, setFiltros] = useState({plan_id:'', activo:'', tipo_identificacion:'', tipo_cuenta:'', ciudad:''});
  const emptyForm = {nombre:'',ruc:'',email:'',telefono:'',plan_id:'',credito_limite:'0',direccion:'',celular:'',nombre_comercial:'',ciudad_codigo:'',observaciones:''};
  const [form, setForm] = useState(emptyForm);

  const load = (p=1, s='') => {
    setLoading(true);
    Promise.all([
      api.get('/clientes?page='+p+'&limit=50&search='+encodeURIComponent(s)
        +'&plan_id='+encodeURIComponent(filtros.plan_id)
        +'&activo='+encodeURIComponent(filtros.activo)
        +'&tipo_identificacion='+encodeURIComponent(filtros.tipo_identificacion)
        +'&tipo_cuenta='+encodeURIComponent(filtros.tipo_cuenta)
        +'&ciudad='+encodeURIComponent(filtros.ciudad)),
      api.get('/planes')
    ]).then(([c,pl]) => {
      setData(c.data.data||[]);
      setTotal(c.data.total||0);
      setPages(c.data.pages||1);
      setPlanes(pl.data.data||[]);
    }).finally(()=>setLoading(false));
  };
  useEffect(()=>{ load(1,''); },[]);

  const showMsg = (text,type='success') => { setMsg({text,type}); setTimeout(()=>setMsg(null),4000); };

  const handleSubmit = async () => {
    if (!form.nombre) return showMsg('El nombre es requerido','error');
    try {
      if (editItem) {
        await api.put('/clientes/'+editItem.id, {
          ...form,
          plan_id: form.plan_id ? parseInt(form.plan_id) : null,
          credito_limite: parseFloat(form.credito_limite)||0,
        });
        showMsg('Cliente '+form.nombre+' actualizado');
      } else {
        await api.post('/clientes', {
          ...form,
          plan_id: form.plan_id ? parseInt(form.plan_id) : null,
          credito_limite: parseFloat(form.credito_limite)||0,
        });
        showMsg('Cliente '+form.nombre+' creado');
      }
      setShowForm(false);
      setEditItem(null);
      setForm(emptyForm);
      load();
    } catch(e) { showMsg(e.response?.data?.detail||'Error','error'); }
  };

  const openEdit = (c) => {
    setEditItem(c);
    setForm({
      nombre: c.nombre||'', ruc: c.ruc||'', email: c.email||'',
      telefono: c.telefono||'', plan_id: c.plan_id||'',
      credito_limite: c.credito_limite||'0',
      direccion: c.direccion||'', celular: c.celular||'',
      nombre_comercial: c.nombre_comercial||'',
      ciudad_codigo: c.ciudad_codigo||'',
      observaciones: c.observaciones||'',
    });
    setShowForm(true);
  };

  const handleToggle = async (id, nombre, activo) => {
    const accion = activo === 'yes' ? 'Desactivar' : 'Activar';
    if (!window.confirm(accion+' cliente '+nombre+'?')) return;
    try {
      if (activo === 'yes') {
        await api.delete('/clientes/'+id);
        showMsg('Cliente '+nombre+' desactivado');
      } else {
        await api.put('/clientes/'+id, {activo: 'yes'});
        showMsg('Cliente '+nombre+' activado');
      }
      load(page, search);
    } catch(e) { showMsg('Error','error'); }
  };

  const filtered = data;
  const handleFiltro = (key, val) => {
    const newFiltros = {...filtros, [key]: val};
    setFiltros(newFiltros);
    setPage(1);
    setLoading(true);
    Promise.all([
      api.get('/clientes?page=1&limit=50&search='+encodeURIComponent(search)
        +'&plan_id='+encodeURIComponent(newFiltros.plan_id)
        +'&activo='+encodeURIComponent(newFiltros.activo)
        +'&tipo_identificacion='+encodeURIComponent(newFiltros.tipo_identificacion)
        +'&tipo_cuenta='+encodeURIComponent(newFiltros.tipo_cuenta)
        +'&ciudad='+encodeURIComponent(newFiltros.ciudad)),
      api.get('/planes')
    ]).then(([c,pl]) => {
      setData(c.data.data||[]);
      setTotal(c.data.total||0);
      setPages(c.data.pages||1);
      setPlanes(pl.data.data||[]);
    }).finally(()=>setLoading(false));
  };

  const limpiarFiltros = () => {
    const empty = {plan_id:'', activo:'', tipo_identificacion:'', tipo_cuenta:'', ciudad:''};
    setFiltros(empty);
    setSearch('');
    setPage(1);
    setLoading(true);
    Promise.all([
      api.get('/clientes?page=1&limit=50'),
      api.get('/planes')
    ]).then(([c,pl]) => {
      setData(c.data.data||[]);
      setTotal(c.data.total||0);
      setPages(c.data.pages||1);
      setPlanes(pl.data.data||[]);
    }).finally(()=>setLoading(false));
  };

  const handleSearch = (val) => {
    setSearch(val);
    setPage(1);
    load(1, val);
  };
  const activos = data.filter(c=>c.activo==='yes');

  if (loading) return <div className="loading">Cargando clientes...</div>;

  return (
    <div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:24}}>
        <div>
          <div className="nv-page-title">Buscar Cliente</div>
          <div className="nv-page-sub">Busqueda y gestion de clientes existentes</div>
          <p style={{fontSize:13,color:'#94a3b8'}}>{data.length} clientes registrados</p>
        </div>
        <div style={{display:'flex',gap:10}}>
          <button onClick={()=>load(page,search)} style={{padding:'7px 14px',borderRadius:7,border:'1px solid #e2e8f0',background:'#f8fafc',color:'#475569',fontSize:13,cursor:'pointer',fontFamily:'inherit'}}>Actualizar</button>
          <button onClick={()=>{setEditItem(null);setForm(emptyForm);setShowForm(true);}} style={{padding:'7px 16px',borderRadius:7,border:'none',background:'#1d4ed8',color:'#fff',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>+ Nuevo cliente</button>
        </div>
      </div>

      {msg && <div style={{padding:'10px 16px',borderRadius:8,marginBottom:16,fontSize:13,fontWeight:500,background:msg.type==='error'?'#fef2f2':'#f0fdf4',color:msg.type==='error'?'#c81e1e':'#057a55',border:'1px solid '+(msg.type==='error'?'#fecaca':'#bbf7d0')}}>{msg.text}</div>}

      <div style={{display:'flex',gap:12,marginBottom:20}}>
        {[{label:'Total',val:data.length,bg:'#f1f5f9',color:'#475569'},{label:'Activos',val:activos.length,bg:'#f0fdf4',color:'#057a55'},{label:'Inactivos',val:data.length-activos.length,bg:'#fef2f2',color:'#c81e1e'}].map(({label,val,bg,color})=>(
          <div key={label} style={{background:bg,borderRadius:8,padding:'10px 18px',minWidth:100}}>
            <div style={{fontSize:11,color,fontWeight:600,textTransform:'uppercase',letterSpacing:'0.5px',marginBottom:2}}>{label}</div>
            <div style={{fontSize:22,fontWeight:700,color,fontFamily:'monospace'}}>{val}</div>
          </div>
        ))}
      </div>

      {showForm && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.4)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000}}>
          <div style={{background:'#fff',borderRadius:14,padding:28,width:500,boxShadow:'0 20px 60px rgba(0,0,0,0.2)',maxHeight:'90vh',overflowY:'auto'}}>
            <div className="nv-modal-title">{editItem ? "Editar cliente" : "Nuevo cliente"}</div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
              <div style={{gridColumn:'1/-1'}}>
                <label style={lbl}>Nombre / Razon social *</label>
                <input style={inp} placeholder="ej. Empresa ABC S.A." value={form.nombre} onChange={e=>setForm({...form,nombre:e.target.value})} />
              </div>
              <div>
                <label style={lbl}>RUC / Cedula</label>
                <input style={inp} placeholder="0992XXXXXXX001" value={form.ruc} onChange={e=>setForm({...form,ruc:e.target.value})} />
              </div>
              <div>
                <label style={lbl}>Telefono</label>
                <input style={inp} placeholder="04 2XXXXXX" value={form.telefono} onChange={e=>setForm({...form,telefono:e.target.value})} />
              </div>
              <div style={{gridColumn:'1/-1'}}>
                <label style={lbl}>Email</label>
                <input style={inp} type="email" placeholder="contacto@empresa.com" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} />
              </div>
              <div>
                <label style={lbl}>Plan de cobro</label>
                <select style={inp} value={form.plan_id} onChange={e=>setForm({...form,plan_id:e.target.value})}>
                  <option value="">Sin plan asignado</option>
                  {planes.filter(p=>p.activo==='yes').map(p=>(
                    <option key={p.id} value={p.id}>{p.nombre} - ${parseFloat(p.pension_mensual).toFixed(2)}/mes</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={lbl}>Limite de credito (USD)</label>
                <input style={inp} type="number" step="0.01" placeholder="0.00" value={form.credito_limite} onChange={e=>setForm({...form,credito_limite:e.target.value})} />
              </div>
              <div style={{gridColumn:'1/-1'}}>
                <label style={lbl}>Direccion</label>
                <input style={inp} placeholder="Direccion del cliente" value={form.direccion} onChange={e=>setForm({...form,direccion:e.target.value})} />
              </div>
              <div>
                <label style={lbl}>Celular</label>
                <input style={inp} placeholder="09XXXXXXXX" value={form.celular} onChange={e=>setForm({...form,celular:e.target.value})} />
              </div>
              <div>
                <label style={lbl}>Nombre comercial</label>
                <input style={inp} placeholder="Nombre comercial" value={form.nombre_comercial} onChange={e=>setForm({...form,nombre_comercial:e.target.value})} />
              </div>
              <div style={{gridColumn:'1/-1'}}>
                <label style={lbl}>Observaciones</label>
                <input style={inp} placeholder="Notas u observaciones" value={form.observaciones} onChange={e=>setForm({...form,observaciones:e.target.value})} />
              </div>
            </div>
            <div style={{display:'flex',gap:10,marginTop:24,justifyContent:'flex-end'}}>
              <button onClick={()=>setShowForm(false)} style={{padding:'8px 18px',borderRadius:7,border:'1px solid #e2e8f0',background:'#f8fafc',color:'#475569',fontSize:13,cursor:'pointer',fontFamily:'inherit'}}>Cancelar</button>
              <button onClick={handleSubmit} style={{padding:'8px 18px',borderRadius:7,border:'none',background:'#1d4ed8',color:'#fff',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>{editItem ? 'Guardar cambios' : 'Crear cliente'}</button>
            </div>
          </div>
        </div>
      )}

      <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:10,marginBottom:16,padding:14,display:'flex',gap:12,alignItems:'center'}}>
        <input style={{flex:1,padding:'7px 12px',border:'1px solid #e2e8f0',borderRadius:7,fontSize:13,fontFamily:'inherit',outline:'none'}}
          placeholder="Buscar por nombre, RUC o email..." value={search} onChange={e=>setSearch(e.target.value)} />
        <span style={{fontSize:12,color:'#94a3b8',whiteSpace:'nowrap'}}>{total.toLocaleString()} clientes</span>
      </div>

      {/* FILTROS */}
      <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:10,padding:14,marginBottom:16}}>
        <div style={{display:'flex',gap:10,flexWrap:'wrap',alignItems:'flex-end'}}>
          <div>
            <label style={lbl}>Plan</label>
            <select style={sel} value={filtros.plan_id} onChange={e=>handleFiltro('plan_id',e.target.value)}>
              <option value="">Todos los planes</option>
              <option value="null">Sin plan</option>
              {planes.filter(p=>p.activo==='yes').map(p=>(
                <option key={p.id} value={p.id}>{p.nombre}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={lbl}>Estado</label>
            <select style={sel} value={filtros.activo} onChange={e=>handleFiltro('activo',e.target.value)}>
              <option value="">Todos</option>
              <option value="yes">Activo</option>
              <option value="no">Inactivo</option>
            </select>
          </div>
          <div>
            <label style={lbl}>Tipo ID</label>
            <select style={sel} value={filtros.tipo_identificacion} onChange={e=>handleFiltro('tipo_identificacion',e.target.value)}>
              <option value="">Todos</option>
              <option value="R">RUC</option>
              <option value="C">Cedula</option>
              <option value="P">Pasaporte</option>
              <option value="O">Otro</option>
            </select>
          </div>
          <div>
            <label style={lbl}>Tipo cuenta</label>
            <select style={sel} value={filtros.tipo_cuenta} onChange={e=>handleFiltro('tipo_cuenta',e.target.value)}>
              <option value="">Todos</option>
              <option value="Postpaid">Postpaid</option>
              <option value="Prepaid">Prepaid</option>
            </select>
          </div>
          <button onClick={limpiarFiltros} style={{padding:'6px 14px',borderRadius:7,border:'1px solid #e2e8f0',background:'#f8fafc',color:'#64748b',fontSize:12,cursor:'pointer',fontFamily:'inherit',height:32}}>
            Limpiar filtros
          </button>
        </div>
      </div>

      <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:12,overflow:'hidden'}}>
        <table className="data-table" style={{width:'100%'}}>
          <thead>
            <tr>
              <th>Cliente</th>
              <th>RUC</th>
              <th>Telefono</th>
              <th>Email</th>
              <th>Plan</th>
              <th>Credito limite</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan="8" className="td-empty">No hay clientes registrados</td></tr>
            )}
            {filtered.map((c,i)=>(
              <tr key={i}>
                <td>
                  <div style={{fontWeight:600,color:'#0f172a'}}>{c.nombre}</div>
                  <div style={{fontSize:11,color:'#94a3b8',marginTop:1}}>ID: {c.id}</div>
                </td>
                <td style={{fontFamily:'monospace',fontSize:12}}>{c.ruc||'—'}</td>
                <td>{c.telefono||'—'}</td>
                <td style={{fontSize:12}}>{c.email||'—'}</td>
                <td>
                  {c.plan_nombre
                    ? <span style={{background:'#eff6ff',color:'#1d4ed8',fontSize:11,fontWeight:600,padding:'3px 8px',borderRadius:5}}>{c.plan_nombre}</span>
                    : <span style={{color:'#94a3b8',fontSize:12}}>Sin plan</span>
                  }
                </td>
                <td style={{fontFamily:'monospace',fontSize:13}}>${parseFloat(c.credito_limite||0).toFixed(2)}</td>
                <td>
                  <span style={{display:'inline-flex',alignItems:'center',gap:5,fontSize:11,fontWeight:600,padding:'3px 10px',borderRadius:20,background:c.activo==='yes'?'#f0fdf4':'#fef2f2',color:c.activo==='yes'?'#057a55':'#c81e1e'}}>
                    <span style={{width:6,height:6,borderRadius:'50%',background:'currentColor',display:'inline-block'}}/>{c.activo==='yes'?'Activo':'Inactivo'}
                  </span>
                </td>
                <td>
                  <div style={{display:'flex',gap:6}}>
                    <button onClick={()=>openEdit(c)} style={{padding:'4px 10px',borderRadius:5,border:'1px solid #e2e8f0',background:'#fff',color:'#475569',fontSize:11,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>Editar</button>
                    <button onClick={()=>handleToggle(c.id,c.nombre,c.activo)}
                    style={{padding:'4px 10px',borderRadius:5,fontSize:11,fontWeight:600,cursor:'pointer',fontFamily:'inherit',
                      border: c.activo==='yes'?'1px solid #fee2e2':'1px solid #bbf7d0',
                      background:'#fff', color: c.activo==='yes'?'#c81e1e':'#057a55'}}>
                    {c.activo==='yes'?'Desactivar':'Activar'}
                  </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* PAGINACION */}
      {pages > 1 && (
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'12px 16px',background:'#fff',border:'1px solid #e2e8f0',borderRadius:10,marginTop:12}}>
          <span style={{fontSize:12,color:'#94a3b8'}}>
            Pagina {page} de {pages} · {total.toLocaleString()} clientes total
          </span>
          <div style={{display:'flex',gap:6}}>
            <button onClick={()=>{setPage(1);load(1,search);}} disabled={page===1}
              style={{padding:'4px 10px',borderRadius:6,border:'1px solid #e2e8f0',background:page===1?'#f8fafc':'#fff',color:'#475569',fontSize:13,cursor:page===1?'not-allowed':'pointer',fontFamily:'inherit'}}>«</button>
            <button onClick={()=>{setPage(p=>p-1);load(page-1,search);}} disabled={page===1}
              style={{padding:'4px 10px',borderRadius:6,border:'1px solid #e2e8f0',background:page===1?'#f8fafc':'#fff',color:'#475569',fontSize:13,cursor:page===1?'not-allowed':'pointer',fontFamily:'inherit'}}>‹</button>
            {Array.from({length:Math.min(5,pages)},(_,i)=>{
              const p = Math.min(Math.max(page-2,1)+i, pages);
              return (
                <button key={p} onClick={()=>{setPage(p);load(p,search);}}
                  style={{padding:'4px 10px',borderRadius:6,border:'1px solid #e2e8f0',background:p===page?'#1d4ed8':'#fff',color:p===page?'#fff':'#475569',fontSize:13,cursor:'pointer',fontFamily:'inherit'}}>
                  {p}
                </button>
              );
            })}
            <button onClick={()=>{setPage(p=>p+1);load(page+1,search);}} disabled={page===pages}
              style={{padding:'4px 10px',borderRadius:6,border:'1px solid #e2e8f0',background:page===pages?'#f8fafc':'#fff',color:'#475569',fontSize:13,cursor:page===pages?'not-allowed':'pointer',fontFamily:'inherit'}}>›</button>
            <button onClick={()=>{setPage(pages);load(pages,search);}} disabled={page===pages}
              style={{padding:'4px 10px',borderRadius:6,border:'1px solid #e2e8f0',background:page===pages?'#f8fafc':'#fff',color:'#475569',fontSize:13,cursor:page===pages?'not-allowed':'pointer',fontFamily:'inherit'}}>»</button>
          </div>
        </div>
      )}
    </div>
  );
}

const lbl = {fontSize:11,fontWeight:600,color:'#64748b',textTransform:'uppercase',letterSpacing:'0.5px',marginBottom:4,display:'block'};
const sel = {padding:'6px 10px',border:'1px solid #e2e8f0',borderRadius:7,fontSize:12,fontFamily:'inherit',color:'#0f172a',outline:'none',background:'#fff',height:32};
const inp = {width:'100%',padding:'8px 12px',border:'1px solid #e2e8f0',borderRadius:7,fontSize:13,fontFamily:'inherit',color:'#0f172a',outline:'none',boxSizing:'border-box'};
