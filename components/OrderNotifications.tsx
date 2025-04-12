import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuth } from '../lib/auth-context';
import { supabase } from '../lib/supabase';
import { getOrderStatus } from '../lib/woocommerce';

// Interfaz para las notificaciones
interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: string;
  metadata: {
    order_id: number;
    status: string;
  };
  read: boolean;
  created_at: string;
}

export default function OrderNotifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState<any>(null);

  // Cargar notificaciones al iniciar
  useEffect(() => {
    if (user) {
      loadNotifications();
      setupRealtimeSubscription();
    }

    return () => {
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, [user]);

  // Cargar notificaciones
  const loadNotifications = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user?.id)
        .eq('type', 'order_update')
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (error) {
        console.error('Error al cargar notificaciones:', error);
        return;
      }
      
      setNotifications(data || []);
    } catch (error) {
      console.error('Error inesperado:', error);
    } finally {
      setLoading(false);
    }
  };

  // Configurar suscripción en tiempo real
  const setupRealtimeSubscription = () => {
    if (!user) return;
    
    const newSubscription = supabase
      .channel('order-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          // Añadir nueva notificación a la lista
          const newNotification = payload.new as Notification;
          if (newNotification.type === 'order_update') {
            setNotifications((prev) => [newNotification, ...prev]);
            
            // Mostrar alerta
            Alert.alert(
              newNotification.title,
              newNotification.message,
              [
                { text: 'Ver Pedido', onPress: () => handleViewOrder(newNotification) },
                { text: 'Cerrar', style: 'cancel' },
              ]
            );
          }
        }
      )
      .subscribe();
    
    setSubscription(newSubscription);
  };

  // Marcar notificación como leída
  const markAsRead = async (notification: Notification) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notification.id);
      
      if (error) {
        console.error('Error al marcar notificación como leída:', error);
        return;
      }
      
      // Actualizar estado local
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notification.id ? { ...n, read: true } : n
        )
      );
    } catch (error) {
      console.error('Error inesperado:', error);
    }
  };

  // Ver detalles del pedido
  const handleViewOrder = async (notification: Notification) => {
    try {
      // Marcar como leída
      await markAsRead(notification);
      
      // Obtener estado actual del pedido
      const order = await getOrderStatus(notification.metadata.order_id);
      
      if (order) {
        // Navegar a la pantalla de detalles del pedido
        router.push({
          pathname: '/(app)/profile/orders',
          params: { orderId: order.id.toString() }
        } as any);
      } else {
        Alert.alert('Error', 'No se pudo obtener la información del pedido');
      }
    } catch (error) {
      console.error('Error al ver detalles del pedido:', error);
      Alert.alert('Error', 'Ocurrió un error al cargar el pedido');
    }
  };

  // Si no hay notificaciones, no mostrar nada
  if (notifications.length === 0 && !loading) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Actualizaciones de Pedidos</Text>
      
      {notifications.map((notification) => (
        <TouchableOpacity
          key={notification.id}
          style={[
            styles.notification,
            notification.read ? styles.notificationRead : styles.notificationUnread,
          ]}
          onPress={() => handleViewOrder(notification)}
        >
          <View style={styles.iconContainer}>
            <Ionicons
              name="cart"
              size={24}
              color={notification.read ? '#999' : '#ffbc4c'}
            />
          </View>
          <View style={styles.content}>
            <Text style={styles.notificationTitle}>{notification.title}</Text>
            <Text style={styles.notificationMessage}>{notification.message}</Text>
            <Text style={styles.notificationDate}>
              {new Date(notification.created_at).toLocaleDateString('es-AR', {
                day: '2-digit',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#999" />
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
    paddingHorizontal: 16,
  },
  title: {
    fontSize: 18,
    fontFamily: 'Inter_700Bold',
    marginBottom: 12,
  },
  notification: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  notificationUnread: {
    backgroundColor: '#fff9e6',
    borderLeftWidth: 3,
    borderLeftColor: '#ffbc4c',
  },
  notificationRead: {
    backgroundColor: '#f5f5f5',
    borderLeftWidth: 3,
    borderLeftColor: '#ddd',
  },
  iconContainer: {
    marginRight: 12,
  },
  content: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    marginBottom: 4,
  },
  notificationMessage: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: '#666',
    marginBottom: 4,
  },
  notificationDate: {
    fontSize: 10,
    fontFamily: 'Inter_400Regular',
    color: '#999',
  },
});
