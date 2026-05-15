import { useState, useEffect } from "react";
import apiv1 from "../api_v1";

const SANDBOX_CARDS = [
  { number:"4111111111111111", label:"Visa aprobada",  result:"approved", color:"var(--success)" },
  { number:"4000000000000002", label:"Visa rechazada", result:"declined", color:"var(--danger)"  },
  { number:"4000000000000069", label:"Visa fallida",   result:"failed",   color:"var(--warning)" },
];

export default function PortalPago() {
  const [step,    setStep]    = useState("select");
  const [card,    setCard]    = useState("4111111111111111");
  const [phone,   setPhone]   = useState("");
  const [method,  setMethod]  = useState("sandbox");
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");
  const [result,  setResult]  = useState(null);
  const [planInfo,setPlanInfo]= useState(null);
  const [payId,   setPayId]   = useState(null);

  const clientId = localStorage.getItem("portal_client_id");

  useEffect(()=>{
    // Cargar info del plan del cliente
    if (clientId) {
      apiv1.get("/clients/"+clientId).then(r=>{
        setPlanInfo({ amount: r.data?.plan_monthly_fee||5.00, plan: r.data?.plan_name||"Plan Base" });
      }).catch(()=>setPlanInfo({ amount:5.00, plan:"Plan Base" }));
    }
  },[clientId]);

  const amount = planInfo?.amount || 5.00;

  const handlePay = async () => {
    setLoading(true); setError("");
    try {
      // 1. Iniciar pago
      const init = await apiv1.post("/payments/init", {
        client_id: clientId,
        amount:    amount,
        gateway:   method,
        concept:   "activation",
      });
      const pid = init.data.payment_id;
      setPayId(pid);

      if (method === "sandbox") {
        // 2a. Sandbox — cobro directo
        const pay = await apiv1.post("/payments/sandbox/pay", {
          payment_id: pid,
          card_number: card,
        });
        setResult(pay.data);
        if (pay.data.status === "approved") {
          setStep("success");
          setTimeout(()=>{ window.location.href = "/portal/activacion"; }, 3000);
        } else {
          setStep("failed");
        }
      } else if (method === "payphone") {
        // 2b. PayPhone — obtener link de pago
        const pp = await apiv1.post("/payments/payphone/init", {
          payment_id:  pid,
          phone_number: phone,
          amount_without_tax: amount,
          amount_with_tax: 0,
          tax: 0,
        });
        if (pp.data.mode === "sandbox") {
          // Sandbox PayPhone — simular con tarjeta
          setStep("payphone_sandbox");
        } else {
          // Live — redirigir a PayPhone
          window.location.href = pp.data.payment_url;
        }
      }
    } catch(e) {
      setError(e?.response?.data?.detail||"Error en el proceso de pago");
    } finally { setLoading(false); }
  };

  const handlePayphoneSandbox = async () => {
    setLoading(true); setError("");
    try {
      const pay = await apiv1.post("/payments/sandbox/pay", {
        payment_id: payId,
        card_number: card,
      });
      setResult(pay.data);
      if (pay.data.status === "approved") {
        setStep("success");
        setTimeout(()=>{ window.location.href = "/portal/activacion"; }, 3000);
      } else {
        setStep("failed");
      }
    } catch(e) { setError(e?.response?.data?.detail||"Error"); }
    finally { setLoading(false); }
  };

  const s = {
    wrap:   { minHeight:"100vh",background:"#070c14",display:"flex",alignItems:"center",justifyContent:"center",padding:"24px",fontFamily:"Sora,sans-serif" },
    card:   { background:"#0b1120",border:"1px solid rgba(255,255,255,0.07)",borderRadius:16,padding:"36px 32px",width:"100%",maxWidth:460 },
    title:  { fontSize:22,fontWeight:700,color:"#e8edf5",marginBottom:6 },
    sub:    { fontSize:13,color:"#4a5568",marginBottom:28 },
    label:  { fontSize:11,fontWeight:600,textTransform:"uppercase",letterSpacing:".06em",color:"#4a5568",marginBottom:6,display:"block" },
    input:  { width:"100%",background:"#162035",border:"1px solid rgba(255,255,255,0.08)",borderRadius:8,padding:"10px 14px",color:"#e8edf5",fontSize:13,outline:"none",boxSizing:"border-box" },
    btn:    { width:"100%",padding:"13px",borderRadius:10,border:"none",fontSize:14,fontWeight:700,cursor:"pointer",transition:"all .2s" },
    amount: { background:"#162035",borderRadius:12,padding:"16px 20px",textAlign:"center",marginBottom:24 },
    error:  { background:"rgba(255,71,87,0.1)",border:"1px solid rgba(255,71,87,0.3)",borderRadius:8,padding:"10px 14px",color:"#ff4757",fontSize:12,marginBottom:16 },
  };

  if (step === "success") return (
    <div style={s.wrap}>
      <div style={s.card}>
        <div style={{ textAlign:"center" }}>
          <div style={{ fontSize:48,marginBottom:16 }}>✅</div>
          <div style={{ fontSize:20,fontWeight:700,color:"#00c98d",marginBottom:8 }}>Pago aprobado</div>
          <div style={{ fontSize:13,color:"#4a5568",marginBottom:8 }}>
            Ref: <span style={{ fontFamily:"monospace",color:"#1a8cff" }}>{result?.gateway_ref}</span>
          </div>
          <div style={{ fontSize:12,color:"#4a5568" }}>Redirigiendo a activación...</div>
        </div>
      </div>
    </div>
  );

  if (step === "failed") return (
    <div style={s.wrap}>
      <div style={s.card}>
        <div style={{ textAlign:"center" }}>
          <div style={{ fontSize:48,marginBottom:16 }}>❌</div>
          <div style={{ fontSize:20,fontWeight:700,color:"#ff4757",marginBottom:8 }}>Pago no procesado</div>
          <div style={{ fontSize:13,color:"#4a5568",marginBottom:24 }}>{result?.message}</div>
          <button style={{ ...s.btn,background:"#1a8cff",color:"#fff" }} onClick={()=>{ setStep("select"); setResult(null); setError(""); }}>
            Intentar nuevamente
          </button>
        </div>
      </div>
    </div>
  );

  if (step === "payphone_sandbox") return (
    <div style={s.wrap}>
      <div style={s.card}>
        <div style={{ textAlign:"center",marginBottom:24 }}>
          <div style={{ fontSize:13,color:"#1a8cff",fontWeight:700,marginBottom:4 }}>PayPhone Sandbox</div>
          <div style={{ fontSize:12,color:"#4a5568" }}>Selecciona una tarjeta de prueba</div>
        </div>
        {SANDBOX_CARDS.map(c=>(
          <div key={c.number} onClick={()=>setCard(c.number)}
            style={{ display:"flex",alignItems:"center",gap:12,padding:"12px 14px",
              borderRadius:10,border:"2px solid "+(card===c.number?"#1a8cff":"rgba(255,255,255,0.06)"),
              cursor:"pointer",marginBottom:8,background:card===c.number?"rgba(26,140,255,0.08)":"transparent" }}>
            <div style={{ width:8,height:8,borderRadius:"50%",background:c.color,flexShrink:0 }}/>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:12,fontFamily:"monospace",color:"#e8edf5" }}>{c.number}</div>
              <div style={{ fontSize:11,color:"#4a5568" }}>{c.label}</div>
            </div>
            {card===c.number&&<div style={{ fontSize:16,color:"#1a8cff" }}>✓</div>}
          </div>
        ))}
        {error&&<div style={s.error}>{error}</div>}
        <button style={{ ...s.btn,background:"#1a8cff",color:"#fff",marginTop:16 }}
          onClick={handlePayphoneSandbox} disabled={loading}>
          {loading?<span>Procesando...</span>:"Confirmar pago PayPhone sandbox"}
        </button>
      </div>
    </div>
  );

  return (
    <div style={s.wrap}>
      <div style={s.card}>
        <div style={{ textAlign:"center",marginBottom:28 }}>
          <div style={{ fontSize:11,fontWeight:700,color:"#1a8cff",textTransform:"uppercase",letterSpacing:".1em",marginBottom:8 }}>
            Netvoice / Linkotel
          </div>
          <div style={s.title}>Activación de servicio</div>
          <div style={s.sub}>Completa el pago para activar tu línea</div>
        </div>

        <div style={s.amount}>
          <div style={{ fontSize:11,color:"#4a5568",marginBottom:4 }}>{planInfo?.plan||"Plan Base"}</div>
          <div style={{ fontSize:36,fontWeight:700,color:"#e8edf5" }}>
            ${parseFloat(amount).toFixed(2)}
            <span style={{ fontSize:14,color:"#4a5568",fontWeight:400 }}> USD</span>
          </div>
          <div style={{ fontSize:11,color:"#4a5568",marginTop:4 }}>Pago de activación</div>
        </div>

        <div style={{ marginBottom:20 }}>
          <label style={s.label}>Método de pago</label>
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:8 }}>
            {[
              { key:"sandbox",  label:"Sandbox (prueba)",  icon:"▦" },
              { key:"payphone", label:"PayPhone Ecuador",  icon:"☎" },
            ].map(m=>(
              <div key={m.key} onClick={()=>setMethod(m.key)}
                style={{ padding:"12px",borderRadius:10,textAlign:"center",cursor:"pointer",
                  border:"2px solid "+(method===m.key?"#1a8cff":"rgba(255,255,255,0.06)"),
                  background:method===m.key?"rgba(26,140,255,0.08)":"transparent" }}>
                <div style={{ fontSize:18,marginBottom:4 }}>{m.icon}</div>
                <div style={{ fontSize:11,color:method===m.key?"#1a8cff":"#4a5568",fontWeight:600 }}>{m.label}</div>
              </div>
            ))}
          </div>
        </div>

        {method === "sandbox" && (
          <div style={{ marginBottom:20 }}>
            <label style={s.label}>Tarjeta de prueba</label>
            {SANDBOX_CARDS.map(c=>(
              <div key={c.number} onClick={()=>setCard(c.number)}
                style={{ display:"flex",alignItems:"center",gap:10,padding:"10px 12px",
                  borderRadius:8,border:"1px solid "+(card===c.number?"#1a8cff":"rgba(255,255,255,0.06)"),
                  cursor:"pointer",marginBottom:6,background:card===c.number?"rgba(26,140,255,0.06)":"transparent" }}>
                <div style={{ width:7,height:7,borderRadius:"50%",background:c.color,flexShrink:0 }}/>
                <div style={{ flex:1 }}>
                  <span style={{ fontSize:12,fontFamily:"monospace",color:"#e8edf5" }}>{c.number}</span>
                  <span style={{ fontSize:11,color:"#4a5568",marginLeft:8 }}>{c.label}</span>
                </div>
                {card===c.number&&<span style={{ color:"#1a8cff" }}>✓</span>}
              </div>
            ))}
          </div>
        )}

        {method === "payphone" && (
          <div style={{ marginBottom:20 }}>
            <label style={s.label}>Teléfono (para notificación PayPhone)</label>
            <input style={s.input} type="tel" value={phone}
              onChange={e=>setPhone(e.target.value)}
              placeholder="09XXXXXXXX"/>
            <div style={{ fontSize:11,color:"#4a5568",marginTop:6 }}>
              En modo sandbox serás redirigido al simulador de PayPhone.
            </div>
          </div>
        )}

        {error && <div style={s.error}>{error}</div>}

        <button style={{ ...s.btn, background:loading?"#162035":"#1a8cff", color:loading?"#4a5568":"#fff" }}
          onClick={handlePay} disabled={loading||!clientId}>
          {loading?"Procesando...":method==="payphone"?"Pagar con PayPhone →":"Confirmar pago $"+parseFloat(amount).toFixed(2)}
        </button>

        <div style={{ textAlign:"center",marginTop:16,fontSize:11,color:"#2d3748" }}>
          Pago seguro · Sandbox activo · No se realizan cobros reales
        </div>
      </div>
    </div>
  );
}
