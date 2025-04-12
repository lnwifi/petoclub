import React, { Suspense, useEffect, useState } from 'react';
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import Usuarios from './pages/Usuarios';
import Mascotas from './pages/Mascotas';
import Refugios from './pages/Refugios';
import Memberships from './pages/Memberships';
import Cupones from './pages/Cupones';
import Banners from './pages/Banners';
import Eventos from './pages/Eventos';
import Estadisticas from './pages/Estadisticas';
import Configuracion from './pages/Configuracion';
import NotFound from './pages/NotFound';

// Componente para rutas protegidas
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading, error, isAdmin } = useAuth();
  const [redirected, setRedirected] = useState(false);
  
  useEffect(() => {
    console.log('Estado ProtectedRoute:', { user, loading, error, isAdmin });
  }, [user, loading, error, isAdmin]);

  // Si hay un error, redirigir al login
  if (error && !redirected) {
    console.error('Error:', error);
    setRedirected(true);
    return <Navigate to="/login" replace />;
  }

  // Si está cargando, mostrar spinner
  if (loading) {
    console.log('Estado: Cargando...');
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh'
      }}>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '1rem'
        }}>
          <div>Cargando...</div>
          <div className="loader"></div>
          <style>
            {`
              .loader {
                border: 5px solid #f3f3f3;
                border-top: 5px solid #3498db;
                border-radius: 50%;
                width: 50px;
                height: 50px;
                animation: spin 1s linear infinite;
              }
              @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
              }
            `}
          </style>
        </div>
      </div>
    );
  }

  // Si no hay sesión o no es admin, redirigir al login
  if ((!user || !isAdmin) && !redirected) {
    console.log('No hay sesión o no es admin, redirigiendo a login');
    setRedirected(true);
    return <Navigate to="/login" replace />;
  }

  return children;
};

const router = createBrowserRouter([
  {
    path: '/login',
    element: <Login />,
  },
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <Layout />
      </ProtectedRoute>
    ),
    children: [
      { path: '', element: <Dashboard /> },
      { path: 'usuarios', element: <Usuarios /> },
      { path: 'mascotas', element: <Mascotas /> },
      { path: 'refugios', element: <Refugios /> },
      { path: 'memberships', element: <Memberships /> },
      { path: 'cupones', element: <Cupones /> },
      { path: 'banners', element: <Banners /> },
      { path: 'eventos', element: <Eventos /> },
      { path: 'estadisticas', element: <Estadisticas /> },
      { path: 'configuracion', element: <Configuracion /> },
      { path: '*', element: <NotFound /> },
    ],
  },
]);

function App() {
  return (
    <Suspense fallback={
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh'
      }}>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '1rem'
        }}>
          <div>Cargando aplicación...</div>
          <div className="loader"></div>
          <style>
            {`
              .loader {
                border: 5px solid #f3f3f3;
                border-top: 5px solid #3498db;
                border-radius: 50%;
                width: 50px;
                height: 50px;
                animation: spin 1s linear infinite;
              }
              @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
              }
            `}
          </style>
        </div>
      </div>
    }>
      <RouterProvider router={router} />
    </Suspense>
  );
}

export default App;