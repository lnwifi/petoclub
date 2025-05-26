import React, { createContext, useState, useContext, useEffect, useRef } from 'react';
import { supabase } from './supabase';
import { Session } from '@supabase/supabase-js';

type AuthContextType = {
  session: Session | null;
  user: any | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: any }>;
  signOut: () => Promise<{ error: any }>;
  resetPassword: (email: string) => Promise<{ error: any }>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const isMounted = useRef(true);

  useEffect(() => {
    // Set isMounted ref to true when component mounts
    isMounted.current = true;
    
    // Check for active session on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (isMounted.current) {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (isMounted.current) {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    });

    // Cleanup function to prevent state updates on unmounted component
    return () => {
      isMounted.current = false;
      subscription.unsubscribe();
    };
  }, []);

  const value = {
    session,
    user,
    loading,
    signIn: async (email: string, password: string) => {
      try {
        if (isMounted.current) setLoading(true);
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) return { error };
        return { error: null };
      } catch (error: any) {
        return { error };
      } finally {
        if (isMounted.current) setLoading(false);
      }
    },
    signUp: async (email: string, password: string, fullName: string) => {
      try {
        if (isMounted.current) setLoading(true);
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
            }
          },
        });
        if (error) return { error };
        return { error: null };
      } catch (error: any) {
        return { error };
      } finally {
        if (isMounted.current) setLoading(false);
      }
    },
    signOut: async () => {
      try {
        if (isMounted.current) setLoading(true);
        const { error } = await supabase.auth.signOut();
        if (error) return { error };
        return { error: null };
      } catch (error: any) {
        return { error };
      } finally {
        if (isMounted.current) setLoading(false);
      }
    },
    resetPassword: async (email: string) => {
      try {
        if (isMounted.current) setLoading(true);
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: 'petclub://reset-password',
        });
        if (error) return { error };
        return { error: null };
      } catch (error: any) {
        return { error };
      } finally {
        if (isMounted.current) setLoading(false);
      }
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};