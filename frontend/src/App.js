import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import Login from './components/Login';
import PrivateRoute from './components/PrivateRoute';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import Extensions from './components/Extensions';
import CDRPage from './components/CDRPage';
import Settings from './components/Settings';
import Carriers from './components/Carriers';
import Planes from './components/Planes';
import Clientes from './components/Clientes';
import DIDSeries from './components/DIDSeries';
import Metricas from './components/Metricas';

function Layout({ children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: '#f8fafc' }}>
      <Navbar />
      <div style={{ display: 'flex', flex: 1 }}>
        <Sidebar />
        <main style={{ flex: 1, padding: 28, overflowY: 'auto' }}>
          {children}
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/*" element={
            <PrivateRoute>
              <Layout>
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/extensions" element={<Extensions />} />
                  <Route path="/cdr" element={<CDRPage />} />
                    <Route path="/settings" element={<Settings />} />
                    <Route path="/carriers" element={<Carriers />} />
                    <Route path="/planes" element={<Planes />} />
                    <Route path="/clientes" element={<Clientes />} />
                    <Route path="/did-series" element={<DIDSeries />} />
                    <Route path="/metrics" element={<Metricas />} />
                </Routes>
              </Layout>
            </PrivateRoute>
          } />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
