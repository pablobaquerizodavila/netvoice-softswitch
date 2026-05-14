/* global React, ReactDOM */
const { useState, useEffect, useRef, useMemo } = React;

// ============================================================
// Primitives
// ============================================================

const Logo = ({ size = 22 }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
    <img src="assets/logo.png" alt="" width={size} height={size}
         style={{ display: "block", borderRadius: 4 }} />
    <span style={{
      fontFamily: "'Inter', sans-serif",
      fontWeight: 600,
      fontSize: 15,
      letterSpacing: "-0.005em",
      color: "var(--text)",
    }}>
      eneural
    </span>
  </div>
);

const StatusPill = () => {
  const [pulse, setPulse] = useState(true);
  useEffect(() => {
    const i = setInterval(() => setPulse(p => !p), 1200);
    return () => clearInterval(i);
  }, []);
  return (
    <div className="status-pill">
      <span className="status-dot" data-on={pulse} />
      <span className="mono small">All regions operational</span>
    </div>
  );
};

const Nav = () => (
  <nav className="nav">
    <Logo />
    <div className="nav-links">
      <a href="#platform">Plataforma</a>
      <a href="#telemetry">Live</a>
      <a href="#why">Por qué</a>
      <a href="#industries">Industrias</a>
      <a href="#contact">Contacto</a>
    </div>
    <div className="nav-right">
      <StatusPill />
      <a href="/login" className="btn btn-panel btn-sm">
        Acceder al panel
        <ArrowRight />
      </a>
    </div>
  </nav>
);

const ArrowRight = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
    <path d="M2 6h7m-2.5-3L9 6 6.5 9" stroke="currentColor" strokeWidth="1.5"
          strokeLinecap="square" />
  </svg>
);

// ============================================================
// Hero — Signal / Waveform visual
// ============================================================

const SignalCanvas = () => {
  const canvasRef = useRef(null);
  const rafRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const dpr = window.devicePixelRatio || 1;
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
    };
    resize();
    window.addEventListener("resize", resize);

    const channels = 14;
    const startT = performance.now();

    // Each channel has independent amplitude / frequency / phase
    const cfg = Array.from({ length: channels }, (_, i) => ({
      amp: 6 + Math.random() * 22,
      freq: 0.4 + Math.random() * 1.6,
      phase: Math.random() * Math.PI * 2,
      hue: i === 4 ? "alert" : "blue",
      muted: i === 7 || i === 11, // some channels "silent" to make the message land
    }));

    let alertOn = false;
    let alertStart = 0;

    const draw = (now) => {
      const t = (now - startT) / 1000;
      const w = canvas.width / dpr;
      const h = canvas.height / dpr;
      ctx.clearRect(0, 0, w, h);

      // grid
      ctx.strokeStyle = "rgba(255,255,255,0.04)";
      ctx.lineWidth = 1;
      const gx = 40;
      for (let x = 0; x < w; x += gx) {
        ctx.beginPath();
        ctx.moveTo(x + 0.5, 0);
        ctx.lineTo(x + 0.5, h);
        ctx.stroke();
      }

      // alert trigger (every ~6s a "spike" reminds you what failure looks like)
      if (!alertOn && (t % 7) < 0.05) {
        alertOn = true;
        alertStart = t;
      }
      if (alertOn && t - alertStart > 1.4) alertOn = false;

      const rowH = h / channels;
      cfg.forEach((c, i) => {
        const y = rowH * (i + 0.5);
        const muted = c.muted;
        const isAlertRow = i === 4 && alertOn;

        // baseline
        ctx.strokeStyle = muted
          ? "rgba(255,255,255,0.06)"
          : isAlertRow
          ? "rgba(244, 99, 99, 0.65)"
          : "rgba(52, 211, 153, 0.18)";
        ctx.lineWidth = muted ? 1 : 1;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();

        if (muted) {
          // "silent" channel dashed
          ctx.setLineDash([2, 6]);
          ctx.strokeStyle = "rgba(255,255,255,0.12)";
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(w, y);
          ctx.stroke();
          ctx.setLineDash([]);
          return;
        }

        // waveform
        ctx.beginPath();
        const samples = Math.floor(w / 2);
        for (let s = 0; s <= samples; s++) {
          const x = (s / samples) * w;
          const u = (s / samples) * 6 + t * c.freq + c.phase + i * 0.7;
          let val =
            Math.sin(u) * c.amp +
            Math.sin(u * 2.3) * c.amp * 0.3 +
            Math.sin(u * 5.1) * c.amp * 0.15;
          if (isAlertRow) val *= 3.2 * Math.exp(-(t - alertStart) * 0.8);
          ctx.lineTo(x, y + val * 0.25);
        }
        const grad = ctx.createLinearGradient(0, 0, w, 0);
        if (isAlertRow) {
          grad.addColorStop(0, "rgba(244,99,99,0)");
          grad.addColorStop(0.5, "rgba(244,99,99,1)");
          grad.addColorStop(1, "rgba(244,99,99,0)");
        } else {
          grad.addColorStop(0, "rgba(52,211,153,0)");
          grad.addColorStop(0.5, "rgba(52,211,153,0.85)");
          grad.addColorStop(1, "rgba(52,211,153,0)");
        }
        ctx.strokeStyle = grad;
        ctx.lineWidth = isAlertRow ? 1.4 : 1;
        ctx.stroke();
      });

      rafRef.current = requestAnimationFrame(draw);
    };
    rafRef.current = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return <canvas ref={canvasRef} className="signal-canvas" />;
};

