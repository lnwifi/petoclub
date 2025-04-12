import { useEffect, useRef } from 'react';
import { router } from 'expo-router';
import { useAuth } from './auth-context';
import { View, ActivityIndicator } from 'react-native';

type AuthRouteProps = {
  children: React.ReactNode;
  requireAuth?: boolean;
};

/**
 * Componente para proteger rutas basado en el estado de autenticación
 * @param children - Componentes hijos a renderizar
 * @param requireAuth - Si es true, redirige a login si no hay sesión. Si es false, redirige a la app si hay sesión.
 */
export function AuthRoute({ children, requireAuth = true }: AuthRouteProps) {
  const { user, loading } = useAuth();
  const isMounted = useRef(true);

  useEffect(() => {
    // Set isMounted ref to true when component mounts
    isMounted.current = true;
    
    // Only proceed with navigation if not loading and component is still mounted
    if (!loading && isMounted.current) {
      // Si requiere autenticación y no hay usuario, redirigir a login
      if (requireAuth && !user) {
        // Use setTimeout to ensure this happens after the component has fully mounted
        setTimeout(() => {
          if (isMounted.current) {
            router.replace('/(auth)/login');
          }
        }, 0);
      }
      // Si no requiere autenticación y hay usuario, redirigir a la app
      else if (!requireAuth && user) {
        // Use setTimeout to ensure this happens after the component has fully mounted
        setTimeout(() => {
          if (isMounted.current) {
            router.replace('/(app)');
          }
        }, 0);
      }
    }

    // Cleanup function to prevent state updates on unmounted component
    return () => {
      isMounted.current = false;
    };
  }, [user, loading, requireAuth]);

  // Mostrar indicador de carga mientras se verifica la autenticación
  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#ffbc4c" />
      </View>
    );
  }

  // Si requiere autenticación y no hay usuario, o no requiere autenticación y hay usuario, no renderizar nada
  if ((requireAuth && !user) || (!requireAuth && user)) {
    return null;
  }

  // Renderizar los hijos
  return <>{children}</>;
}