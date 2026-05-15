import { useState, useEffect, useCallback } from 'react';
import api from '../api';

const StatusDot = ({ status }) => (
  <span style={{
    display: 'inline-block', width: 8, height: 8, borderRadius: '50%',
    background: status === 'online' ? 'var(--accent)' : 'var(--red)',
    boxShadow: status === 'online' ? '0 0 6px var(--accent)' : '0 0 6px var(--red)',
    marginRight: 6, flexShrink: 0
  }} />
);

const fmtUptime = (s) => {
  if (!s) return '—';
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
};

const NodeCard = ({ node, icon, extra }) => (
  <div style={{
    background: 'var(--bg-panel)', border: `1px solid ${node.status === 'online' ? 'var(--border)' : 'var(--red-dim)'}`,
    borderRadius: 12, padding: '16px 20px', position: 'relative', overflow: 'hidden'
  }}>
    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2,
      background: node.status === 'online' ? 'var(--accent)' : 'var(--red)' }} />
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
      <div style={{ fontSize: 22 }}>{icon}</div>
      <div>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{node.name}</div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{node.ip}:{node.port}</div>
      </div>
      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center' }}>
        <StatusDot status={node.status} />
        <span style={{ fontSize: 11, fontWeight: 500, color: node.status === 'online' ? 'var(--accent)' : 'var(--red)' }}>
          {node.status === 'online' ? 'Online' : 'Offline'}
        </span>
      </div>
    </div>
    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8 }}>{node.role}</div>
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      <span style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 5,
        padding: '2px 8px', fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-sec)' }}>
        v{node.version}
      </span>
      {extra}
    </div>
  </div>
);

const Arrow = () => (
  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 32 }}>
    <div style={{ width: 1, height: 20, background: 'var(--border-mid)' }} />
    <div style={{ position: 'absolute', width: 0, height: 0,
      borderLeft: '5px solid transparent', borderRight: '5px solid transparent',
      borderTop: '6px solid var(--border-mid)', marginTop: 20 }} />
  </div>
);

