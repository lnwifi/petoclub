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
import Locales from './pages/Locales'; // Agrego la importación del componente Locales

// Componente para rutas protegidas
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, isAdmin, restoring, restoreFailed, retryRestore } = useAuth();

  useEffect(() => {
    console.log('Estado ProtectedRoute:', { user, isAdmin, restoring, restoreFailed });
  }, [user, isAdmin, restoring, restoreFailed]);

  if (restoring) {
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
          <div>Restaurando sesión...</div>
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

  if (restoreFailed) {
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
          gap: '1rem',
          color: '#c00'
        }}>
          <div>No se pudo restaurar la sesión.</div>
          <button onClick={retryRestore} style={{
            padding: '0.5rem 1.5rem',
            background: '#3498db',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '1rem'
          }}>
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  if (!user || !isAdmin) {
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
      { path: 'locales', element: <Locales /> }, // Agrego la ruta '/locales'
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