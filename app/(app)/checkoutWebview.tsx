import React, { useEffect, useState } from 'react';
import { SafeAreaView, StyleSheet, ActivityIndicator, View, Text, TouchableOpacity, Platform, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
// Solo importar WebView en móvil
const isWeb = Platform.OS === 'web';
let WebView: any = null;
if (!isWeb) {
  WebView = require('react-native-webview').WebView;
}

const CHECKOUT_URL = 'https://petoclub.com.ar/checkout';

export default function CheckoutWebview() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // En web, abrir en nueva pestaña automáticamente
  useEffect(() => {
    if (isWeb) {
      window.open(CHECKOUT_URL, '_blank');
    }
  }, []);

  // Detecta éxito o error en el flujo de pago (solo móvil)
  const handleNavigationStateChange = (navState: any) => {
    if (
      navState.url.includes('order-received') ||
      navState.url.includes('thank-you') ||
      navState.url.includes('checkout/success') ||
      navState.url.includes('status=approved')
    ) {
      Alert.alert('¡Compra exitosa!', 'Tu pedido fue realizado correctamente.', [
        {
          text: 'Ver mis pedidos',
          onPress: () => router.replace('/profile/orders'),
        },
      ]);
    }
    if (
      navState.url.includes('cancel_order') ||
      navState.url.includes('order-cancelled') ||
      navState.url.includes('status=cancelled')
    ) {
      Alert.alert('Pago cancelado', 'El pago fue cancelado o rechazado.', [
        {
          text: 'Volver a la tienda',
          onPress: () => router.replace('/store'),
        },
      ]);
    }
  };

  if (isWeb) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Checkout</Text>
        </View>
        <View style={styles.webMsgContainer}>
          <Text style={styles.webMsgTitle}>Abriendo el checkout en una nueva pestaña...</Text>
          <Text style={styles.webMsgSubtitle}>
            Si no se abre automáticamente, haz clic aquí:
          </Text>
          <TouchableOpacity onPress={() => window.open(CHECKOUT_URL, '_blank')} style={styles.webMsgButton}>
            <Text style={styles.webMsgButtonText}>Ir al Checkout</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Móvil: WebView
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Checkout</Text>
      </View>
      <WebView
        source={{ uri: CHECKOUT_URL }}
        style={styles.webview}
        onLoadStart={() => setLoading(true)}
        onLoadEnd={() => setLoading(false)}
        onError={() => setError('Error al cargar el checkout')}
        onNavigationStateChange={handleNavigationStateChange}
        javaScriptEnabled
        domStorageEnabled
      />
      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#ffbc4c" />
        </View>
      )}
      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffbc4c',
    paddingTop: Platform.OS === 'android' ? 32 : 12,
    paddingBottom: 12,
    paddingHorizontal: 16,
  },
  backButton: {
    marginRight: 16,
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: 'Inter_700Bold',
    color: '#fff',
  },
  webview: {
    flex: 1,
  },
  loadingContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.7)',
  },
  errorContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,76,76,0.1)',
  },
  errorText: {
    color: '#ff4c4c',
    fontSize: 16,
    fontFamily: 'Inter_700Bold',
  },
  webMsgContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  webMsgTitle: {
    fontSize: 20,
    fontFamily: 'Inter_700Bold',
    color: '#222',
    marginBottom: 12,
    textAlign: 'center',
  },
  webMsgSubtitle: {
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    color: '#666',
    marginBottom: 18,
    textAlign: 'center',
  },
  webMsgButton: {
    backgroundColor: '#ffbc4c',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  webMsgButtonText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
  },
});
