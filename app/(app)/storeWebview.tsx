import React from 'react';
import { SafeAreaView, StyleSheet, Platform } from 'react-native';
import { WebView } from 'react-native-webview';

// Usa la URL real del checkout de WooCommerce
const CHECKOUT_URL = 'https://petoclub.com.ar/checkout';

export default function StoreWebview() {
  if (Platform.OS === 'web') {
    // Abrir en nueva pestaña en web y mostrar mensaje amigable
    if (typeof window !== 'undefined') {
      window.open(CHECKOUT_URL, '_blank');
    }
    return (
      <SafeAreaView style={styles.container}>
        <div style={{ padding: 24, textAlign: 'center', fontSize: 18 }}>
          Serás redirigido al checkout en una nueva pestaña.<br />
          Si no se abre automáticamente, <a href={CHECKOUT_URL} target="_blank" rel="noopener noreferrer">haz clic aquí</a>.
        </div>
      </SafeAreaView>
    );
  }
  // Mobile: usar WebView
  return (
    <SafeAreaView style={styles.container}>
      <WebView
        source={{ uri: CHECKOUT_URL }}
        style={{ flex: 1 }}
        startInLoadingState
        javaScriptEnabled
        domStorageEnabled
        // Puedes agregar más props para controlar el comportamiento
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
});
