
import { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const NAV = [
  { section: 'Principal', items: [
    { to: '/',           icon: '▦', label: 'Dashboard'        },
    { to: '/softphone',  icon: '☎', label: 'Softphone'        },
    { to: '/cdr',        icon: '▤', label: 'CDR — Llamadas'   },
    { to: '/extensions', icon: '◎', label: 'Extensiones'      },
    { to: '/metricas',   icon: '◈', label: 'Métricas'         },
    { to: '/network',    icon: '◉', label: 'Network Map'      },
  ]},
  { section: 'Comercial', items: [
    { to: '/carriers',   icon: '⊞', label: 'Carriers / Trunks'},
    { to: '/clientes',   icon: '◻', label: 'Clientes'         },
    { to: '/clientes-v2',icon: '◻', label: 'Clientes V2'      },
    { to: '/planes',     icon: '▣', label: 'Planes de cobro'  },
    { to: '/dids',       icon: '◉', label: 'Series DID'       },
  ]},
  { section: 'Administración', items: [
    { to: '/usuarios',   icon: '◈', label: 'Usuarios'         },
    { to: '/auditoria',  icon: '◎', label: 'Auditoría'        },
    { to: '/settings',   icon: '◧', label: 'Ajustes'          },
  ]},
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const initials = (user?.username || 'NV').slice(0,2).toUpperCase();
  const roleMap  = { admin: 'Administrador', agent: 'Agente SAC', partner: 'Partner API' };
  const role     = roleMap[user?.role] || user?.role || 'Operador';

  return (
    <aside className="nv-sidebar">
      <div className="nv-sidebar-logo">
        <div className="logo-mark">NV</div>
        <div>
          <span className="logo-name">Netvoice</span>
          <span className="logo-sub">Carrier Platform</span>
        </div>
      </div>

      <div className="nv-sidebar-body">
        {NAV.map(({ section, items }) => (
          <div key={section}>
            <div className="nv-nav-section-label">{section}</div>
            {items.map(({ to, icon, label, soon }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                className={({ isActive }) => `nv-nav-item${isActive ? ' active' : ''}`}
              >
                <i className="nav-icon">{icon}</i>
                <span style={{ flex: 1 }}>{label}</span>
                {soon && <span className="nav-soon">SOON</span>}
              </NavLink>
            ))}
          </div>
        ))}
      </div>

      <div className="nv-sidebar-footer">
        <div className="nv-clock">
          {time.toLocaleTimeString('es-EC', { hour12: false })} · ECT
        </div>
        <div className="nv-user">
          <div className="nv-user-avatar">{initials}</div>
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <div className="nv-user-name">{user?.username || 'admin'}</div>
            <div className="nv-user-role">{role}</div>
          </div>
          <button
            onClick={() => { logout(); navigate('/login'); }}
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 14, padding: '2px 4px', borderRadius: 4 }}
            title="Cerrar sesión"
          >⏻</button>
        </div>
      </div>
    </aside>
  );
}
