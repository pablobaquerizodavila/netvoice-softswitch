import React, { useState } from 'react';
import Dashboard from './components/Dashboard';
import CDRPage from './components/CDRPage';
import Extensions from './components/Extensions';
import './App.css';

function App() {
  const [activePage, setActivePage] = useState('dashboard');

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="brand">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="brand-icon" aria-hidden="true">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.64 3.42 2 2 0 0 1 3.6 1.24h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 8.96a16 16 0 0 0 6 6l.96-.96a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 21.5 16z"/>
            </svg>
            Netvoice Panel
          </div>
          <div className="brand-sub">Linkotel · voip-panel-01</div>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-section-label">Principal</div>
          <button className={`nav-item ${activePage === 'dashboard' ? 'active' : ''}`} onClick={() => setActivePage('dashboard')}>
            <NavIcon type="dashboard" /> Dashboard
          </button>
          <button className={`nav-item ${activePage === 'cdr' ? 'active' : ''}`} onClick={() => setActivePage('cdr')}>
            <NavIcon type="phone" /> CDR — Llamadas
          </button>
          <button className={`nav-item ${activePage === 'extensions' ? 'active' : ''}`} onClick={() => setActivePage('extensions')}>
            <NavIcon type="users" /> Extensiones
          </button>
          <button className={`nav-item ${activePage === 'metrics' ? 'active' : ''}`} onClick={() => setActivePage('metrics')}>
            <NavIcon type="chart" /> Métricas
          </button>

          <div className="nav-section-label" style={{ marginTop: '16px' }}>Configuración</div>
          <button className={`nav-item ${activePage === 'carriers' ? 'active' : ''}`} onClick={() => setActivePage('carriers')}>
            <NavIcon type="server" /> Carriers
          </button>
          <button className={`nav-item ${activePage === 'settings' ? 'active' : ''}`} onClick={() => setActivePage('settings')}>
            <NavIcon type="settings" /> Ajustes
          </button>
        </nav>

        <div className="sidebar-bottom">
          <div className="user-row">
            <div className="user-avatar">PB</div>
            <div className="user-info">
              <div className="user-name">pbaquerizo</div>
              <div className="user-role">Administrador</div>
            </div>
          </div>
        </div>
      </aside>

      <div className="main-area">
        <header className="topbar">
          <div className="topbar-title">
            {activePage === 'dashboard' && 'Dashboard'}
            {activePage === 'cdr' && 'CDR — Registro de Llamadas'}
            {activePage === 'extensions' && 'Extensiones'}
            {activePage === 'metrics' && 'Métricas'}
            {activePage === 'carriers' && 'Carriers'}
            {activePage === 'settings' && 'Ajustes'}
          </div>
          <div className="topbar-right">
            <span className="badge badge-green">
              <span className="dot-green" /> Asterisk activo
            </span>
            <span className="badge badge-blue">192.168.0.161</span>
            <button className="btn-sm" onClick={() => window.location.reload()}>
              <RefreshIcon /> Actualizar
            </button>
          </div>
        </header>

        <main className="page-content">
          {activePage === 'dashboard' && <Dashboard onNavigate={setActivePage} />}
          {activePage === 'cdr' && <CDRPage />}
          {activePage === 'extensions' && <Extensions />}
          {(activePage === 'metrics' || activePage === 'carriers' || activePage === 'settings') && (
            <div className="coming-soon">
              <div className="coming-soon-icon">🚧</div>
              <div className="coming-soon-title">Próximamente</div>
              <div className="coming-soon-sub">Esta sección está en desarrollo.</div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

function NavIcon({ type }) {
  const icons = {
    dashboard: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>,
    phone: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.64 3.42 2 2 0 0 1 3.6 1.24h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 8.96a16 16 0 0 0 6 6l.96-.96a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 21.5 16z"/></svg>,
    users: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
    chart: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/></svg>,
    server: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="2" y="2" width="20" height="8" rx="2" ry="2"/><rect x="2" y="14" width="20" height="8" rx="2" ry="2"/><line x1="6" y1="6" x2="6.01" y2="6"/><line x1="6" y1="18" x2="6.01" y2="18"/></svg>,
    settings: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,
  };
  return icons[type] || null;
}

function RefreshIcon() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>;
}

export default App;
