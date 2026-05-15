import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const PhoneCall = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.8 19.79 19.79 0 01.22 1.22 2 2 0 012.22 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.91 7.09a16 16 0 006 6l.66-.66a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 14.92v2z"/>
  </svg>
);
const Grid = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
  </svg>
);
const PhoneIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12.01" y2="18"/>
  </svg>
);
const BarChart = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>
  </svg>
);
const Share2 = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
  </svg>
);
const Users = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/>
  </svg>
);
const CreditCard = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/>
  </svg>
);
const Hash = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <line x1="4" y1="9" x2="20" y2="9"/><line x1="4" y1="15" x2="20" y2="15"/>
    <line x1="10" y1="3" x2="8" y2="21"/><line x1="16" y1="3" x2="14" y2="21"/>
  </svg>
);
const UserCheck = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="8.5" cy="7" r="4"/>
    <polyline points="17 11 19 13 23 9"/>
  </svg>
);
const SettingsIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3"/>
    <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
  </svg>
);
const MoreH = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/>
  </svg>
);

const menuItems = [
  {
    section: 'PRINCIPAL',
    items: [
      { label: 'Dashboard',      path: '/dashboard',  icon: <Grid /> },
      { label: 'Softphone',       path: '/softphone',  icon: <PhoneIcon /> },
      { label: 'CDR — Llamadas', path: '/cdr',        icon: <PhoneCall />, badge: 'Live' },
      { label: 'Extensiones',    path: '/extensions', icon: <PhoneIcon /> },
      { label: 'Métricas',       path: '/metrics',    icon: <BarChart /> },
      { label: 'Network Map',     path: '/network',    icon: <BarChart /> },
    ],
  },
  {
    section: 'COMERCIAL',
    items: [
      { label: 'Carriers / Trunks', path: '/carriers',   icon: <Share2 /> },
      { label: 'Clientes',          path: '/clientes',   icon: <Users /> },
      { label: 'Planes de cobro',   path: '/planes',     icon: <CreditCard /> },
      { label: 'Series DID',        path: '/did-series', icon: <Hash /> },
    ],
  },
  {
    section: 'ADMINISTRACIÓN',
    items: [
      { label: 'Usuarios',   path: '/usuarios', icon: <UserCheck /> },
      { label: 'Auditoría',  path: '/audit',    icon: <UserCheck />, superadmin: true },
    ],
  },
  {
    section: 'CONFIGURACIÓN',
    items: [
      { label: 'Ajustes', path: '/settings', icon: <SettingsIcon /> },
    ],
  },
];

export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  console.log('SIDEBAR USER:', user);
  const initials = user?.username ? user.username.slice(0, 2).toUpperCase() : 'AD';

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="brand">
          <span className="brand-dot" />
          Netvoice Panel
        </div>
        <div className="brand-sub">Linkotel · voip-panel-01</div>
      </div>
      <nav className="sidebar-nav">
        {menuItems.map(({ section, items }) => (
          <div key={section} className="nav-section">
            <span className="nav-section-label">{section}</span>
            {items.filter(item => !item.superadmin || user?.role === 'superadmin').map(({ label, path, icon, badge }) => {
              const active = location.pathname === path;
              return (
                <button
                  key={path}
                  className={`nav-item${active ? ' active' : ''}`}
                  onClick={() => navigate(path)}
                >
                  {icon}
                  {label}
                  {badge && <span className="nav-badge">{badge}</span>}
                </button>
              );
            })}
          </div>
        ))}
      </nav>
      <div className="sidebar-bottom">
        <div className="user-row">
          <div className="user-avatar">{initials}</div>
          <div>
            <div className="user-name">{user?.username || 'admin'}</div>
            <div className="user-role">{user?.role || 'Administrador'}</div>
          </div>
          <span style={{ marginLeft: 'auto', color: 'var(--text-muted)' }}>
            <MoreH />
          </span>
        </div>
      </div>
    </aside>
  );
}
