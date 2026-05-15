import './App.css';
import PortalRegistro from './portal/PortalRegistro';
import PortalVerificar from './portal/PortalVerificar';
import PortalPlan from './portal/PortalPlan';
import PortalContrato from './portal/PortalContrato';
import PortalPago from './portal/PortalPago';
import PortalActivacion from './portal/PortalActivacion';

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
import NetworkMap from './components/NetworkMap';
import AuditLog from './components/AuditLog';
import Softphone from './components/Softphone';
import Usuarios from './components/Usuarios';

function Layout({ children }) {
  return (
    <div className="app-layout">
      <Sidebar />
      <div className="app-main">
        <Navbar />
        <main className="page-content">
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
          <Route path="/registro"          element={<PortalRegistro />} />
          <Route path="/verificar"          element={<PortalVerificar />} />
          <Route path="/portal/plan"        element={<PortalPlan />} />
          <Route path="/portal/contrato"    element={<PortalContrato />} />
          <Route path="/portal/pago"        element={<PortalPago />} />
          <Route path="/portal/activacion"  element={<PortalActivacion />} />
          <Route path="/login" element={<Login />} />
          <Route path="/*" element={
            <PrivateRoute>
              <Layout>
                <Routes>
                  <Route path="/"           element={<NetworkMap />} />
                  <Route path="/dashboard"   element={<Dashboard />} />
                  <Route path="/extensions" element={<Extensions />} />
                  <Route path="/cdr"        element={<CDRPage />} />
                  <Route path="/settings"   element={<Settings />} />
                  <Route path="/carriers"   element={<Carriers />} />
                  <Route path="/planes"     element={<Planes />} />
                  <Route path="/clientes"   element={<Clientes />} />
                  <Route path="/did-series" element={<DIDSeries />} />
                  <Route path="/metrics"    element={<Metricas />} />
                  <Route path="/network"    element={<NetworkMap />} />
                  <Route path="/audit"     element={<AuditLog />} />
                  <Route path="/softphone"  element={<Softphone />} />
                  <Route path="/usuarios"   element={<Usuarios />} />
                </Routes>
              </Layout>
            </PrivateRoute>
          } />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
