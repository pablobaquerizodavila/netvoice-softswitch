import React, { useState, useEffect } from 'react';
import api from '../api';

export default function Extensions() {
  const [data, setData]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState('');
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    setLoading(true);
    api.get('/extensions')
      .then(res => setData(res.data.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [refresh]);

  const filtered = data.filter(e =>
    !search ||
    String(e.id).includes(search) ||
    e.context?.includes(search) ||
    e.allow?.includes(search)
  );

  const codecs = (allow) =>
    (allow || '').split(',').map(c => c.trim()).filter(Boolean);

  const codecColor = (c) => {
    if (c === 'ulaw' || c === 'alaw') return { bg:'#eff6ff', color:'#1d4ed8' };
    if (c === 'gsm')  return { bg:'#f0fdf4', color:'#057a55' };
    if (c === 'g729') return { bg:'#fefce8', color:'#854d0e' };
    return { bg:'#f1f5f9', color:'#475569' };
  };

  if (loading) return <div className="loading">Cargando extensiones...</div>;

  return (
    <div>
      {/* HEADER */}
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:24}}>
        <div>
          <h1 style={{fontSize:20,fontWeight:700,color:'#0f172a',marginBottom:4}}>Extensiones</h1>
          <p style={{fontSize:13,color:'#94a3b8'}}>{data.length} extensiones registradas · voip-lab-01 (192.168.0.161)</p>
        </div>
        <div style={{display:'flex',gap:10}}>
          <button onClick={()=>setRefresh(r=>r+1)}
            style={{padding:'7px 14px',borderRadius:7,border:'1px solid #e2e8f0',background:'#f8fafc',color:'#475569',fontSize:13,cursor:'pointer',fontFamily:'inherit',display:'flex',alignItems:'center',gap:6}}>
            ↻ Actualizar
          </button>
          <button style={{padding:'7px 16px',borderRadius:7,border:'none',background:'#1d4ed8',color:'#fff',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>
            + Nueva extensión
          </button>
        </div>
      </div>

      {/* STATS */}
      <div style={{display:'flex',gap:12,marginBottom:20,flexWrap:'wrap'}}>
        {[
          { label:'Total',    val:data.length,  bg:'#f1f5f9', color:'#475569' },
          { label:'Online',   val:data.length,  bg:'#f0fdf4', color:'#057a55' },
          { label:'Offline',  val:0,            bg:'#fef2f2', color:'#c81e1e' },
          { label:'Contextos',val:[...new Set(data.map(e=>e.context))].length, bg:'#eff6ff', color:'#1d4ed8' },
        ].map(({label,val,bg,color})=>(
          <div key={label} style={{background:bg,borderRadius:8,padding:'10px 18px',minWidth:110,border:`1px solid ${bg}`}}>
            <div style={{fontSize:11,color,fontWeight:600,textTransform:'uppercase',letterSpacing:'0.5px',marginBottom:2}}>{label}</div>
            <div style={{fontSize:22,fontWeight:700,color,fontFamily:'monospace'}}>{val}</div>
          </div>
        ))}
      </div>

      {/* SEARCH */}
      <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:10,padding:14,marginBottom:16,display:'flex',gap:12,alignItems:'center'}}>
        <input
          style={{flex:1,padding:'7px 12px',border:'1px solid #e2e8f0',borderRadius:7,fontSize:13,fontFamily:'inherit',outline:'none'}}
          placeholder="Buscar por ID, contexto, codec..."
          value={search}
          onChange={e=>setSearch(e.target.value)}
        />
        <span style={{fontSize:12,color:'#94a3b8',whiteSpace:'nowrap'}}>
          {filtered.length} de {data.length} extensiones
        </span>
      </div>

      {/* GRID */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))',gap:16}}>
        {filtered.map((ext, i) => (
          <div key={i} style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:12,overflow:'hidden',transition:'box-shadow 0.15s'}}
            onMouseEnter={e=>e.currentTarget.style.boxShadow='0 4px 12px rgba(0,0,0,0.08)'}
            onMouseLeave={e=>e.currentTarget.style.boxShadow='none'}>

            {/* CARD HEADER */}
            <div style={{padding:'16px 18px',borderBottom:'1px solid #f1f5f9',display:'flex',justifyContent:'space-between',alignItems:'center',background:'#f8fafc'}}>
              <div style={{display:'flex',alignItems:'center',gap:12}}>
                <div style={{width:42,height:42,background:'#eff6ff',color:'#1d4ed8',borderRadius:10,display:'flex',alignItems:'center',justifyContent:'center',fontWeight:700,fontSize:14,fontFamily:'monospace',flexShrink:0}}>
                  {String(ext.id).slice(0,2)}
                </div>
                <div>
                  <div style={{fontWeight:700,fontSize:15,color:'#0f172a'}}>Extensión {ext.id}</div>
                  <div style={{fontSize:11,color:'#94a3b8',marginTop:1}}>PJSIP · {ext.context}</div>
                </div>
              </div>
              <span style={{display:'inline-flex',alignItems:'center',gap:5,fontSize:11,fontWeight:600,padding:'4px 10px',borderRadius:20,background:'#f0fdf4',color:'#057a55'}}>
                <span style={{width:6,height:6,borderRadius:'50%',background:'#057a55',display:'inline-block'}} /> Online
              </span>
            </div>

            {/* CARD BODY */}
            <div style={{padding:'14px 18px'}}>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:14}}>
                {[
                  { label:'ID / Endpoint', value: ext.id },
                  { label:'AORs',          value: ext.aors },
                  { label:'Auth',          value: ext.auth },
                  { label:'Contexto',      value: ext.context },
                ].map(({label,value})=>(
                  <div key={label}>
                    <div style={{fontSize:10,fontWeight:600,color:'#94a3b8',textTransform:'uppercase',letterSpacing:'0.5px',marginBottom:3}}>{label}</div>
                    <div style={{fontSize:13,color:'#0f172a',fontFamily:'monospace',fontWeight:500}}>{value || '—'}</div>
                  </div>
                ))}
              </div>

              {/* CODECS */}
              <div>
                <div style={{fontSize:10,fontWeight:600,color:'#94a3b8',textTransform:'uppercase',letterSpacing:'0.5px',marginBottom:6}}>Codecs permitidos</div>
                <div style={{display:'flex',gap:5,flexWrap:'wrap'}}>
                  {codecs(ext.allow).map(c => {
                    const {bg,color} = codecColor(c);
                    return (
                      <span key={c} style={{background:bg,color,fontSize:11,fontWeight:600,padding:'3px 8px',borderRadius:5,fontFamily:'monospace'}}>
                        {c}
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* CARD FOOTER */}
            <div style={{padding:'10px 18px',borderTop:'1px solid #f1f5f9',display:'flex',gap:8,background:'#fafafa'}}>
              <button style={{flex:1,padding:'6px 0',borderRadius:6,border:'1px solid #e2e8f0',background:'#fff',color:'#475569',fontSize:12,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>
                ✏️ Editar
              </button>
              <button style={{flex:1,padding:'6px 0',borderRadius:6,border:'1px solid #fee2e2',background:'#fff',color:'#c81e1e',fontSize:12,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>
                🗑️ Eliminar
              </button>
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <div style={{gridColumn:'1/-1',textAlign:'center',padding:48,color:'#94a3b8',fontSize:14}}>
            No se encontraron extensiones
          </div>
        )}
      </div>
    </div>
  );
}
