import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

const Ico = ({ d }) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d={d}/>
  </svg>
);

const ICONS = {
  grid:     "M3 3h7v7H3zm11 0h7v7h-7zM3 14h7v7H3zm11 0h7v7h-7z",
  phone:    "M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.8 19.79 19.79 0 01.22 1.22 2 2 0 012.22 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.91 7.09a16 16 0 006 6l.66-.66a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 14.92v2z",
  bar:      "M18 20V10M12 20V4M6 20v-6",
  network:  "M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18",
  share:    "M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13",
  users:    "M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zm14 10v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75",
  user_add: "M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M8.5 11a4 4 0 100-8 4 4 0 000 8zM20 8v6M23 11h-6",
  credit:   "M1 4h22v16H1zM1 10h22",
  hash:     "M4 9h16M4 15h16M10 3l-2 18M16 3l-2 18",
  check:    "M22 11.08V12a10 10 0 11-5.93-9.14M22 4L12 14.01l-3-3",
  shield:   "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z",
  gear:     "M12 15a3 3 0 100-6 3 3 0 000 6zm6.93-3a8 8 0 01-.07 1.08l2.3 1.8a.5.5 0 01.12.65l-2.18 3.78a.5.5 0 01-.61.22l-2.72-1.09a8 8 0 01-1.87 1.09l-.41 2.9a.49.49 0 01-.49.42H7.82a.49.49 0 01-.49-.43l-.41-2.9A8 8 0 014.93 18l-2.72 1.09a.5.5 0 01-.61-.22L-.38 15.09a.5.5 0 01.12-.65l2.3-1.8A8.4 8.4 0 012 12c0-.37.02-.73.07-1.08l-2.3-1.8a.5.5 0 01-.12-.65l2.18-3.78a.5.5 0 01.61-.22l2.72 1.09A8 8 0 016.93 4.5l.41-2.9A.49.49 0 017.83 1h4.36c.26 0 .47.19.49.43l.41 2.9a8 8 0 011.87 1.09l2.72-1.09a.5.5 0 01.61.22l2.18 3.78a.5.5 0 01-.12.65l-2.3 1.8c.05.35.07.71.07 1.08z",
  alert:    "M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4M12 17h.01",
  api:      "M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5",
  reseller: "M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z M9 22V12h6v10",
  mobile:   "M5 2h14a2 2 0 012 2v16a2 2 0 01-2 2H5a2 2 0 01-2-2V4a2 2 0 012-2zM12 18h.01",
  mic:      "M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3zM19 10v2a7 7 0 01-14 0v-2M12 19v4M8 23h8",
  search:   "M11 19a8 8 0 100-16 8 8 0 000 16zM21 21l-4.35-4.35",
  live:     "M5 3l14 9-14 9V3z",
  bill:     "M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8zM14 2v6h6M16 13H8M16 17H8M10 9H8",
};

const I = ({ n }) => <Ico d={ICONS[n]||ICONS.grid}/>;

const menuItems = [
  {
    section: "PRINCIPAL",
    items: [
      { label:"Dashboard",       path:"/dashboard",   icon:"grid"     },
      { label:"Softphone",       path:"/softphone",   icon:"mic"      },
      { label:"CDR Llamadas",    path:"/cdr",         icon:"phone",   badge:"Live" },
      { label:"CDR Tiempo Real", path:"/cdr-live",    icon:"live",    badge:"WS"   },
      { label:"Extensiones",     path:"/extensions",  icon:"phone"    },
      { label:"Métricas",     path:"/metricas",    icon:"bar"      },
    ],
  },
  {
    section: "NOC / SEGURIDAD",
    items: [
      { label:"Network Map",     path:"/network",     icon:"network"  },
      { label:"Antifraude",      path:"/antifraude",  icon:"shield"   },
    ],
  },
  {
    section: "CLIENTES",
    items: [
      { label:"Buscar Cliente",  path:"/clientes",    icon:"search"   },
      { label:"Nuevo Cliente",   path:"/clientes-v2", icon:"user_add" },
    ],
  },
  {
    section: "COMERCIAL",
    items: [
      { label:"Carriers / Trunks", path:"/carriers",    icon:"share"  },
      { label:"Planes de cobro",   path:"/planes",      icon:"credit" },
      { label:"Series DID",        path:"/dids",        icon:"hash"   },
      { label:"Billing",           path:"/billing",     icon:"bill"   },
    ],
  },
  {
    section: "INTEGRACIONES",
    items: [
      { label:"API Center",      path:"/api",          icon:"api"      },
      { label:"Revendedores",    path:"/revendedores", icon:"reseller" },
      { label:"App Móvil",    path:"/app",          icon:"mobile"   },
    ],
  },
  {
    section: "ADMINISTRACIÓN",
    items: [
      { label:"Usuarios",        path:"/usuarios",    icon:"users"    },
      { label:"Auditoría",    path:"/auditoria",   icon:"check",   superadmin:true },
    ],
  },
  {
    section: "CONFIGURACIÓN",
    items: [
      { label:"Ajustes",         path:"/settings",    icon:"gear"     },
    ],
  },
];

export default function Sidebar() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const { user }  = useAuth();
  const initials  = user?.username ? user.username.slice(0,2).toUpperCase() : "AD";

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="brand">
          <span className="brand-dot"/>
          Netvoice Panel
        </div>
        <div className="brand-sub">Linkotel · voip-panel-01</div>
      </div>
      <nav className="sidebar-nav">
        {menuItems.map(({ section, items }) => (
          <div key={section} className="nav-section">
            <span className="nav-section-label">{section}</span>
            {items
              .filter(i => !i.superadmin || user?.role === "superadmin" || user?.role === "admin")
              .map(({ label, path, icon, badge }) => {
                const active = location.pathname === path ||
                  (path !== "/dashboard" && location.pathname.startsWith(path) && path.length > 1);
                return (
                  <button key={path} className={"nav-item"+(active?" active":"")} onClick={()=>navigate(path)}>
                    <I n={icon}/>
                    {label}
                    {badge && <span className="nav-badge">{badge}</span>}
                  </button>
                );
              })
            }
          </div>
        ))}
      </nav>
      <div className="sidebar-bottom">
        <div className="user-row">
          <div className="user-avatar">{initials}</div>
          <div>
            <div className="user-name">{user?.username||"admin"}</div>
            <div className="user-role">{user?.role||"Administrador"}</div>
          </div>
        </div>
      </div>
    </aside>
  );
}
