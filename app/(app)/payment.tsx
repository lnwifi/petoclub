import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useAuth } from '../../lib/auth-context';

declare global {
  interface Window {
    MercadoPago: any;
  }
}

export default function PaymentScreen() {
  const { preferenceId, publicKey, orderId } = useLocalSearchParams<{
    preferenceId: string;
    publicKey: string;
    orderId: string;
  }>();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const mercadopago = useRef<any>(null);

  useEffect(() => {
    if (!preferenceId || !publicKey || !orderId) {
      setError('Faltan parámetros necesarios para el pago');
      setLoading(false);
      return;
    }

    // Cargar el SDK de MercadoPago
    const script = document.createElement('script');
    script.src = 'https://sdk.mercadopago.com/js/v2';
    script.async = true;
    script.onload = () => initializeMercadoPago();
    script.onerror = () => {
      setError('No se pudo cargar el SDK de MercadoPago');
      setLoading(false);
    };
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, [preferenceId, publicKey, orderId]);

  const initializeMercadoPago = async () => {
    try {
      if (!window.MercadoPago) {
        throw new Error('SDK de MercadoPago no disponible');
      }

      // Inicializar MercadoPago con la clave pública
      mercadopago.current = new window.MercadoPago(publicKey, {
        locale: 'es-AR',
      });

      // Crear el checkout
      const checkout = mercadopago.current.checkout({
        preference: {
          id: preferenceId,
        },
        autoOpen: true,
        theme: {
          elementsColor: '#4CAF50',
          headerColor: '#4CAF50',
        },
      });

      // Manejar eventos del checkout
      checkout.on('onSubmit', (data: any) => {
        console.log('Pago enviado:', data);
      });

      checkout.on('onError', (error: any) => {
        console.error('Error en el pago:', error);
        setError('Ocurrió un error al procesar el pago. Por favor, inténtalo de nuevo.');
        setLoading(false);
      });

      checkout.on('onClose', () => {
        console.log('Checkout cerrado');
        // Redirigir de vuelta al carrito si se cierra sin completar el pago
        router.replace('/(tabs)/cart');
      });

      setLoading(false);
    } catch (err) {
      console.error('Error al inicializar MercadoPago:', err);
      setError('No se pudo inicializar el proceso de pago. Por favor, inténtalo de nuevo.');
      setLoading(false);
    }
  };

  // Verificar el estado del pago periódicamente
  useEffect(() => {
    if (!orderId || loading) return;

    const checkPaymentStatus = async () => {
      try {
        const session = await supabase.auth.getSession();
        const jwt = session.data.session?.access_token;
        
        if (!jwt) {
          throw new Error('No se pudo obtener el token de sesión');
        }

        const response = await fetch(
          `https://petoclub.com.ar/wp-json/wc/v3/orders/${orderId}`,
          {
            headers: {
              'Authorization': `Bearer ${jwt}`
            }
          }
        );

        if (!response.ok) {
          throw new Error('No se pudo verificar el estado del pago');
        }

        const order = await response.json();
        
        // Si el pago fue exitoso, redirigir a la pantalla de éxito
        if (order.status === 'processing' || order.status === 'completed') {
          router.replace({
            pathname: '/payment/success',
            params: { orderId: order.id }
          });
        }
      } catch (err) {
        console.error('Error al verificar el estado del pago:', err);
      }
    };

    // Verificar el estado cada 5 segundos
    const interval = setInterval(checkPaymentStatus, 5000);
    return () => clearInterval(interval);
  }, [orderId, loading]);

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={styles.loadingText}>Cargando pasarela de pago...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Procesando tu pago</Text>
      <Text style={styles.subtitle}>Por favor, completa el pago en la ventana emergente de MercadoPago.</Text>
      <Text style={styles.note}>Si no ves la ventana de pago, verifica que los popups estén habilitados para este sitio.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
    color: '#666',
  },
  note: {
    fontSize: 14,
    textAlign: 'center',
    color: '#999',
    fontStyle: 'italic',
    marginTop: 20,
  },
  loadingText: {
    marginTop: 20,
    fontSize: 16,
    color: '#666',
  },
  errorText: {
    color: 'red',
    fontSize: 16,
    textAlign: 'center',
    padding: 20,
  },
});
