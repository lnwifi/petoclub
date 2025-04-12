import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, Alert, Image } from 'react-native';
import { Link, router } from 'expo-router';
import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';

export default function ForgotPassword() {
  const { resetPassword, loading } = useAuth();
  const [email, setEmail] = useState('');

  const handleResetPassword = async () => {
    if (!email) {
      Alert.alert('Error', 'Por favor ingresa tu correo electrónico');
      return;
    }

    const { error } = await resetPassword(email);
    if (!error) {
      // Redirigir al login después de enviar el correo
      router.replace('/(auth)/login');
    }
  };

  return (
    <View style={styles.container}>
      <Image 
        source={require('@/assets/images/petclub-logo.svg')} 
        style={styles.logo} 
        resizeMode="contain"
      />
      <View style={styles.form}>
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
  logo: {
    width: 200,
    height: 80,
    alignSelf: 'center',
    marginBottom: 20,
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
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 15,
    borderRadius: 8,
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
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