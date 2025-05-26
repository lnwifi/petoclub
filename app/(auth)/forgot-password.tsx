import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, Alert, Image } from 'react-native';
import { Link, router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';

export default function ForgotPassword() {
  const { resetPassword, loading } = useAuth();
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);
  const params = useLocalSearchParams();

  const handleResetPassword = async () => {
    setMessage(null);
    if (!email) {
      setMessage({ type: 'error', text: 'Por favor ingresa tu correo electrónico' });
      return;
    }

    const { error } = await resetPassword(email);
    if (!error) {
      setMessage({ type: 'success', text: '¡Correo de recuperación enviado! Revisa tu correo.' });
    } else {
      setMessage({ type: 'error', text: error.message || 'No se pudo enviar el correo de recuperación.' });
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
          <View style={{ marginBottom: 10, backgroundColor: message.type === 'error' ? '#ffdddd' : '#ddffdd', padding: 10, borderRadius: 6 }}>
            <Text style={{ color: message.type === 'error' ? '#b00' : '#080', textAlign: 'center', fontFamily: 'Inter_400Regular' }}>{message.text}</Text>
          </View>
        )}
        <Text style={styles.subtitle}>Recuperación de Contraseña</Text>
        <Text style={styles.description}>
          Ingresa tu correo electrónico y te enviaremos instrucciones para restablecer tu contraseña.
        </Text>
        <TextInput
          style={styles.input}
          placeholder="Correo electrónico"
          keyboardType="email-address"
          autoCapitalize="none"
          value={email}
          onChangeText={setEmail}
        />
        <TouchableOpacity 
          style={styles.button}
          onPress={handleResetPassword}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Enviar correo de recuperación</Text>
          )}
        </TouchableOpacity>
        <Link href="/(auth)/login" style={styles.loginLink}>
          <Text style={{textAlign: 'center'}}>Volver al inicio de sesión</Text>
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
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 16,
    borderRadius: 10,
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    width: '100%',
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 20,
    fontFamily: 'Inter_600SemiBold',
    textAlign: 'center',
    marginBottom: 10,
  },
  description: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
    fontFamily: 'Inter_400Regular',
  },
  form: {
    gap: 16,
    width: '100%',
    maxWidth: 450,
    alignSelf: 'center',
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
  loginLink: {
    textAlign: 'center',
    marginTop: 20,
    color: '#666',
    fontFamily: 'Inter_400Regular',
  },
});