export default function NetworkMap() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(null);

  const load = useCallback(() => {
    api.get('/network/status').then(res => {
      setData(res.data);
      setLastUpdate(new Date());
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, [load]);

  if (loading) return <div className="loading">Cargando mapa de red...</div>;

  const nodes = data?.nodes || {};
  const sbc = nodes.sbc || {};
  const asterisk = nodes.asterisk || {};
  const asterisk_ha = nodes.asterisk_ha || {};
  const mysql = nodes.mysql || {};
  const nginx = nodes.nginx || {};
  const extCount = data?.extensions_count || 0;
  const extReg = data?.extensions_registered || [];

  const allOnline = [sbc, asterisk, asterisk_ha, mysql, nginx].every(n => n.status === 'online');

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 className="page-title">Network Map</h1>
          <p className="page-subtitle">Estado en tiempo real de la infraestructura Netvoice</p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {lastUpdate && (
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              Actualizado: {lastUpdate.toLocaleTimeString('es-EC')}
            </span>
          )}
          <button onClick={load} className="btn-sm">↻ Actualizar</button>
        </div>
      </div>

      {/* Estado global */}
      <div style={{ background: allOnline ? 'var(--accent-dim)' : 'var(--red-dim)',
        border: `1px solid ${allOnline ? 'var(--accent)' : 'var(--red)'}`,
        borderRadius: 10, padding: '12px 18px', marginBottom: 24,
        display: 'flex', alignItems: 'center', gap: 10 }}>
        <StatusDot status={allOnline ? 'online' : 'offline'} />
        <span style={{ fontSize: 13, fontWeight: 600, color: allOnline ? 'var(--accent)' : 'var(--red)' }}>
          {allOnline ? 'Todos los nodos operativos' : 'Hay nodos con problemas'}
        </span>
        <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
          {extCount} extensión(es) registrada(s): {extReg.join(', ') || '—'}
        </span>
      </div>

      {/* Arquitectura en capas */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 0, maxWidth: 560, margin: '0 auto' }}>

        {/* Internet */}
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)',
          borderRadius: 10, padding: '10px 20px', textAlign: 'center', marginBottom: 0 }}>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1 }}>Internet</div>
          <div style={{ fontSize: 12, color: 'var(--text-sec)', marginTop: 2, fontFamily: 'var(--font-mono)' }}>
            186.101.238.135 · eneural.org:8443
          </div>
        </div>

        <Arrow />

        {/* SBC */}
        <NodeCard node={sbc} icon="🛡️" extra={
          <span style={{ background: 'var(--blue-dim)', border: '1px solid var(--blue-dim)', borderRadius: 5,
            padding: '2px 8px', fontSize: 10, color: 'var(--blue)' }}>
            SIP :5060 UDP/TCP
          </span>
        } />

        <Arrow />

        {/* Asterisk */}
        <NodeCard node={asterisk} icon="☎️" extra={
          <>
            <span style={{ background: 'var(--green-dim)', border: '1px solid var(--green-dim)', borderRadius: 5,
              padding: '2px 8px', fontSize: 10, color: 'var(--green)' }}>
              {asterisk.channels_active || 0} canales activos
            </span>
            <span style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 5,
              padding: '2px 8px', fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-sec)' }}>
              ↑ {fmtUptime(asterisk.uptime_seconds)}
            </span>
            <span style={{ background: 'var(--accent-dim)', border: '1px solid var(--accent-dim)', borderRadius: 5,
              padding: '2px 8px', fontSize: 10, color: 'var(--accent)' }}>
              WS :8088 · WSS :8089
            </span>
          </>
        } />

        <Arrow />

        {/* Asterisk HA */}
        <NodeCard node={asterisk_ha} icon="🔄" extra={
          <>
            <span style={{ background: 'var(--amber-dim)', border: '1px solid var(--amber-dim)', borderRadius: 5,
              padding: '2px 8px', fontSize: 10, color: 'var(--amber)' }}>
              HA Node
            </span>
            <span style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 5,
              padding: '2px 8px', fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-sec)' }}>
              ↑ {fmtUptime(asterisk_ha.uptime_seconds)}
            </span>
          </>
        } />

        <Arrow />

        {/* MySQL */}
        <NodeCard node={mysql} icon="🗄️" extra={
          <span style={{ background: 'var(--amber-dim)', border: '1px solid var(--amber-dim)', borderRadius: 5,
            padding: '2px 8px', fontSize: 10, color: 'var(--amber)' }}>
            {mysql.cdr_today || 0} CDRs hoy
          </span>
        } />

        <Arrow />

        {/* Nginx + Panel */}
        <NodeCard node={nginx} icon="🌐" extra={
          <>
            <span style={{ background: 'var(--blue-dim)', border: '1px solid var(--blue-dim)', borderRadius: 5,
              padding: '2px 8px', fontSize: 10, color: 'var(--blue)' }}>
              HTTPS :8443
            </span>
            <span style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 5,
              padding: '2px 8px', fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-sec)' }}>
              API :8000
            </span>
          </>
        } />

      </div>

      {/* Tabla resumen */}
      <div className="section-card" style={{ marginTop: 28 }}>
        <div className="section-header">
          <div className="section-title">Resumen de nodos</div>
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>Nodo</th>
              <th>IP</th>
              <th>Puerto</th>
              <th>Versión</th>
              <th>Estado</th>
              <th>Info</th>
            </tr>
          </thead>
          <tbody>
            {[
              { ...sbc,      icon: '🛡️', info: 'SBC' },
              { ...asterisk, icon: '☎️', info: `${asterisk.channels_active || 0} canales · uptime ${fmtUptime(asterisk.uptime_seconds)}` },
              { ...asterisk_ha, icon: '🔄', info: `HA Node · uptime ${fmtUptime(asterisk_ha.uptime_seconds)}` },
              { ...mysql,    icon: '🗄️', info: `${mysql.cdr_today || 0} CDRs hoy` },
              { ...nginx,    icon: '🌐', info: 'HTTPS + API' },
            ].map((n, i) => (
              <tr key={i}>
                <td><span style={{ marginRight: 6 }}>{n.icon}</span><strong>{n.name}</strong></td>
                <td className="td-mono">{n.ip}</td>
                <td className="td-mono">{n.port}</td>
                <td className="td-mono">v{n.version}</td>
                <td>
                  <span className={`status-pill ${n.status === 'online' ? 'pill-green' : 'pill-red'}`}>
                    <span className="dot-sm" /> {n.status === 'online' ? 'Online' : 'Offline'}
                  </span>
                </td>
                <td className="td-muted" style={{ fontSize: 11 }}>{n.info}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
