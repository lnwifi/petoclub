import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('The environment variables VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be set');
}

// Initialize Supabase
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
    storageKey: 'petoclub_admin_session',
    onRefreshToken: async (refreshToken) => {
      try {
        const { data: { session }, error } = await supabase.auth.refreshSession(refreshToken);
        if (error) {
          console.error('Error refreshing token:', error);
          return null;
        }
        return session;
      } catch (error) {
        console.error('Error in onRefreshToken:', error);
        return null;
      }
    }
  },
  global: {
    headers: {
      'X-Requested-With': 'XMLHttpRequest'
    },
    fetch: async (...args: [RequestInfo | URL, RequestInit?]) => {
      try {
        const response = await fetch(...args);
        console.log('Response status:', response.status);
        
        if (!response.ok) {
          const error = await response.json().catch(() => ({ 
            message: 'Error in request',
            status: response.status,
            statusText: response.statusText
          }));
          
          // Handle specific error cases
          if (error.message?.includes('Invalid Refresh Token')) {
            console.error('Invalid refresh token, clearing session');
            await supabase.auth.signOut();
            throw new Error('Session expired. Please log in again.');
          }
          
          console.error('Network error:', error);
          throw new Error(`Error ${error.status}: ${error.message || error.statusText}`);
        }
        return response;
      } catch (error) {
        console.error('Request error:', error);
        throw new Error(`Error connecting to Supabase: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  }
});

// Verify session on startup
supabase.auth.getSession().then(({ data: { session }, error }) => {
  if (error) {
    console.error('Error verifying session:', error);
  } else if (session) {
    console.log('Session verified successfully');
  }
});
