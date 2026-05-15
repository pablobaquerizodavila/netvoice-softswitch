import { useState, useEffect } from 'react';
import api from '../api';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

const COLORS = { CEL:'#f59e0b', LOC:'#3b82f6', NAC:'#10b981', internal:'#8b5cf6', default:'#94a3b8' };

export default function Metricas() {
  const [resumen, setResumen] = useState(null);
  const [porMes, setPorMes] = useState([]);
  const [porContexto, setPorContexto] = useState([]);
  const [topOrigenes, setTopOrigenes] = useState([]);
  const [topDestinos, setTopDestinos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [meses, setMeses] = useState(6);

  const load = (m) => {
    setLoading(true);
    Promise.all([
      api.get('/metricas/resumen?meses='+m),
      api.get('/metricas/por-mes?meses='+m),
      api.get('/metricas/por-contexto?meses='+m),
      api.get('/metricas/top-origenes?meses='+m),
      api.get('/metricas/top-destinos?meses='+m),
    ]).then(([r,pm,pc,to,td]) => {
      setResumen(r.data);
      setPorMes(pm.data.data||[]);
      setPorContexto(pc.data.data||[]);
      setTopOrigenes(to.data.data||[]);
      setTopDestinos(td.data.data||[]);
    }).finally(()=>setLoading(false));
  };

  useEffect(()=>{ load(meses); },[meses]);

  const fmt = (n) => n ? parseFloat(n).toLocaleString('es-EC', {minimumFractionDigits:2, maximumFractionDigits:2}) : '0.00';

  if (loading) return <div className="loading">Cargando metricas...</div>;

  return (
    <div>
      {/* HEADER */}
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:24}}>
        <div>
          <h1 style={{fontSize:20,fontWeight:700,color:'#0f172a',marginBottom:4}}>Metricas de trafico</h1>
          <p style={{fontSize:13,color:'#94a3b8'}}>Analisis de llamadas y minutos por periodo</p>
        </div>
        <div style={{display:'flex',gap:10,alignItems:'center'}}>
          <span style={{fontSize:13,color:'#64748b'}}>Periodo:</span>
          <select style={{padding:'7px 12px',border:'1px solid #e2e8f0',borderRadius:7,fontSize:13,fontFamily:'inherit',outline:'none'}}
            value={meses} onChange={e=>setMeses(parseInt(e.target.value))}>
            <option value={1}>Ultimo mes</option>
            <option value={3}>Ultimos 3 meses</option>
            <option value={6}>Ultimos 6 meses</option>
            <option value={12}>Ultimo año</option>
          </select>
          <button onClick={()=>load(meses)} style={{padding:'7px 14px',borderRadius:7,border:'1px solid #e2e8f0',background:'#f8fafc',color:'#475569',fontSize:13,cursor:'pointer',fontFamily:'inherit'}}>Actualizar</button>
        </div>
      </div>

      {/* KPI CARDS */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))',gap:14,marginBottom:24}}>
        {[
          {label:'Total llamadas',val:resumen?.total_llamadas?.toLocaleString()||'0',bg:'#f1f5f9',color:'#475569'},
          {label:'Salientes',val:resumen?.salientes?.toLocaleString()||'0',bg:'#eff6ff',color:'#1d4ed8'},
          {label:'Entrantes',val:resumen?.entrantes?.toLocaleString()||'0',bg:'#f0fdf4',color:'#057a55'},
          {label:'Onnet',val:resumen?.onnet?.toLocaleString()||'0',bg:'#faf5ff',color:'#7c3aed'},
          {label:'Total minutos',val:fmt(resumen?.total_minutos),bg:'#fffbeb',color:'#b45309'},
          {label:'Contestadas',val:resumen?.contestadas?.toLocaleString()||'0',bg:'#f0fdf4',color:'#057a55'},
          {label:'No contest.',val:resumen?.no_contestadas?.toLocaleString()||'0',bg:'#fef2f2',color:'#c81e1e'},
        ].map(({label,val,bg,color})=>(
          <div key={label} style={{background:bg,borderRadius:10,padding:'14px 16px'}}>
            <div style={{fontSize:11,color,fontWeight:600,textTransform:'uppercase',letterSpacing:'0.5px',marginBottom:4}}>{label}</div>
            <div style={{fontSize:22,fontWeight:700,color,fontFamily:'monospace'}}>{val}</div>
          </div>
        ))}
      </div>

      {/* GRAFICA TRAFICO POR MES */}
      <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:12,padding:20,marginBottom:20}}>
        <div style={{fontWeight:700,fontSize:15,color:'#0f172a',marginBottom:4}}>Trafico acumulado en minutos</div>
        <div style={{fontSize:12,color:'#94a3b8',marginBottom:16}}>Minutos por tipo de llamada · por mes</div>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={porMes} margin={{top:5,right:20,bottom:5,left:0}}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="mes" tick={{fontSize:11}} />
            <YAxis tick={{fontSize:11}} />
            <Tooltip formatter={(v)=>[parseFloat(v).toFixed(2)+' min']} />
            <Legend />
            <Bar dataKey="min_cel" name="Celular" fill={COLORS.CEL} radius={[3,3,0,0]} />
            <Bar dataKey="min_loc" name="Local" fill={COLORS.LOC} radius={[3,3,0,0]} />
            <Bar dataKey="min_nac" name="Nacional" fill={COLORS.NAC} radius={[3,3,0,0]} />
            <Bar dataKey="min_onnet" name="Onnet" fill={COLORS.internal} radius={[3,3,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* FILA: PIE + TABLAS */}
      <div style={{display:'grid',gridTemplateColumns:'300px 1fr 1fr',gap:16,marginBottom:20}}>

        {/* PIE CONTEXTO */}
        <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:12,padding:20}}>
          <div style={{fontWeight:700,fontSize:14,color:'#0f172a',marginBottom:16}}>Minutos por contexto</div>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={porContexto} dataKey="minutos" nameKey="contexto" cx="50%" cy="50%" outerRadius={70} label={({contexto,percent})=>contexto+' '+Math.round(percent*100)+'%'} labelLine={false}>
                {porContexto.map((e,i)=>(
                  <Cell key={i} fill={COLORS[e.contexto]||['#3b82f6','#10b981','#f59e0b','#8b5cf6','#ef4444'][i%5]} />
                ))}
              </Pie>
              <Tooltip formatter={(v)=>[parseFloat(v).toFixed(2)+' min']} />
            </PieChart>
          </ResponsiveContainer>
          <div style={{marginTop:8}}>
            {porContexto.map((c,i)=>(
              <div key={i} style={{display:'flex',justifyContent:'space-between',padding:'4px 0',borderBottom:'1px solid #f1f5f9',fontSize:12}}>
                <span style={{display:'flex',alignItems:'center',gap:6}}>
                  <span style={{width:8,height:8,borderRadius:'50%',background:COLORS[c.contexto]||'#94a3b8',display:'inline-block'}}/>
                  {c.contexto}
                </span>
                <span style={{fontFamily:'monospace',fontWeight:600}}>{parseFloat(c.minutos).toFixed(2)} min</span>
              </div>
            ))}
          </div>
        </div>

        {/* TOP ORIGENES */}
        <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:12,padding:20}}>
          <div style={{fontWeight:700,fontSize:14,color:'#0f172a',marginBottom:12}}>Top numeros salientes</div>
          <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
            <thead>
              <tr>
                <th style={{textAlign:'left',padding:'6px 8px',borderBottom:'1px solid #e2e8f0',color:'#94a3b8',fontWeight:600,textTransform:'uppercase',fontSize:10,letterSpacing:'0.5px'}}>#</th>
                <th style={{textAlign:'left',padding:'6px 8px',borderBottom:'1px solid #e2e8f0',color:'#94a3b8',fontWeight:600,textTransform:'uppercase',fontSize:10,letterSpacing:'0.5px'}}>Origen</th>
                <th style={{textAlign:'right',padding:'6px 8px',borderBottom:'1px solid #e2e8f0',color:'#94a3b8',fontWeight:600,textTransform:'uppercase',fontSize:10,letterSpacing:'0.5px'}}>Llamadas</th>
                <th style={{textAlign:'right',padding:'6px 8px',borderBottom:'1px solid #e2e8f0',color:'#94a3b8',fontWeight:600,textTransform:'uppercase',fontSize:10,letterSpacing:'0.5px'}}>Minutos</th>
              </tr>
            </thead>
            <tbody>
              {topOrigenes.map((r,i)=>(
                <tr key={i} style={{borderBottom:'1px solid #f8fafc'}}>
                  <td style={{padding:'7px 8px',color:'#94a3b8'}}>{i+1}</td>
                  <td style={{padding:'7px 8px',fontFamily:'monospace',fontWeight:600,color:'#0f172a'}}>{r.numero}</td>
                  <td style={{padding:'7px 8px',textAlign:'right'}}>{r.llamadas?.toLocaleString()}</td>
                  <td style={{padding:'7px 8px',textAlign:'right',fontFamily:'monospace',color:'#1d4ed8'}}>{parseFloat(r.minutos).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* TOP DESTINOS */}
        <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:12,padding:20}}>
          <div style={{fontWeight:700,fontSize:14,color:'#0f172a',marginBottom:12}}>Top numeros entrantes</div>
          <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
            <thead>
              <tr>
                <th style={{textAlign:'left',padding:'6px 8px',borderBottom:'1px solid #e2e8f0',color:'#94a3b8',fontWeight:600,textTransform:'uppercase',fontSize:10,letterSpacing:'0.5px'}}>#</th>
                <th style={{textAlign:'left',padding:'6px 8px',borderBottom:'1px solid #e2e8f0',color:'#94a3b8',fontWeight:600,textTransform:'uppercase',fontSize:10,letterSpacing:'0.5px'}}>Destino</th>
                <th style={{textAlign:'right',padding:'6px 8px',borderBottom:'1px solid #e2e8f0',color:'#94a3b8',fontWeight:600,textTransform:'uppercase',fontSize:10,letterSpacing:'0.5px'}}>Llamadas</th>
                <th style={{textAlign:'right',padding:'6px 8px',borderBottom:'1px solid #e2e8f0',color:'#94a3b8',fontWeight:600,textTransform:'uppercase',fontSize:10,letterSpacing:'0.5px'}}>Minutos</th>
              </tr>
            </thead>
            <tbody>
              {topDestinos.map((r,i)=>(
                <tr key={i} style={{borderBottom:'1px solid #f8fafc'}}>
                  <td style={{padding:'7px 8px',color:'#94a3b8'}}>{i+1}</td>
                  <td style={{padding:'7px 8px',fontFamily:'monospace',fontWeight:600,color:'#0f172a'}}>{r.numero}</td>
                  <td style={{padding:'7px 8px',textAlign:'right'}}>{r.llamadas?.toLocaleString()}</td>
                  <td style={{padding:'7px 8px',textAlign:'right',fontFamily:'monospace',color:'#057a55'}}>{parseFloat(r.minutos).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
