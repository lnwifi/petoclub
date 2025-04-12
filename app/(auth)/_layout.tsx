import { Slot } from 'expo-router';
import { AuthRoute } from '@/lib/auth-route';
import { useRef, useEffect } from 'react';

export default function AuthLayout() {
  // Use a ref to track if the component is mounted
  const isMounted = useRef(true);
  
  // Set up the mounted state
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);
  
  return (
    <AuthRoute requireAuth={false}>
      <Slot />
    </AuthRoute>
  );
}