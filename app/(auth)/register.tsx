import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, Alert, Image } from 'react-native';
import { Link, router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';

export default function Register() {
  const { signUp, loading } = useAuth();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);
  const params = useLocalSearchParams();

  const handleRegister = async () => {
    setMessage(null);
    if (!fullName || !email || !password) {
      setMessage({ type: 'error', text: 'Por favor completa todos los campos' });
      return;
    }

    if (password !== confirmPassword) {
      setMessage({ type: 'error', text: 'Las contraseñas no coinciden' });
      return;
    }

    const { error } = await signUp(email, password, fullName);
    if (!error) {
      // Redirigir al login después de un registro exitoso
      router.replace('/(auth)/login?success=register');
    } else {
      setMessage({ type: 'error', text: error.message || 'No se pudo registrar el usuario.' });
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
        <TextInput
          style={styles.input}
          placeholder="Nombre completo"
          autoCapitalize="words"
          value={fullName}
          onChangeText={setFullName}
        />
        <TextInput
          style={styles.input}
          placeholder="Correo electrónico"
          keyboardType="email-address"
          autoCapitalize="none"
          value={email}
          onChangeText={setEmail}
        />
        <TextInput
          style={styles.input}
          placeholder="Contraseña"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />
        <TextInput
          style={styles.input}
          placeholder="Confirmar contraseña"
          secureTextEntry
          value={confirmPassword}
          onChangeText={setConfirmPassword}
        />
        <TouchableOpacity 
          style={styles.button}
          onPress={handleRegister}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Registrarse</Text>
          )}
        </TouchableOpacity>
        <Link href="/(auth)/login" style={styles.loginLink}>
          <Text>¿Ya tienes una cuenta? Inicia sesión</Text>
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
    marginBottom: 16,
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