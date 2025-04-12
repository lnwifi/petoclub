import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, Image } from 'react-native';
import { Eye, EyeOff } from 'lucide-react-native';
import { Link, router } from 'expo-router';
import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';

export default function Login() {
  const { signIn, loading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      return;
    }
    
    const { error } = await signIn(email, password);
    if (!error) {
      router.replace('/(app)');
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
  logo: {
    width: 200,
    height: 80,
    alignSelf: 'center',
    marginBottom: 40,
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