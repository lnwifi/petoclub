import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import { Alert } from 'react-native';

// Supabase configuration
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Supabase credentials not found. Please check your .env file.');
}

console.log('Supabase URL:', supabaseUrl);
console.log('Supabase anon key length:', supabaseAnonKey.length);

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Authentication helper functions
export const signUp = async (email: string, password: string, fullName: string) => {
  try {
    console.log('Iniciando registro con:', { email, fullName });
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          email: email,
          notifications_enabled: true,
          email_notifications_enabled: true
        },
      },
    });

    console.log('Respuesta de Supabase:', { data, error });

    if (error) throw error;
    return { data, error: null };
  } catch (error: any) {
    console.error('Error detallado:', error);
    Alert.alert('Error', error.message);
    return { data: null, error };
  }
};

export const signIn = async (email: string, password: string) => {
  try {
    console.log('Iniciando inicio de sesión con:', { email });
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    console.log('Respuesta de Supabase:', { data, error });

    if (error) return { data: null, error };
    return { data, error: null };
  } catch (error: any) {
    console.error('Error detallado:', error);
    return { data: null, error };
  }
};

export const signOut = async () => {
  try {
    console.log('Iniciando cierre de sesión');
    const { error } = await supabase.auth.signOut();

    console.log('Respuesta de Supabase:', { error });

    if (error) throw error;
    return { error: null };
  } catch (error: any) {
    console.error('Error detallado:', error);
    Alert.alert('Error', error.message);
    return { error };
  }
};

export const resetPassword = async (email: string) => {
  try {
    console.log('Iniciando restablecimiento de contraseña para:', { email });
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'petclub://reset-password',
    });

    console.log('Respuesta de Supabase:', { error });

    if (error) throw error;
    return { error: null };
  } catch (error: any) {
    console.error('Error detallado:', error);
    Alert.alert('Error', error.message);
    return { error };
  }
};