const Hero = () => {
  return (
    <section className="hero">
      <div className="hero-grid-bg" />
      <SignalCanvas />
      <div className="hero-content">
        <div className="hero-eyebrow mono small">
          <span className="dot" /> Carrier-class voice infrastructure
        </div>
        <h1 className="hero-title">
          Silence is&nbsp;not<br />
          an&nbsp;option.
        </h1>
        <p className="hero-sub">
          Detrás de cada llamada hay un negocio operando, un hospital
          atendiendo, una emergencia resolviéndose. <strong>eneural</strong>{" "}
          construye la infraestructura que mantiene viva la comunicación
          crítica — cuando todo lo demás falla.
        </p>
        <div className="hero-cta">
          <a href="/login" className="btn btn-primary btn-lg">
            Acceder al panel
            <ArrowRight />
          </a>
          <a href="#platform" className="btn btn-ghost btn-lg">
            Ver la plataforma
          </a>
        </div>
        <div className="hero-meta">
          <MetaStat label="Uptime SLA" value="99.999%" />
          <MetaStat label="Concurrent calls" value="4.2M" />
          <MetaStat label="Regiones activas" value="11" />
          <MetaStat label="Mean failover" value="< 800ms" />
        </div>
      </div>
    </section>
  );
};

const MetaStat = ({ label, value }) => (
  <div className="meta-stat">
    <div className="meta-value">{value}</div>
    <div className="meta-label mono small">{label}</div>
  </div>
);

// ============================================================
// Cost of Silence
// ============================================================

