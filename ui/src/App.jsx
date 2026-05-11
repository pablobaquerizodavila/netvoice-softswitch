import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import Login from './components/Login';
import PrivateRoute from './components/PrivateRoute';
import Navbar from './components/Navbar';
// Importar las vistas existentes del proyecto
// import Dashboard from './components/Dashboard';
// import Extensions from './components/Extensions';

function Layout({ children }) {
  return (
    <>
      <Navbar />
      <main style={{ padding: 24 }}>{children}</main>
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/*"
            element={
              <PrivateRoute>
                <Layout>
                  {/* Aquí van las rutas protegidas existentes */}
                  {/* <Routes>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/extensions" element={<Extensions />} />
                  </Routes> */}
                  <p style={{ color: '#94a3b8' }}>Panel cargado correctamente.</p>
                </Layout>
              </PrivateRoute>
            }
          />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
