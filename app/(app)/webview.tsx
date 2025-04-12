import { View, StyleSheet, ActivityIndicator, TouchableOpacity, SafeAreaView } from 'react-native';
import { WebView } from 'react-native-webview';
import { useLocalSearchParams, router } from 'expo-router';
import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useMembership } from '../../hooks/useMembership';

export default function WebViewScreen() {
  const { url } = useLocalSearchParams<{ url: string }>();
  const [loading, setLoading] = useState(true);
  const { hasStoreDiscount } = useMembership();

  // Función para inyectar código JavaScript para aplicar descuentos si es necesario
  const getInjectedJavaScript = () => {
    if (hasStoreDiscount()) {
      // Este código se ejecutará en el WebView para aplicar descuentos
      // Nota: Esto es un ejemplo y podría necesitar ajustes según la estructura de la página de WooCommerce
      return `
        (function() {
          // Intentar aplicar descuento después de que la página se cargue completamente
          setTimeout(() => {
            // Buscar elementos de precio y aplicar descuento visual
            const priceElements = document.querySelectorAll('.price');
            priceElements.forEach(el => {
              // Añadir una etiqueta de descuento
              const discountBadge = document.createElement('span');
              discountBadge.textContent = 'Descuento Premium 10%';
              discountBadge.style.backgroundColor = '#e6f7ff';
              discountBadge.style.color = '#0099cc';
              discountBadge.style.padding = '3px 6px';
              discountBadge.style.borderRadius = '4px';
              discountBadge.style.fontSize = '12px';
              discountBadge.style.marginLeft = '10px';
              el.appendChild(discountBadge);
            });
          }, 1000);
        })();
      `;
    }
    return '';
  };

  if (!url) {
    return (
      <View style={styles.errorContainer}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Botón de volver */}
      <TouchableOpacity 
        style={styles.backButton}
        onPress={() => router.back()}
      >
        <Ionicons name="arrow-back" size={24} color="#fff" />
      </TouchableOpacity>

      <WebView
        source={{ uri: decodeURIComponent(url) }}
        style={styles.webview}
        onLoadStart={() => setLoading(true)}
        onLoadEnd={() => setLoading(false)}
        injectedJavaScript={getInjectedJavaScript()}
      />
      
      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#ffbc4c" />
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
  webview: {
    flex: 1,
  },
  loadingContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  backButton: {
    position: 'absolute',
    top: 10,
    left: 10,
    zIndex: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
