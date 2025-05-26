import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';

export default function PaymentPendingScreen() {
  const router = useRouter();

  const handleBackToHome = () => {
    router.replace('/(tabs)/home' as any);
  };

  const handleViewOrders = () => {
    router.replace('/(tabs)/orders' as any);
  };

  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        <MaterialIcons name="pending-actions" size={80} color="#FFA000" />
      </View>
      
      <Text style={styles.title}>Pago en proceso</Text>
      <Text style={styles.subtitle}>Estamos procesando tu pago</Text>
      
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FFA000" />
        <Text style={styles.loadingText}>Por favor, espera mientras confirmamos tu pago...</Text>
      </View>
      
      <Text style={styles.message}>
        Hemos recibido tu pago y lo estamos procesando. Te notificaremos por correo electrónico una vez que se complete la transacción.
      </Text>
      
      <View style={styles.buttonContainer}>
        <TouchableOpacity 
          style={[styles.button, styles.primaryButton]} 
          onPress={handleBackToHome}
        >
          <Text style={styles.buttonText}>Volver al inicio</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.button, styles.secondaryButton]}
          onPress={handleViewOrders}
        >
          <Text style={[styles.buttonText, { color: '#2196F3' }]}>Ver mis pedidos</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
    color: '#333',
  },
  subtitle: {
    fontSize: 18,
    color: '#666',
    marginBottom: 20,
    textAlign: 'center',
  },
  loadingContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    maxWidth: '80%',
  },
  message: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
    paddingHorizontal: 20,
    lineHeight: 24,
  },
  buttonContainer: {
    width: '100%',
    alignItems: 'center',
  },
  button: {
    width: '100%',
    padding: 15,
    borderRadius: 5,
    alignItems: 'center',
    marginBottom: 10,
  },
  primaryButton: {
    backgroundColor: '#2196F3',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#2196F3',
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