const CostOfSilence = () => {
  const [seconds, setSeconds] = useState(0);
  const [running, setRunning] = useState(true);

  useEffect(() => {
    if (!running) return;
    const i = setInterval(() => setSeconds(s => s + 1), 100); // 10x speed
    return () => clearInterval(i);
  }, [running]);

  const minutesDown = seconds / 6; // (seconds*10)/60
  const lostCalls = Math.floor(minutesDown * 1840);
  const lostRevenue = Math.floor(minutesDown * 9400);
  const ticketsOpen = Math.floor(minutesDown * 23);

  return (
    <section className="section" id="cost">
      <div className="container">
        <div className="section-head">
          <div className="eyebrow mono small">01 — The cost of silence</div>
          <h2 className="section-title">
            Una caída no es un incidente técnico.<br />
            <span className="muted">Es pérdida de clientes, reputación y confianza.</span>
          </h2>
        </div>

        <div className="silence-panel">
          <div className="silence-bar">
            <div className="silence-bar-left">
              <span className="status-dot" data-critical />
              <span className="mono small">SIMULATED OUTAGE</span>
              <span className="mono small muted">· acme telecom · region us-east-1</span>
            </div>
            <div className="silence-bar-right">
              <button className="ctrl" onClick={() => { setSeconds(0); setRunning(true); }}>
                Restart
              </button>
              <button className="ctrl" onClick={() => setRunning(r => !r)}>
                {running ? "Pause" : "Resume"}
              </button>
            </div>
          </div>

          <div className="silence-body">
            <div className="silence-clock">
              <div className="mono small muted">DOWNTIME</div>
              <div className="clock-value">
                {String(Math.floor(minutesDown / 60)).padStart(2, "0")}
                <span className="clock-sep">:</span>
                {String(Math.floor(minutesDown) % 60).padStart(2, "0")}
                <span className="clock-sep">:</span>
                {String(Math.floor((minutesDown * 60) % 60)).padStart(2, "0")}
              </div>
              <div className="mono small muted">hh : mm : ss</div>
            </div>
            <div className="silence-stats">
              <SilenceStat label="Llamadas perdidas" value={lostCalls.toLocaleString()} />
              <SilenceStat label="Revenue lost" value={"$" + lostRevenue.toLocaleString()} />
              <SilenceStat label="Tickets abiertos" value={ticketsOpen.toString()} />
              <SilenceStat label="NPS impact" value={(minutesDown * 0.18).toFixed(1) + " pts"} />
            </div>
          </div>

          <div className="silence-footer mono small muted">
            Modelo basado en operador de ~250k concurrent calls. La pérdida real
            crece de forma no lineal con la duración del incidente.
          </div>
        </div>
      </div>
    </section>
  );
};

const SilenceStat = ({ label, value }) => (
  <div className="silence-stat">
    <div className="mono small muted">{label}</div>
    <div className="silence-stat-value">{value}</div>
  </div>
);

// ============================================================
// Platform
// ============================================================

