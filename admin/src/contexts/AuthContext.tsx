import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  restoring: boolean;
  error: string | null;
  supabase: any;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  isAdmin: boolean;
  resetError: () => void;
  checkSession: () => Promise<void>;
  isSigningIn: boolean;
  isSigningOut: boolean;
  restoreFailed: boolean;
  retryRestore: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [restoring, setRestoring] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [restoreFailed, setRestoreFailed] = useState(false);

  // Function to verify admin status
  const verifyAdminStatus = useCallback(async (userId: string) => {
    try {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('user_id', userId)
        .single();

      if (profileError) {
        setIsAdmin(false);
        setUser(null);
        await supabase.auth.signOut();
        return false;
      }

      if (!profile?.is_admin) {
        setIsAdmin(false);
        setUser(null);
        await supabase.auth.signOut();
        return false;
      }

      setIsAdmin(true);
      return true;
    } catch (error) {
      setIsAdmin(false);
      setUser(null);
      await supabase.auth.signOut();
      return false;
    }
  }, [supabase]);

  // Function to check session
  const checkSession = useCallback(async () => {
    console.log('Starting session verification...');
    setLoading(true);
    setError(null);
    
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error('Error verifying session:', sessionError);
        throw new Error('Error verifying session');
      }

      if (!session) {
        console.log('No active session');
        setUser(null);
        setIsAdmin(false);
        setLoading(false);
        console.log('checkSession: set loading false, user: null, isAdmin: false');
        return;
      }

      setUser(session.user);
      console.log('checkSession: set user:', session.user);
      
      // Verify admin status
      let isAdminStatus = false;
      if (session.user) {
        isAdminStatus = await verifyAdminStatus(session.user.id);
        setIsAdmin(isAdminStatus);
        console.log('checkSession: set isAdmin:', isAdminStatus);
      } else {
        setIsAdmin(false);
        console.log('checkSession: set isAdmin: false');
      }
      setLoading(false);
      console.log('checkSession: set loading false, user:', session.user, 'isAdmin:', isAdminStatus);
    } catch (error) {
      console.error('Error in checkSession:', error);
      setError(error instanceof Error ? error.message : 'Error verifying session');
      // Clear session on error
      await supabase.auth.signOut();
      setUser(null);
      setIsAdmin(false);
      setLoading(false);
      console.log('checkSession: set loading false, user: null, isAdmin: false (error)');
    }
  }, [verifyAdminStatus]);

  // Sign in function
  const signIn = useCallback(async (email: string, password: string) => {
    setIsSigningIn(true);
    setError(null);
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        console.error('Error signing in:', error);
        throw error;
      }

      // Forzar actualización del estado de sesión
      await checkSession();

      if (data?.user) {
        const isAdminStatus = await verifyAdminStatus(data.user.id);
        setIsAdmin(isAdminStatus);
        console.log('signIn: set isAdmin:', isAdminStatus);
      }
    } catch (error) {
      console.error('Error in signIn:', error);
      setError(error instanceof Error ? error.message : 'Error signing in');
    } finally {
      setIsSigningIn(false);
    }
  }, [verifyAdminStatus, checkSession]);

  // Sign out function
  const signOut = useCallback(async () => {
    setIsSigningOut(true);
    setError(null);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Error signing out:', error);
        throw error;
      }
      // Fallback manual cleanup (por si el SDK falla)
      try {
        localStorage.removeItem('supabase.auth.token');
        localStorage.removeItem('supabase.auth.refresh_token');
        localStorage.removeItem('supabase.auth.access_token');
        Object.keys(localStorage).forEach(k => {
          if (k.startsWith('sb-')) localStorage.removeItem(k);
        });
        // Limpiar IndexedDB: supabase usa localforage, clave 'supabase-' o 'localforage'
        if ('indexedDB' in window) {
          const req1 = window.indexedDB.deleteDatabase('supabase-auth-client');
          req1.onerror = () => console.warn('No se pudo borrar indexedDB: supabase-auth-client');
          req1.onsuccess = () => console.log('IndexedDB supabase-auth-client borrada');
          // Algunas versiones usan 'localforage' como nombre
          const req2 = window.indexedDB.deleteDatabase('localforage');
          req2.onerror = () => {};
          req2.onsuccess = () => {};
        }
      } catch (e) {
        console.warn('No se pudo limpiar localStorage/IndexedDB manualmente:', e);
      }
      setUser(null);
      setIsAdmin(false);
      console.log('signOut: set user: null, isAdmin: false');
    } catch (error) {
      console.error('Error in signOut:', error);
      setError(error instanceof Error ? error.message : 'Error signing out');
    } finally {
      setIsSigningOut(false);
    }
  }, []);

  // Reset error
  const resetError = useCallback(() => {
    setError(null);
  }, []);

  // Nueva función para reintentar restauración
  const retryRestore = useCallback(async () => {
    setRestoreFailed(false);
    setRestoring(true);
    await checkSession();
    setRestoring(false);
  }, [checkSession]);

  useEffect(() => {
    let timeout: NodeJS.Timeout;
    let finished = false;
    setRestoring(true);
    setRestoreFailed(false);

    // Timeout fallback
    timeout = setTimeout(() => {
      if (!finished) {
        setRestoreFailed(true);
        setRestoring(false);
      }
    }, 5000);

    // Subscribe to session changes (will fire immediately with current session)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (finished) return;
      if (session && session.user) {
        setUser(session.user);
        const isAdminStatus = await verifyAdminStatus(session.user.id);
        setIsAdmin(isAdminStatus);
        setRestoring(false);
        setRestoreFailed(false);
        finished = true;
        clearTimeout(timeout);
      } else {
        setUser(null);
        setIsAdmin(false);
        // No llamamos a setRestoring(false) aquí porque podría recuperarse luego
      }
    });

    return () => {
      finished = true;
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, [verifyAdminStatus]);

  const value = useMemo(() => ({
    user,
    loading,
    restoring,
    error,
    supabase,
    signIn,
    signOut,
    isAdmin,
    resetError,
    checkSession,
    isSigningIn,
    isSigningOut,
    restoreFailed,
    retryRestore
  }), [
    user,
    loading,
    restoring,
    error,
    signIn,
    signOut,
    isAdmin,
    resetError,
    checkSession,
    isSigningIn,
    isSigningOut,
    restoreFailed,
    retryRestore
  ]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}