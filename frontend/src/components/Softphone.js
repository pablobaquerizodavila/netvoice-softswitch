import { useState, useEffect, useRef } from 'react';

import JsSIP from 'jssip';
// Agregar en public/index.html:
// <script src="https://cdnjs.cloudflare.com/ajax/libs/jssip/3.10.0/jssip.min.js"></script>

const WS_SERVER = 'wss://' + window.location.hostname + ':8089/ws';
const SIP_DOMAIN = '192.168.0.161';

const statusColors = {
  disconnected: "var(--text-muted)",
  connecting:   "var(--warning)",
  registered:   "var(--success)",
  calling:       "var(--brand)",
  incoming:     "var(--warning)",
  active:        "var(--success)",
  error:         "var(--danger)",
};

const statusLabels = {
  disconnected: 'Desconectado',
  connecting:   'Conectando...',
  registered:   'En línea',
  calling:      'Llamando...',
  incoming:     'Llamada entrante',
  active:       'En llamada',
  error:        'Error de conexión',
};


function EyeIcon({ show }) {
  return show ? (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/>
      <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  ) : (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  );
}

export default function Softphone() {
  const [ext, setExt]           = useState('');
  const [pwd, setPwd]           = useState('');
  const [status, setStatus]     = useState('disconnected');
  const [dialpad, setDialpad]   = useState('');
  const [callInfo, setCallInfo] = useState('');
  const [muted, setMuted]       = useState(false);
  const [showSipPwd, setShowSipPwd] = useState(false);
  const [registered, setRegistered] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [showLogin, setShowLogin] = useState(true);

  const uaRef        = useRef(null);
  const sessionRef   = useRef(null);
  const audioRef     = useRef(null);
  const timerRef     = useRef(null);

  useEffect(() => {
    return () => {
      if (uaRef.current) uaRef.current.stop();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const connect = () => {
    console.log('Conectando...', { ext, pwd: '***', WS_SERVER });
    if (!ext || !pwd) return;
    if (!JsSIP) {
      setStatus('error');
      return;
    }
    setStatus('connecting');

    const socket = new JsSIP.WebSocketInterface(WS_SERVER);
    const ua = new JsSIP.UA({
      sockets:            [socket],
      uri:                `sip:${ext}@${SIP_DOMAIN}`,
      password:           pwd,
      register:           true,
      register_expires:   300,
      contact_uri:        `sip:${ext}@${window.location.hostname};transport=ws`,
      user_agent:         'Netvoice Softphone',
    });

    ua.on('connected',    (e) => console.log('WS conectado', e));
    ua.on('disconnected', (e) => console.log('WS desconectado', e));
    ua.on('registered',   () => { setStatus('registered'); setRegistered(true); setShowLogin(false); });
    ua.on('unregistered', () => { setStatus('disconnected'); setRegistered(false); });
    ua.on('registrationFailed', (e) => { setStatus('error'); setCallInfo(e.cause || 'Error de registro'); });

    ua.on('newRTCSession', (e) => {
      console.log('Nueva sesion RTC:', e.session.direction, e.session);
      const session = e.session;
      sessionRef.current = session;

      if (session.direction === 'incoming') {
        setStatus('incoming');
        setCallInfo(`Llamada de: ${session.remote_identity.uri.user}`);
      }

      session.on('confirmed', () => {
        setStatus('active');
        startTimer();
        const remote = new MediaStream();
        session.connection.getReceivers().forEach(r => {
          if (r.track) remote.addTrack(r.track);
        });
        if (audioRef.current) {
          audioRef.current.srcObject = remote;
          audioRef.current.play();
        }
      });

      session.on('ended',  () => { endCall(); });
      session.on('failed', (ev) => { setCallInfo(ev.cause || 'Llamada fallida'); endCall(); });
    });

    ua.start();
    uaRef.current = ua;
  };

  const disconnect = () => {
    if (uaRef.current) { uaRef.current.stop(); uaRef.current = null; }
    setStatus('disconnected');
    setRegistered(false);
    setShowLogin(true);
    endCall();
  };

  const call = () => {
    console.log('Llamando a:', dialpad, 'UA:', uaRef.current);
    if (!dialpad || !uaRef.current || !registered) return;
    setStatus('calling');
    setCallInfo(`Llamando a: ${dialpad}`);

    const session = uaRef.current.call(`sip:${dialpad}@${SIP_DOMAIN}`, {
      mediaConstraints: { audio: true, video: false },
      pcConfig: {
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
      },
    });
    sessionRef.current = session;
  };

  const answer = () => {
    console.log('Contestando...', sessionRef.current);
    if (!sessionRef.current) return;
    sessionRef.current.answer({
      mediaConstraints: { audio: true, video: false },
      pcConfig: {
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
      },
    });
  };

  const hangup = () => {
    if (sessionRef.current) {
      try { sessionRef.current.terminate(); } catch (e) {}
      sessionRef.current = null;
    }
    endCall();
  };

  const endCall = () => {
    setStatus(registered ? 'registered' : 'disconnected');
    setCallInfo('');
    setMuted(false);
    setCallDuration(0);
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  };

  const toggleMute = () => {
    if (!sessionRef.current) return;
    if (muted) sessionRef.current.unmute({ audio: true });
    else       sessionRef.current.mute({ audio: true });
    setMuted(!muted);
  };

  const startTimer = () => {
    setCallDuration(0);
    timerRef.current = setInterval(() => setCallDuration(d => d + 1), 1000);
  };

  const fmtDuration = (s) => `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;

  const pressKey = (k) => {
    setDialpad(d => d + k);
    if (sessionRef.current && status === 'active') {
      try { sessionRef.current.sendDTMF(k); } catch (e) {}
    }
  };

  const keys = [
    ['1','2','3'],
    ['4','5','6'],
    ['7','8','9'],
    ['*','0','#'],
  ];

  const isInCall  = status === 'active' || status === 'calling';
  const isRinging = status === 'incoming';

  return (
    <div style={{ maxWidth: 340, margin: '0 auto' }}>
      <audio ref={audioRef} autoPlay />

      {/* Header */}
      <div style={{ background: 'var(--bg-panel)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>

        {/* Status bar */}
        <div style={{ padding: '14px 18px', background: 'var(--bg-surface)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: statusColors[status], display: 'inline-block', boxShadow: status === 'registered' || status === 'active' ? `0 0 6px ${statusColors[status]}` : 'none' }} />
            <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{statusLabels[status]}</span>
          </div>
          {registered && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: 'var(--font-mono)' }}>Ext. {ext}</span>
              <button onClick={disconnect} style={{ background: 'var(--red-dim)', border: 'none', color: "var(--danger)", fontSize: 10, padding: '3px 8px', borderRadius: 5, cursor: 'pointer', fontFamily: 'var(--font)' }}>
                Desconectar
              </button>
            </div>
          )}
        </div>

        {/* Login form */}
        {showLogin && (
          <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>Ingresa tus credenciales SIP</div>
            <div>
              <label style={{ fontSize: 10, color: "var(--text-muted)", textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 4 }}>Extensión</label>
              <input
                style={{ width: '100%', padding: '8px 12px', background: 'var(--bg-surface)', border: '1px solid var(--border-mid)', borderRadius: 7, fontSize: 14, color: 'var(--text)', fontFamily: 'var(--font-mono)', outline: 'none', boxSizing: 'border-box' }}
                placeholder="1001" value={ext} onChange={e => setExt(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && connect()}
              />
            </div>
            <div>
              <label style={{ fontSize: 10, color: "var(--text-muted)", textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 4 }}>Password SIP</label>
              <div style={{ position:"relative",display:"flex",alignItems:"center" }}>
<input
                style={{ width: '100%', padding: '8px 12px', background: 'var(--bg-surface)', border: '1px solid var(--border-mid)', borderRadius: 7, fontSize: 14, color: 'var(--text)', fontFamily: 'var(--font-mono)', outline: 'none', boxSizing: 'border-box' }}
                type={showSipPwd?"text":"password"} placeholder="••••••••" value={pwd} onChange={e => setPwd(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && connect()}
              />
              <button type="button" style={{ position:"absolute",right:10,background:"none",border:"none",cursor:"pointer",color:"var(--text-muted)",display:"flex",alignItems:"center",padding:0 }} onClick={()=>setShowSipPwd(v=>!v)}><EyeIcon show={showSipPwd}/></button>
              </div>
            </div>
            {status === 'error' && (
              <div style={{ fontSize: 11, color: "var(--danger)", background: 'var(--red-dim)', padding: '6px 10px', borderRadius: 6 }}>{callInfo || 'Error de conexión'}</div>
            )}
            <button onClick={connect} disabled={status === 'connecting'}
              style={{ padding: '9px', background: "var(--success)", border: 'none', borderRadius: 7, color: '#0D1117', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)', opacity: status === 'connecting' ? 0.7 : 1 }}>
              {status === 'connecting' ? 'Conectando...' : 'Conectar'}
            </button>
          </div>
        )}

        {/* Softphone UI */}
        {!showLogin && (
          <div style={{ padding: '16px 18px' }}>

            {/* Call info / duration */}
            <div style={{ minHeight: 52, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
              {isInCall && (
                <>
                  <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 2 }}>{callInfo}</div>
                  {status === 'active' && (
                    <div style={{ fontSize: 22, fontWeight: 600, fontFamily: 'var(--font-mono)', color: "var(--success)" }}>{fmtDuration(callDuration)}</div>
                  )}
                </>
              )}
              {isRinging && (
                <div style={{ fontSize: 13, color: "var(--warning)", fontWeight: 500 }}>{callInfo}</div>
              )}
              {!isInCall && !isRinging && (
                <div style={{ width: '100%', display: 'flex', alignItems: 'center', background: 'var(--bg-surface)', border: '1px solid var(--border-mid)', borderRadius: 8, padding: '8px 12px', gap: 8 }}>
                  <span style={{ fontSize: 18, fontFamily: 'var(--font-mono)', color: 'var(--text)', flex: 1, letterSpacing: 2 }}>{dialpad || <span style={{ color: "var(--text-muted)", fontSize: 13 }}>Marcar número...</span>}</span>
                  {dialpad && (
                    <button onClick={() => setDialpad(d => d.slice(0, -1))}
                      style={{ background: 'none', border: 'none', color: "var(--text-muted)", cursor: 'pointer', fontSize: 16, padding: 4 }}>⌫</button>
                  )}
                </div>
              )}
            </div>

            {/* Dialpad */}
            {!isInCall && !isRinging && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 14 }}>
                {keys.flat().map(k => (
                  <button key={k} onClick={() => pressKey(k)}
                    style={{ padding: '12px 0', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', fontSize: 18, fontWeight: 500, fontFamily: 'var(--font-mono)', cursor: 'pointer', transition: 'background 0.1s' }}
                    onMouseEnter={e => e.target.style.background = 'var(--bg-hover)'}
                    onMouseLeave={e => e.target.style.background = 'var(--bg-surface)'}
                  >{k}</button>
                ))}
              </div>
            )}

            {/* Action buttons */}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              {/* Llamada entrante */}
              {isRinging && (
                <>
                  <button onClick={answer}
                    style={{ flex: 1, padding: '12px 0', background: 'var(--green-dim)', border: '1px solid var(--green)', borderRadius: 10, color: "var(--success)", fontSize: 22, cursor: 'pointer' }}>
                    📞
                  </button>
                  <button onClick={hangup}
                    style={{ flex: 1, padding: '12px 0', background: 'var(--red-dim)', border: '1px solid var(--red)', borderRadius: 10, color: "var(--danger)", fontSize: 22, cursor: 'pointer' }}>
                    📵
                  </button>
                </>
              )}

              {/* En llamada */}
              {isInCall && (
                <>
                  <button onClick={toggleMute}
                    style={{ flex: 1, padding: '12px 0', background: muted ? 'var(--red-dim)' : 'var(--bg-surface)', border: `1px solid ${muted ? "var(--danger)" : 'var(--border)'}`, borderRadius: 10, color: muted ? "var(--danger)" : 'var(--text-sec)', fontSize: 18, cursor: 'pointer' }}>
                    {muted ? '🔇' : '🎤'}
                  </button>
                  <button onClick={hangup}
                    style={{ flex: 2, padding: '12px 0', background: 'var(--red-dim)', border: '1px solid var(--red)', borderRadius: 10, color: "var(--danger)", fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)' }}>
                    Colgar
                  </button>
                </>
              )}

              {/* Marcar */}
              {!isInCall && !isRinging && (
                <button onClick={call} disabled={!dialpad}
                  style={{ flex: 1, padding: '13px 0', background: dialpad ? "var(--success)" : 'var(--bg-surface)', border: `1px solid ${dialpad ? "var(--success)" : 'var(--border)'}`, borderRadius: 10, color: dialpad ? '#0D1117' : "var(--text-muted)", fontSize: 22, cursor: dialpad ? 'pointer' : 'default', transition: 'all 0.15s' }}>
                  📞
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
// debug
