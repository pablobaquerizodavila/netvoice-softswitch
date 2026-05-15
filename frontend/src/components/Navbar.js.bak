import { useAuth } from '../contexts/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();

  return (
    <nav style={styles.nav}>
      <span style={styles.brand}>Netvoice Panel</span>
      <div style={styles.right}>
        <span style={styles.username}>{user?.username}</span>
        {user?.role === 'admin' && <span style={styles.badge}>admin</span>}
        <button style={styles.logoutBtn} onClick={logout}>Salir</button>
      </div>
    </nav>
  );
}

const styles = {
  nav: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 24px',
    height: 56,
    background: '#1e293b',
    borderBottom: '1px solid #334155',
  },
  brand: {
    color: '#38bdf8',
    fontWeight: 700,
    fontSize: 18,
    letterSpacing: 0.5,
  },
  right: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  username: {
    color: '#cbd5e1',
    fontSize: 14,
  },
  badge: {
    background: '#0ea5e9',
    color: '#fff',
    fontSize: 11,
    fontWeight: 700,
    padding: '2px 8px',
    borderRadius: 999,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  logoutBtn: {
    background: 'transparent',
    border: '1px solid #475569',
    color: '#94a3b8',
    borderRadius: 6,
    padding: '5px 14px',
    fontSize: 13,
    cursor: 'pointer',
  },
};
