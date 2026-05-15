import { useState, useEffect, useCallback } from "react";
import api from "../api";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from "recharts";

async function safe(fn) { try { return await fn(); } catch { return null; } }

const BAR_COLORS = ["#1a8cff","#00c98d","#f5a623","#ff4757","#54a0ff","#a29bfe"];

const TOOLTIP_STYLE = {
  background:"#162035", border:"1px solid rgba(255,255,255,0.07)",
  borderRadius:8, fontSize:11, color:"#e8edf5",
};

function KpiCard({ label, value, sub, color }) {
  return (
    <div className="nv-kpi">
      <div className="nv-kpi-label">{label}</div>
      <div className="nv-kpi-value" style={{ color:color||"var(--text-primary)" }}>{value??<span className="nv-spinner"/>}</div>
      {sub && <div className="nv-kpi-sub">{sub}</div>}
    </div>
  );
}

function SectionTitle({ children }) {
  return <div style={{ fontSize:12, fontWeight:700, color:"var(--text-secondary)", textTransform:"uppercase", letterSpacing:".08em", margin:"20px 0 12px" }}>{children}</div>;
}

export default function Metricas() {
  const [resumen,      setResumen]      = useState(null);
  const [porMes,       setPorMes]       = useState([]);
  const [porContexto,  setPorContexto]  = useState([]);
  const [topOrigenes,  setTopOrigenes]  = useState([]);
  const [topDestinos,  setTopDestinos]  = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [meses,        setMeses]        = useState(6);

  const load = useCallback(async (m) => {
    setLoading(true);
    const mm = m||meses;
    const [r,pm,pc,to,td] = await Promise.all([
      safe(()=>api.get("/metricas/resumen?meses="+mm)),
      safe(()=>api.get("/metricas/por-mes?meses="+mm)),
      safe(()=>api.get("/metricas/por-contexto?meses="+mm)),
      safe(()=>api.get("/metricas/top-origenes?meses="+mm+"&limit=10")),
      safe(()=>api.get("/metricas/top-destinos?meses="+mm+"&limit=10")),
    ]);
    setResumen(r?.data||null);
    setPorMes((pm?.data?.data||[]).map(d=>({
      ...d,
      minutos:    Math.round(parseFloat(d.minutos)||0),
      min_cel:    Math.round(parseFloat(d.min_cel)||0),
      min_loc:    Math.round(parseFloat(d.min_loc)||0),
      min_nac:    Math.round(parseFloat(d.min_nac)||0),
      min_onnet:  Math.round(parseFloat(d.min_onnet)||0),
      llamadas:   parseInt(d.llamadas)||0,
    })));
    setPorContexto((pc?.data?.data||[]).map(d=>({
      name: d.contexto||"otros",
      value: Math.round(parseFloat(d.minutos)||0),
      llamadas: parseInt(d.llamadas)||0,
    })));
    setTopOrigenes((to?.data?.data||[]).map(d=>({
      numero: d.numero||"—",
      minutos: Math.round(parseFloat(d.minutos)||0),
      llamadas: parseInt(d.llamadas)||0,
    })));
    setTopDestinos((td?.data?.data||[]).map(d=>({
      numero: d.numero||"—",
      minutos: Math.round(parseFloat(d.minutos)||0),
      llamadas: parseInt(d.llamadas)||0,
    })));
    setLoading(false);
  }, [meses]);

  useEffect(()=>{ load(); },[load]);

  const handleMeses = (m) => { setMeses(m); load(m); };

  const total    = parseInt(resumen?.total_llamadas)||0;
  const cont     = parseInt(resumen?.contestadas)||0;
  const noResp   = parseInt(resumen?.no_contestadas)||0;
  const mins     = parseFloat(resumen?.total_minutos)||0;
  const asr      = total>0?((cont/total)*100).toFixed(1):"—";
  const acd      = cont>0?Math.round((mins/cont)*60):"—";
  const ner      = total>0?(((cont+noResp)/total)*100).toFixed(1):"—";

  return (
    <div>
      <div className="nv-page-header">
        <div>
          <div className="nv-page-title">Métricas VoIP</div>
          <div className="nv-page-sub">Análisis de tráfico y calidad de servicio</div>
        </div>
        <div className="nv-page-actions">
          {[1,3,6,12].map(m=>(
            <button key={m}
              className={"nv-btn nv-btn-sm "+(meses===m?"nv-btn-secondary":"nv-btn-ghost")}
              onClick={()=>handleMeses(m)}>
              {m===1?"1 mes":m===12?"12 meses":m+" meses"}
            </button>
          ))}
          <button className="nv-btn nv-btn-secondary nv-btn-sm" onClick={()=>load()} disabled={loading}>
            {loading?<span className="nv-spinner"/>:"↺"} Actualizar
          </button>
        </div>
      </div>

      <div className="nv-kpi-grid">
        <KpiCard label="Total llamadas"   value={loading?null:total.toLocaleString()} sub={meses+" meses"} color="var(--brand)"/>
        <KpiCard label="Contestadas"      value={loading?null:cont.toLocaleString()}  sub={asr+"% ASR"}   color="var(--success)"/>
        <KpiCard label="No contestadas"   value={loading?null:noResp.toLocaleString()} color="var(--danger)"/>
        <KpiCard label="Minutos totales"  value={loading?null:Math.round(mins).toLocaleString()} sub={(mins/60).toFixed(1)+" horas"} color="var(--info)"/>
        <KpiCard label="ASR"              value={loading?null:asr+"%"}   sub="Answer Seizure Ratio"  color={parseFloat(asr)>65?"var(--success)":"var(--warning)"}/>
        <KpiCard label="ACD"              value={loading?null:(acd?acd+"s":"—")} sub="Avg Call Duration" color="var(--brand)"/>
        <KpiCard label="NER"              value={loading?null:ner+"%"}   sub="Network Effectiveness"  color="var(--info)"/>
        <KpiCard label="Salientes"        value={loading?null:(parseInt(resumen?.salientes)||0).toLocaleString()} color="var(--text-primary)"/>
      </div>

      {loading ? (
        <div className="nv-loading" style={{ padding:"60px 0" }}><span className="nv-spinner"/><span>Cargando métricas...</span></div>
      ) : (
        <>
          <SectionTitle>Tráfico por mes</SectionTitle>
          <div className="nv-card" style={{ marginBottom:16 }}>
            <div className="nv-card-header">
              <span className="nv-card-title">◈ Minutos por mes</span>
              <span style={{ fontSize:10, color:"var(--text-muted)" }}>Desglose por destino</span>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={porMes} margin={{ top:4, right:8, left:0, bottom:0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)"/>
                <XAxis dataKey="mes" tick={{ fill:"#4a5568", fontSize:10 }} tickLine={false}/>
                <YAxis tick={{ fill:"#4a5568", fontSize:10 }} tickLine={false} axisLine={false}/>
                <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill:"rgba(255,255,255,0.03)" }}/>
                <Bar dataKey="min_loc"   name="Local"        stackId="a" fill="#1a8cff" radius={[0,0,0,0]}/>
                <Bar dataKey="min_cel"   name="Celular"      stackId="a" fill="#f5a623"/>
                <Bar dataKey="min_nac"   name="Nacional"     stackId="a" fill="#00c98d"/>
                <Bar dataKey="min_onnet" name="On-net"       stackId="a" fill="#a29bfe" radius={[3,3,0,0]}/>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="nv-card" style={{ marginBottom:16 }}>
            <div className="nv-card-header">
              <span className="nv-card-title">◈ Llamadas por mes</span>
            </div>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={porMes} margin={{ top:4, right:8, left:0, bottom:0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)"/>
                <XAxis dataKey="mes" tick={{ fill:"#4a5568", fontSize:10 }} tickLine={false}/>
                <YAxis tick={{ fill:"#4a5568", fontSize:10 }} tickLine={false} axisLine={false}/>
                <Tooltip contentStyle={TOOLTIP_STYLE}/>
                <Line type="monotone" dataKey="llamadas" name="Llamadas" stroke="#1a8cff" strokeWidth={2} dot={{ fill:"#1a8cff", r:3 }}/>
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="nv-grid-2" style={{ marginBottom:16 }}>
            <div className="nv-card">
              <div className="nv-card-header">
                <span className="nv-card-title">▤ Top 10 orígenes</span>
                <span style={{ fontSize:10, color:"var(--text-muted)" }}>Por minutos</span>
              </div>
              <div className="nv-table-wrap">
                <table className="nv-table">
                  <thead><tr><th>#</th><th>Número</th><th>Llamadas</th><th>Minutos</th></tr></thead>
                  <tbody>
                    {topOrigenes.map((r,i)=>(
                      <tr key={r.numero}>
                        <td style={{ color:"var(--text-muted)", fontSize:10 }}>{i+1}</td>
                        <td className="mono">{r.numero}</td>
                        <td style={{ color:"var(--info)" }}>{r.llamadas.toLocaleString()}</td>
                        <td style={{ color:"var(--brand)", fontFamily:"var(--font-mono)", fontWeight:600 }}>{r.minutos.toLocaleString()}</td>
                      </tr>
                    ))}
                    {!topOrigenes.length&&<tr><td colSpan={4} style={{ textAlign:"center", color:"var(--text-muted)", padding:20 }}>Sin datos</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="nv-card">
              <div className="nv-card-header">
                <span className="nv-card-title">▤ Top 10 destinos</span>
                <span style={{ fontSize:10, color:"var(--text-muted)" }}>Por minutos</span>
              </div>
              <div className="nv-table-wrap">
                <table className="nv-table">
                  <thead><tr><th>#</th><th>Número</th><th>Llamadas</th><th>Minutos</th></tr></thead>
                  <tbody>
                    {topDestinos.map((r,i)=>(
                      <tr key={r.numero}>
                        <td style={{ color:"var(--text-muted)", fontSize:10 }}>{i+1}</td>
                        <td className="mono">{r.numero}</td>
                        <td style={{ color:"var(--info)" }}>{r.llamadas.toLocaleString()}</td>
                        <td style={{ color:"var(--brand)", fontFamily:"var(--font-mono)", fontWeight:600 }}>{r.minutos.toLocaleString()}</td>
                      </tr>
                    ))}
                    {!topDestinos.length&&<tr><td colSpan={4} style={{ textAlign:"center", color:"var(--text-muted)", padding:20 }}>Sin datos</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="nv-grid-2">
            <div className="nv-card">
              <div className="nv-card-header">
                <span className="nv-card-title">○ Distribución por contexto</span>
              </div>
              {porContexto.length>0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={porContexto} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={75} label={({name,percent})=>name+" "+((percent||0)*100).toFixed(0)+"%"} labelLine={false} fontSize={10}>
                      {porContexto.map((_,i)=>(
                        <Cell key={i} fill={BAR_COLORS[i%BAR_COLORS.length]}/>
                      ))}
                    </Pie>
                    <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v,n)=>[v+" min",n]}/>
                  </PieChart>
                </ResponsiveContainer>
              ) : <div style={{ textAlign:"center", padding:"40px 0", color:"var(--text-muted)", fontSize:12 }}>Sin datos</div>}
            </div>

            <div className="nv-card">
              <div className="nv-card-header">
                <span className="nv-card-title">◈ Resumen de calidad</span>
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                {[
                  { lbl:"ASR (Answer Seizure Ratio)", val:asr+"%",  target:">65%",  ok:parseFloat(asr)>65 },
                  { lbl:"ACD (Avg Call Duration)",    val:acd?""+acd+"s":"—",  target:">30s", ok:parseInt(acd)>30 },
                  { lbl:"NER (Network Effectiveness)",val:ner+"%",  target:">90%",  ok:parseFloat(ner)>90 },
                  { lbl:"Llamadas contestadas",        val:cont.toLocaleString(), target:"",   ok:true },
                  { lbl:"Minutos on-net",              val:porMes.reduce((s,m)=>s+(m.min_onnet||0),0).toLocaleString()+" min", target:"", ok:true },
                ].map(({lbl,val,target,ok})=>(
                  <div key={lbl} style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 10px", background:"var(--bg-raised)", borderRadius:"var(--r-sm)" }}>
                    <div style={{ width:7, height:7, borderRadius:"50%", background:ok?"var(--success)":"var(--warning)", flexShrink:0 }}/>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:11, color:"var(--text-secondary)" }}>{lbl}</div>
                      {target&&<div style={{ fontSize:9, color:"var(--text-muted)" }}>Objetivo: {target}</div>}
                    </div>
                    <div style={{ fontFamily:"var(--font-mono)", fontSize:13, fontWeight:700, color:ok?"var(--success)":"var(--warning)" }}>{val}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