const Platform = () => {
  const items = [
    { code: "01", title: "Softswitch carrier-grade", body: "Class 4 / Class 5 con enrutamiento determinístico, LCR multi-tier y CDR consolidados en tiempo real.", tags: ["SIP", "RTP", "Routing"] },
    { code: "02", title: "Session Border Controllers", body: "SBCs distribuidos en frontera con normalización SIP, anti-fraude, topology hiding y mitigación de SIP DDoS.", tags: ["SBC", "Security", "Anti-Fraud"] },
    { code: "03", title: "WebRTC gateway", body: "Browser-native voice y video con transcoding al vuelo, ICE/TURN propios y latencias por debajo de 150ms.", tags: ["WebRTC", "Media", "TURN"] },
    { code: "04", title: "Multi-tenant cloud", body: "Aislamiento por tenant a nivel de plano de control y datos. Quotas por concurrencia, CPS y ancho de banda.", tags: ["Cloud", "Tenants", "Quotas"] },
    { code: "05", title: "Continuidad operativa", body: "Réplica activa-activa entre regiones, failover sub-segundo y recuperación de sesiones en curso sin drop.", tags: ["HA", "DR", "Active-Active"] },
    { code: "06", title: "Automatización de tráfico", body: "Steering en vivo por calidad de ruta, ASR, ACD y costo. Reacciones en frío y caliente sin intervención humana.", tags: ["Ops", "Routing", "AI-assist"] },
  ];

  return (
    <section className="section" id="platform">
      <div className="container">
        <div className="section-head">
          <div className="eyebrow mono small">02 — Platform</div>
          <h2 className="section-title">
            Una sola plataforma.<br />
            <span className="muted">Capas independientes. Fallas aisladas.</span>
          </h2>
        </div>

        <div className="platform-grid">
          {items.map((it) => (
            <article className="platform-card" key={it.code}>
              <div className="card-top">
                <span className="mono small muted">{it.code}</span>
                <span className="card-status">
                  <span className="status-dot" data-on />
                  <span className="mono small">live</span>
                </span>
              </div>
              <h3 className="card-title">{it.title}</h3>
              <p className="card-body">{it.body}</p>
              <div className="card-tags">
                {it.tags.map(t => <span key={t} className="tag mono small">{t}</span>)}
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
};

// ============================================================
// Live Telemetry
// ============================================================

const LiveTelemetry = () => {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const i = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(i);
  }, []);

  // Pseudo-live numbers that drift
  const baseCalls = 4_218_400;
  const drift = Math.sin(tick * 0.6) * 8200 + Math.cos(tick * 0.21) * 3100;
  const calls = Math.round(baseCalls + drift);
  const cps = Math.round(18900 + Math.sin(tick * 0.9) * 410);
  const asr = (62.8 + Math.sin(tick * 0.3) * 0.4).toFixed(2);
  const acd = (4.21 + Math.sin(tick * 0.7) * 0.05).toFixed(2);

  const regions = [
    { id: "us-east-1",  name: "N. Virginia",   status: "ok",   load: 0.72 },
    { id: "us-west-2",  name: "Oregon",        status: "ok",   load: 0.41 },
    { id: "sa-east-1",  name: "São Paulo",     status: "ok",   load: 0.66 },
    { id: "mx-central", name: "Querétaro",     status: "ok",   load: 0.58 },
    { id: "eu-west-3",  name: "Paris",         status: "ok",   load: 0.49 },
    { id: "eu-central", name: "Frankfurt",     status: "warn", load: 0.81 },
    { id: "me-south-1", name: "Bahrain",       status: "ok",   load: 0.34 },
    { id: "ap-south-1", name: "Mumbai",        status: "ok",   load: 0.55 },
    { id: "ap-se-1",    name: "Singapore",     status: "ok",   load: 0.62 },
    { id: "ap-ne-1",    name: "Tokyo",         status: "ok",   load: 0.47 },
    { id: "af-south-1", name: "Cape Town",     status: "ok",   load: 0.29 },
  ];

  // Tiny sparkline data
  const sparkData = useMemo(() => {
    const arr = [];
    for (let i = 0; i < 60; i++) {
      arr.push(0.5 + 0.35 * Math.sin(i * 0.4) + 0.1 * Math.sin(i * 1.7) + Math.random() * 0.05);
    }
    return arr;
  }, []);
  // shift sparkline by tick
  const shifted = sparkData.map((v, i) => v + 0.05 * Math.sin((i + tick) * 0.3));

  return (
    <section className="section" id="telemetry">
      <div className="container">
        <div className="section-head">
          <div className="eyebrow mono small">03 — Live</div>
          <h2 className="section-title">
            Telemetría en tiempo real.<br />
            <span className="muted">Lo que está pasando ahora mismo en la red.</span>
          </h2>
        </div>

        <div className="telemetry-frame">
          <div className="telemetry-chrome">
            <div className="chrome-left">
              <div className="chrome-dots">
                <span /><span /><span />
              </div>
              <span className="mono small muted">noc.eneural.io / global</span>
            </div>
            <div className="chrome-right mono small">
              <span className="status-dot" data-on />
              <span>connected · {new Date().toUTCString().slice(17, 25)} UTC</span>
            </div>
          </div>

          <div className="telemetry-grid">
            <div className="tile tile-wide">
              <div className="tile-head">
                <span className="mono small muted">Concurrent calls</span>
                <span className="mono small accent-up">+ 0.4%</span>
              </div>
              <div className="tile-big">{calls.toLocaleString()}</div>
              <Sparkline data={shifted} />
            </div>

            <div className="tile">
              <div className="tile-head">
                <span className="mono small muted">CPS</span>
              </div>
              <div className="tile-big">{cps.toLocaleString()}</div>
              <div className="mono small muted">calls per second</div>
            </div>

            <div className="tile">
              <div className="tile-head">
                <span className="mono small muted">ASR · global</span>
              </div>
              <div className="tile-big">{asr}<span className="unit">%</span></div>
              <div className="mono small muted">answer seizure ratio</div>
            </div>

            <div className="tile">
              <div className="tile-head">
                <span className="mono small muted">ACD</span>
              </div>
              <div className="tile-big">{acd}<span className="unit">m</span></div>
              <div className="mono small muted">average call duration</div>
            </div>

            <div className="tile tile-regions">
              <div className="tile-head">
                <span className="mono small muted">Regions · load</span>
                <span className="mono small muted">{regions.length} pops</span>
              </div>
              <div className="region-list">
                {regions.map(r => (
                  <div className="region-row" key={r.id}>
                    <span className="status-dot" data-on={r.status === "ok"} data-warn={r.status === "warn"} />
                    <span className="mono small region-id">{r.id}</span>
                    <span className="region-name">{r.name}</span>
                    <div className="region-bar">
                      <div className="region-bar-fill"
                           data-warn={r.status === "warn"}
                           style={{ width: (r.load * 100) + "%" }} />
                    </div>
                    <span className="mono small region-load">{Math.round(r.load * 100)}%</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="tile tile-events">
              <div className="tile-head">
                <span className="mono small muted">Recent events</span>
              </div>
              <ul className="event-list">
                <EventRow t="02:14:08" label="auto-failover eu-central → eu-west-3" kind="warn" />
                <EventRow t="02:13:51" label="route swap: carrier-c → carrier-a (better ASR)" kind="info" />
                <EventRow t="02:12:30" label="SBC pool scaled up: ap-se-1 (+4 nodes)" kind="ok" />
                <EventRow t="02:09:14" label="DDoS mitigated: 18.2k pps SIP INVITE flood" kind="warn" />
                <EventRow t="02:04:01" label="tenant onboarded: callcenter.cl · 12k concurrent" kind="ok" />
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

const Sparkline = ({ data }) => {
  const w = 100, h = 28;
  const max = Math.max(...data), min = Math.min(...data);
  const norm = data.map(v => (v - min) / (max - min || 1));
  const pts = norm.map((v, i) =>
    `${(i / (norm.length - 1)) * w},${h - v * h}`
  ).join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="sparkline">
      <polyline points={pts} fill="none" stroke="currentColor" strokeWidth="1" />
    </svg>
  );
};

const EventRow = ({ t, label, kind }) => (
  <li className="event-row">
    <span className="mono small muted">{t}</span>
    <span className={`event-kind event-${kind}`}>
      {kind === "ok" ? "OK" : kind === "warn" ? "WARN" : "INFO"}
    </span>
    <span className="event-label mono small">{label}</span>
  </li>
);

// ============================================================
// Why / Manifesto
// ============================================================

const Why = () => (
  <section className="section section-why" id="why">
    <div className="container">
      <div className="eyebrow mono small">04 — Why we exist</div>
      <h2 className="why-title">
        Creemos que la comunicación <em>nunca</em> debe detenerse.
      </h2>
      <div className="why-grid">
        <div className="why-col">
          <p>
            Detrás de cada llamada hay una empresa operando, una familia
            comunicándose, un hospital atendiendo, una emergencia resolviéndose,
            una venta ocurriendo, un país conectado.
          </p>
          <p>
            Por eso no construimos otra plataforma VoIP. Construimos la
            infraestructura que mantiene <strong>viva</strong> la comunicación
            crítica del mundo.
          </p>
        </div>
        <div className="why-col why-tenets">
          {[
            ["Communication must survive.", "Es la única métrica que importa."],
            ["Built for uptime.", "El uptime no es una promesa de venta. Es ingeniería."],
            ["Resilience by design.", "La redundancia no se compra. Se diseña."],
            ["Because silence costs more.", "Más que cualquier feature que dejes de vender."],
          ].map(([t, s]) => (
            <div className="tenet" key={t}>
              <div className="tenet-title">{t}</div>
              <div className="tenet-sub mono small muted">{s}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  </section>
);

// ============================================================
// Industries
// ============================================================

const Industries = () => {
  const items = [
    { k: "Carriers & ISPs",       d: "Interconexión, transit voice, wholesale termination." },
    { k: "Contact centers",       d: "Outbound y omnicanal con marcación predictiva." },
    { k: "Banca & fintech",       d: "Confirmaciones, MFA por voz, IVRs transaccionales." },
    { k: "Gobierno",              d: "Líneas de emergencia, 911, atención ciudadana." },
    { k: "Health tech",           d: "Telemedicina, líneas críticas hospitalarias." },
    { k: "Retail & logística",    d: "Confirmación de entregas, atención post-venta." },
  ];
  return (
    <section className="section" id="industries">
      <div className="container">
        <div className="section-head">
          <div className="eyebrow mono small">05 — Critical industries</div>
          <h2 className="section-title">
            Donde el silencio<br />
            <span className="muted">no es una opción.</span>
          </h2>
        </div>
        <div className="industries-grid">
          {items.map((it, i) => (
            <div className="industry-row" key={it.k}>
              <span className="mono small muted">0{i + 1}</span>
              <span className="industry-name">{it.k}</span>
              <span className="industry-desc">{it.d}</span>
              <ArrowRight />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

// ============================================================
// Closing CTA
// ============================================================

const Closing = () => (
  <section className="section section-closing" id="contact">
    <div className="container">
      <div className="closing-eyebrow mono small">
        <span className="status-dot" data-on /> Netvoice · Linkotel · voip-panel-01
      </div>
      <h2 className="closing-title">
        Tu red.<br />
        Tu panel.
      </h2>
      <p className="closing-sub">
        Gestiona extensiones, trunks, CDR y métricas en tiempo real desde
        el panel de administración Netvoice — construido sobre infraestructura
        eneural carrier-grade.
      </p>
      <div className="closing-cta">
        <a href="/login" className="btn btn-primary btn-lg">
          Acceder al panel Netvoice
          <ArrowRight />
        </a>
        <a href="#platform" className="btn btn-ghost btn-lg">
          Conocer la plataforma
        </a>
      </div>
    </div>
  </section>
);

// ============================================================
// Footer
// ============================================================

const Footer = () => (
  <footer className="footer">
    <div className="container footer-inner">
      <div className="footer-brand">
        <Logo />
        <p className="mono small muted">
          Infraestructura VoIP carrier-grade · © {new Date().getFullYear()} Linkotel / eneural.
        </p>
      </div>
      <div className="footer-cols">
        <FooterCol title="Plataforma" links={["Softswitch", "SBC", "WebRTC", "Multi-tenant"]} />
        <FooterCol title="Panel Netvoice" links={["Dashboard", "Extensiones", "CDR", "Métricas"]} />
        <FooterCol title="Acceso" links={["Iniciar sesión", "Soporte", "Status", "Contacto"]} hrefs={["/login", "#contact", "#telemetry", "#contact"]} />
      </div>
    </div>
  </footer>
);

const FooterCol = ({ title, links, hrefs = [] }) => (
  <div className="footer-col">
    <div className="mono small muted">{title}</div>
    <ul>
      {links.map((l, i) => (
        <li key={l}>
          <a href={hrefs[i] || "#"}>{l}</a>
        </li>
      ))}
    </ul>
  </div>
);

// ============================================================
// App
// ============================================================

const App = () => (
  <div className="app">
    <Nav />
    <Hero />
    <CostOfSilence />
    <Platform />
    <LiveTelemetry />
    <Why />
    <Industries />
    <Closing />
    <Footer />
  </div>
);

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
