import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  supabase: any;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  isAdmin: boolean;
  resetError: () => void;
  checkSession: () => Promise<void>;
  isSigningIn: boolean;
  isSigningOut: boolean;
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
  const [error, setError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  // Function to verify admin status
  const verifyAdminStatus = useCallback(async (userId: string) => {
    try {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', userId)
        .single();

      if (profileError) {
        console.error('Error verifying admin status:', profileError);
        return false;
      }

      return profile?.is_admin || false;
    } catch (error) {
      console.error('Error in verifyAdminStatus:', error);
      return false;
    }
  }, []);

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
        return;
      }

      setUser(session.user);
      
      // Verify admin status
      if (session.user) {
        const isAdminStatus = await verifyAdminStatus(session.user.id);
        setIsAdmin(isAdminStatus);
      }

      setLoading(false);
      
    } catch (error) {
      console.error('Error in checkSession:', error);
      setError(error instanceof Error ? error.message : 'Error verifying session');
      
      // Clear session on error
      await supabase.auth.signOut();
      setUser(null);
      setIsAdmin(false);
      setLoading(false);
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

      if (data?.user) {
        const isAdminStatus = await verifyAdminStatus(data.user.id);
        setIsAdmin(isAdminStatus);
      }

    } catch (error) {
      console.error('Error in signIn:', error);
      setError(error instanceof Error ? error.message : 'Error signing in');
    } finally {
      setIsSigningIn(false);
    }
  }, [verifyAdminStatus]);

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

      setUser(null);
      setIsAdmin(false);
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

  // Effect to check session on mount
  useEffect(() => {
    checkSession();

    // Subscribe to session changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      console.log('Authentication state change detected');
      setLoading(true);
      
      if (!session) {
        console.log('No active session');
        setUser(null);
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      try {
        console.log('Active session, updating user');
        setUser(session.user);
        
        if (session.user) {
          const isAdminStatus = await verifyAdminStatus(session.user.id);
          setIsAdmin(isAdminStatus);
        }
      } catch (error) {
        console.error('Error processing authentication change:', error);
        setIsAdmin(false);
      } finally {
        console.log('Finished processing authentication change');
        setLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [checkSession, verifyAdminStatus]);

  const value = useMemo(() => ({
    user,
    loading,
    error,
    supabase,
    signIn,
    signOut,
    isAdmin,
    resetError,
    checkSession,
    isSigningIn,
    isSigningOut
  }), [
    user,
    loading,
    error,
    signIn,
    signOut,
    isAdmin,
    resetError,
    checkSession,
    isSigningIn,
    isSigningOut
  ]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}