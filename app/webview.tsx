import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet, Text, TouchableOpacity, SafeAreaView, Platform, Alert } from 'react-native';
import { WebView } from 'react-native-webview';
import { useLocalSearchParams, Stack, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function WebViewScreen() {
  const { url } = useLocalSearchParams();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const decodedUrl = url ? decodeURIComponent(url as string) : '';
  
  // Validar URL
  useEffect(() => {
    if (!decodedUrl) {
      setError('URL no proporcionada');
      setIsLoading(false);
    } else {
      try {
        new URL(decodedUrl);
        setError(null);
      } catch (e) {
        setError('URL inválida');
        setIsLoading(false);
      }
    }
  }, [decodedUrl]);
  
  // Manejar eventos de navegación
  const handleNavigationStateChange = (navState: any) => {
    console.log('Navegando a:', navState.url);
    
    // Detectar si el usuario completó el pago (redirigido a una URL de éxito)
    if (
      navState.url.includes('order-received') || 
      navState.url.includes('thank-you') || 
      navState.url.includes('checkout/success') ||
      navState.url.includes('status=approved') ||
      navState.url.includes('/success') ||
      navState.url.includes('collection_status=approved') ||
      navState.url.includes('collection_id=') ||
      navState.url.includes('payment_id=')
    ) {
      console.log('¡Pago completado con éxito!');
      
      // Mostrar mensaje de éxito
      Alert.alert(
        '¡Pago completado!',
        'Tu pedido ha sido procesado correctamente.',
        [
          { 
            text: 'Ver mis pedidos', 
            onPress: () => {
              router.replace('/(app)/profile/orders');
            }
          }
        ]
      );
    }
    
    // Detectar si el usuario canceló el pago
    if (
      navState.url.includes('checkout/cancel') || 
      navState.url.includes('status=rejected') ||
      navState.url.includes('status=cancelled') ||
      navState.url.includes('status=in_process') ||
      navState.url.includes('status=pending') ||
      navState.url.includes('collection_status=rejected') ||
      navState.url.includes('collection_status=cancelled') ||
      navState.url.includes('collection_status=in_process') ||
      navState.url.includes('collection_status=pending') ||
      navState.url.includes('/failure') ||
      navState.url.includes('/pending')
    ) {
      console.log('Pago cancelado, rechazado o pendiente');
      
      // Mostrar mensaje según el estado
      const isPending = 
        navState.url.includes('status=in_process') || 
        navState.url.includes('status=pending') ||
        navState.url.includes('collection_status=in_process') ||
        navState.url.includes('collection_status=pending') ||
        navState.url.includes('/pending');
      
      Alert.alert(
        isPending ? 'Pago pendiente' : 'Pago no completado',
        isPending 
          ? 'Tu pago está siendo procesado. Podrás ver el estado en la sección de pedidos.'
          : 'El proceso de pago ha sido cancelado o rechazado.',
        [
          { 
            text: isPending ? 'Ver mis pedidos' : 'Volver a la tienda', 
            onPress: () => {
              router.replace(isPending ? '/(app)/profile/orders' : '/(app)/store');
            }
          }
        ]
      );
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen 
        options={{
          title: 'Pago',
          headerShown: true,
          headerLeft: () => (
            <TouchableOpacity 
              onPress={() => router.back()}
              style={styles.backButton}
            >
              <Ionicons name="arrow-back" size={24} color="#333" />
            </TouchableOpacity>
          ),
        }} 
      />
      
      {error ? (
        <View style={styles.errorContainer}>
          <Ionicons name="warning-outline" size={48} color="#ff4c4c" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity 
            style={styles.button}
            onPress={() => router.back()}
          >
            <Text style={styles.buttonText}>Volver</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          {isLoading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#ffbc4c" />
              <Text style={styles.loadingText}>Cargando página de pago...</Text>
            </View>
          )}
          
          <WebView
            source={{ uri: decodedUrl }}
            style={styles.webview}
            onLoadStart={() => setIsLoading(true)}
            onLoadEnd={() => setIsLoading(false)}
            onError={() => {
              setError('Error al cargar la página');
              setIsLoading(false);
            }}
            onNavigationStateChange={handleNavigationStateChange}
            javaScriptEnabled={true}
            domStorageEnabled={true}
          />
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  webview: {
    flex: 1,
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    zIndex: 1,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    fontFamily: 'Inter_500Medium',
    color: '#333',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    fontFamily: 'Inter_500Medium',
    color: '#666',
    marginTop: 16,
    marginBottom: 20,
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#ffbc4c',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
  },
  backButton: {
    padding: 8,
  },
});
