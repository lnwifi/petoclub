import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../../../lib/auth-context';
import { supabase } from '../../../lib/supabase';

interface OrderItem {
  id: number;
  name: string;
  quantity: number;
  price: string;
  total: string;
}

interface Order {
  id: number;
  number: string;
  status: string;
  date_created: string;
  total: string;
  payment_method_title: string;
  line_items: OrderItem[];
  billing: {
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
  };
}

export default function PaymentSuccessScreen() {
  const params = useLocalSearchParams<{ payment_id?: string; external_reference?: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    const verifyPayment = async () => {
      if (!params.payment_id && !params.external_reference) {
        setError('No se recibieron los parámetros de pago necesarios');
        setLoading(false);
        return;
      }

      try {
        // Verificar el estado del pago con MercadoPago
        const paymentStatus = await verifyMercadoPagoPayment(params.payment_id || '');
        
        if (paymentStatus === 'approved') {
          // Si el pago fue aprobado, obtener los detalles del pedido
          await fetchOrderDetails(params.external_reference || '');
        } else {
          setError('El pago no ha sido aprobado. Por favor, verifica el estado de tu pago.');
          setLoading(false);
        }
      } catch (error) {
        console.error('Error al verificar el pago:', error);
        setError('Ocurrió un error al verificar el estado del pago');
        setLoading(false);
      }
    };

    const verifyMercadoPagoPayment = async (paymentId: string) => {
      const response = await fetch(
        `https://api.mercadopago.com/v1/payments/${paymentId}`,
        {
          headers: {
            'Authorization': `Bearer ${process.env.EXPO_PUBLIC_MP_ACCESS_TOKEN}`
          }
        }
      );

      if (!response.ok) {
        throw new Error('No se pudo verificar el estado del pago');
      }

      const paymentData = await response.json();
      return paymentData.status;
    };

    const fetchOrderDetails = async (externalReference: string) => {
      try {
        const session = await supabase.auth.getSession();
        const jwt = session.data.session?.access_token;
        
        if (!jwt) {
          throw new Error('No se pudo obtener el token de sesión');
        }

        // Obtener el pedido usando la referencia externa
        const response = await fetch(
          `${process.env.EXPO_PUBLIC_WOOCOMMERCE_URL}/wp-json/wc/v3/orders?external_reference=${externalReference}`,
          {
            headers: {
              'Authorization': `Bearer ${jwt}`
            }
          }
        );

        if (!response.ok) {
          throw new Error('No se pudo obtener los detalles del pedido');
        }

        const orders = await response.json();
        if (orders && orders.length > 0) {
          setOrder(orders[0]);
        } else {
          setError('No se encontró el pedido');
        }
      } catch (error) {
        console.error('Error al obtener el pedido:', error);
        setError('No se pudo cargar la información del pedido');
      } finally {
        setLoading(false);
      }
    };

    verifyPayment();
  }, [params.payment_id, params.external_reference]);

  const handleBackToHome = () => {
    router.replace('/(tabs)/home' as any);
  };

  const handleViewOrder = () => {
    if (!order) return;
    router.push(`/orders/${order.id}` as any);
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#2196F3" />
        <Text style={styles.loadingText}>Verificando tu pago...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <View style={styles.iconContainer}>
          <MaterialIcons name="error-outline" size={80} color="#F44336" />
        </View>
        <Text style={styles.title}>Error en el pago</Text>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity 
          style={[styles.button, styles.primaryButton]} 
          onPress={handleBackToHome}
        >
          <Text style={styles.buttonText}>Volver al inicio</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        <MaterialIcons name="check-circle" size={80} color="#4CAF50" />
      </View>
      
      <Text style={styles.title}>¡Pago exitoso!</Text>
      <Text style={styles.subtitle}>Gracias por tu compra</Text>
      
      {order && (
        <View style={styles.orderInfo}>
          <Text style={styles.orderNumber}>Pedido #{order.number}</Text>
          <Text style={styles.orderTotal}>Total: ${order.total}</Text>
          <Text style={styles.orderStatus}>
            Estado: {order.status === 'processing' ? 'En proceso' : 
                   order.status === 'completed' ? 'Completado' : 
                   order.status === 'on-hold' ? 'En espera' : 
                   order.status === 'pending' ? 'Pendiente' : order.status}
          </Text>
          
          <View style={styles.productsContainer}>
            <Text style={styles.sectionTitle}>Productos:</Text>
            {order.line_items.map((item: OrderItem) => (
              <View key={item.id} style={styles.productItem}>
                <Text style={styles.productName}>{item.name}</Text>
                <Text style={styles.productDetails}>
                  {item.quantity} x ${parseFloat(item.price).toFixed(2)}
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}
      
      <View style={styles.buttonContainer}>
        <TouchableOpacity 
          style={[styles.button, styles.primaryButton]} 
          onPress={handleBackToHome}
        >
          <Text style={styles.buttonText}>Volver al inicio</Text>
        </TouchableOpacity>
        
        {order && (
          <TouchableOpacity 
            style={[styles.button, styles.secondaryButton]}
            onPress={handleViewOrder}
          >
            <Text style={[styles.buttonText, { color: '#2196F3' }]}>Ver detalles del pedido</Text>
          </TouchableOpacity>
        )}
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
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#d32f2f',
    marginBottom: 24,
    textAlign: 'center',
    paddingHorizontal: 20,
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
    fontSize: 16,
    color: '#666',
    marginBottom: 30,
    textAlign: 'center',
  },
  orderInfo: {
    width: '100%',
    marginBottom: 30,
    padding: 20,
    backgroundColor: '#f9f9f9',
    borderRadius: 10,
  },
  orderNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  orderTotal: {
    fontSize: 16,
    marginBottom: 10,
  },
  orderStatus: {
    fontSize: 16,
    marginBottom: 20,
    color: '#2196F3',
    fontWeight: '500',
  },
  productsContainer: {
    marginTop: 16,
    width: '100%',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
  },
  productItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  productName: {
    flex: 2,
    fontSize: 14,
    color: '#333',
  },
  productDetails: {
    flex: 1,
    fontSize: 14,
    color: '#666',
    textAlign: 'right',
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
    borderColor: '#4CAF50',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
