import { useAuth } from '../contexts/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  return (
    <nav className="navbar">
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
          voip-panel-01
        </span>
        <span style={{ color: 'var(--border-mid)', fontSize: 10 }}>·</span>
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>192.168.0.7</span>
      </div>
      <div className="navbar-right">
        <span className="navbar-user">{user?.username}</span>
        {user?.role === 'admin' && (
          <span className="badge-role">admin</span>
        )}
        <button className="btn-logout" onClick={logout}>Salir</button>
      </div>
    </nav>
  );
}
