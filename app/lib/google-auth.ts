import * as AuthSession from 'expo-auth-session';
import { supabase } from './supabase';
import { Platform } from 'react-native';

export async function signInWithGoogle() {
  // Detecta el redirect URI correcto según la plataforma
  let redirectTo;
  if (Platform.OS === 'web') {
    redirectTo = window.location.origin;
  } else {
    redirectTo = AuthSession.makeRedirectUri({ useProxy: true });
  }
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo }
  });
  if (error) throw error;
  return data;
}
