import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { CheckCircle } from 'lucide-react-native';

export default function MembershipSuccess() {
  const router = useRouter();
  return (
    <View style={styles.container}>
      <CheckCircle color="#4CAF50" size={64} style={{ marginBottom: 24 }} />
      <Text style={styles.title}>¡Pago exitoso!</Text>
      <Text style={styles.subtitle}>Tu membresía Premium está siendo activada.</Text>
      <Text style={styles.info}>Si no ves el cambio reflejado, vuelve a esta pantalla en unos minutos o recarga la app.</Text>
      <TouchableOpacity style={styles.button} onPress={() => router.replace('/memberships')}>
        <Text style={styles.buttonText}>Ir a Membresías</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[styles.button, styles.secondaryButton]} onPress={() => router.replace('/') }>
        <Text style={[styles.buttonText, styles.secondaryButtonText]}>Ir al inicio</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    padding: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 18,
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  info: {
    fontSize: 15,
    color: '#888',
    marginBottom: 24,
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#ffbc4c',
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 8,
    marginBottom: 12,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  secondaryButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ffbc4c',
  },
  secondaryButtonText: {
    color: '#ffbc4c',
  },
});
