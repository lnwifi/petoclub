import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, Image, Alert } from 'react-native';
import { Eye, EyeOff } from 'lucide-react-native';
import { Link, router, useLocalSearchParams } from 'expo-router';
import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { signInWithGoogle } from '../lib/google-auth';
import * as AuthSession from 'expo-auth-session';

export default function Login() {
  const { signIn, loading, user } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);
  const params = useLocalSearchParams();

  // Elimina la redirección automática por user
  // useEffect(() => {
  //   if (user) {
  //     router.replace('/'); // Redirige a index.tsx (la raíz)
  //   }
  // }, [user]);

  useEffect(() => {
    // Solo log para debug, elimina Alert
    const uri = AuthSession.makeRedirectUri();
    console.log('Redirect URI:', uri);
  }, []);

  useEffect(() => {
    // Verifica si viene un mensaje de éxito por registro o restablecimiento
    if (params && params.success) {
      if (params.success === 'register') {
        setMessage({ type: 'success', text: '¡Registro exitoso! Ahora puedes iniciar sesión.' });
      } else if (params.success === 'reset') {
        setMessage({ type: 'success', text: '¡Contraseña restablecida! Revisa tu correo.' });
      }
      // Limpia solo el mensaje de éxito después de unos segundos
      const timeout = setTimeout(() => setMessage(null), 6000);
      return () => clearTimeout(timeout);
    }
    // NO limpiar el mensaje si es de error
  }, [params]);

  const handleLogin = async () => {
    setMessage(null);
    if (!email || !password) {
      setMessage({ type: 'error', text: 'Por favor ingresa tu correo y contraseña.' });
      console.log('[SET MESSAGE]', 'Por favor ingresa tu correo y contraseña.');
      return;
    }
    const result = await signIn(email, password);
    if (!result.error) {
      // Llamado automático para guardar el token push después del login
      try {
        const userId = user?.id;
        if (userId) {
          if (typeof window !== 'undefined' && window.navigator && window.navigator.userAgent) {
            // Web
            const { registerWebPushToken } = await import('../lib/registerWebPushToken');
            registerWebPushToken(userId);
          } else {
            // Móvil
            const { registerForPushNotificationsAsync } = await import('../lib/registerPushToken');
            registerForPushNotificationsAsync(userId);
          }
        }
      } catch (e) { console.error('Error registrando token push:', e); }
      router.replace('/(app)');
    } else {
      // Mostrar mensaje de error real de Supabase
      let errorText = 'Usuario o contraseña incorrectos.';
      if (result.error && typeof result.error === 'object') {
        errorText = result.error.message || errorText;
      } else if (typeof result.error === 'string') {
        errorText = result.error;
      }
      setMessage({ type: 'error', text: errorText });
      console.log('[SET MESSAGE]', errorText);
    }
  };

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    try {
      await signInWithGoogle();
      // El flujo de redirección lo maneja Supabase/Expo
    } catch (e) {
      // Puedes mostrar un Alert aquí si quieres
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.logoContainer}>
        <Image 
          source={require('@/assets/images/logo.png')} 
          style={styles.logo} 
          resizeMode="contain"
        />
      </View>
      <View style={styles.form}>
        {message && (
          <>
            {console.log('[RENDER MESSAGE]', message)}
            <View style={{ marginBottom: 10, backgroundColor: message.type === 'error' ? '#ffdddd' : '#ddffdd', padding: 10, borderRadius: 6 }}>
              <Text style={{ color: message.type === 'error' ? '#b00' : '#080', textAlign: 'center', fontFamily: 'Inter_400Regular' }}>{String(message.text)}</Text>
            </View>
          </>
        )}
        <TextInput
          style={styles.input}
          placeholder="Correo electrónico"
          keyboardType="email-address"
          autoCapitalize="none"
          value={email}
          onChangeText={setEmail}
        />
        <View style={styles.passwordContainer}>
          <TextInput
            style={styles.passwordInput}
            placeholder="Contraseña"
            secureTextEntry={!showPassword}
            value={password}
            onChangeText={setPassword}
          />
          <TouchableOpacity 
            style={styles.eyeButton} 
            onPress={() => setShowPassword(!showPassword)}
          >
            {showPassword ? (
              <Eye size={20} color="#666" />
            ) : (
              <EyeOff size={20} color="#666" />
            )}
          </TouchableOpacity>
        </View>
        <TouchableOpacity 
          style={styles.button} 
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Iniciar sesión</Text>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.button, { backgroundColor: '#fff', borderWidth: 1, borderColor: '#ddd', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 8 }]}
          onPress={handleGoogleLogin}
          disabled={googleLoading}
        >
          <Image source={require('../../assets/google-logo.png')} style={{ width: 22, height: 22, marginRight: 10 }} />
          {googleLoading ? (
            <ActivityIndicator color="#888" />
          ) : (
            <Text style={[styles.buttonText, { color: '#333' }]}>Continuar con Google</Text>
          )}
        </TouchableOpacity>
        <Link href="/(auth)/register" style={styles.registerLink}>
          <Text>¿No tienes una cuenta? Regístrate</Text>
        </Link>
        <Link href="/(auth)/forgot-password" style={styles.forgotLink}>
          <Text>¿Olvidaste tu contraseña?</Text>
        </Link>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#fff',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 30,
    paddingHorizontal: 20,
  },
  logo: {
    width: '100%',
    maxWidth: 350,
    height: 130,
    alignSelf: 'center',
  },
  form: {
    gap: 16,
    width: '100%',
    maxWidth: 450,
    alignSelf: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 16,
    borderRadius: 10,
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    width: '100%',
  },
  passwordContainer: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    alignItems: 'center',
  },
  passwordInput: {
    flex: 1,
    padding: 15,
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
  },
  eyeButton: {
    padding: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  button: {
    backgroundColor: '#ffbc4c',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
  },
  registerLink: {
    textAlign: 'center',
    marginTop: 20,
    color: '#666',
    fontFamily: 'Inter_400Regular',
  },
  forgotLink: {
    textAlign: 'center',
    color: '#666',
    fontFamily: 'Inter_400Regular',
  },
});