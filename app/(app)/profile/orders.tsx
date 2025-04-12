import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  ActivityIndicator, 
  Image, 
  Alert,
  RefreshControl,
  Platform,
  SafeAreaView
} from 'react-native';
import { router, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../../lib/auth-context';
import { getOrdersByEmail, getOrderStatus, Order } from '../../../lib/woocommerce';

// Componente para mostrar el estado del pedido con colores
const OrderStatus = ({ status }: { status: string }) => {
  let color = '#666';
  let label = 'Desconocido';
  
  switch (status) {
    case 'pending':
      color = '#f5a623';
      label = 'Pendiente';
      break;
    case 'processing':
      color = '#4a90e2';
      label = 'Procesando';
      break;
    case 'on-hold':
      color = '#9b9b9b';
      label = 'En espera';
      break;
    case 'completed':
      color = '#7ed321';
      label = 'Completado';
      break;
    case 'cancelled':
      color = '#d0021b';
      label = 'Cancelado';
      break;
    case 'refunded':
      color = '#bd10e0';
      label = 'Reembolsado';
      break;
    case 'failed':
      color = '#d0021b';
      label = 'Fallido';
      break;
  }
  
  return (
    <View style={[styles.statusBadge, { backgroundColor: color }]}>
      <Text style={styles.statusText}>{label}</Text>
    </View>
  );
};

// Componente para mostrar un pedido individual
const OrderItem = ({ order, onPress }: { order: Order, onPress: () => void }) => {
  // Formatear fecha
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-AR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };
  
  return (
    <TouchableOpacity style={styles.orderItem} onPress={onPress}>
      <View style={styles.orderHeader}>
        <Text style={styles.orderNumber}>Pedido #{order.number}</Text>
        <OrderStatus status={order.status} />
      </View>
      
      <View style={styles.orderInfo}>
        <Text style={styles.orderDate}>{formatDate(order.date_created)}</Text>
        <Text style={styles.orderTotal}>${order.total}</Text>
      </View>
      
      <View style={styles.orderProducts}>
        {order.line_items.slice(0, 2).map((item) => (
          <View key={item.id} style={styles.productItem}>
            <Text style={styles.productName} numberOfLines={1}>
              {item.name} {item.quantity > 1 ? `(x${item.quantity})` : ''}
            </Text>
            <Text style={styles.productPrice}>${item.total}</Text>
          </View>
        ))}
        
        {order.line_items.length > 2 && (
          <Text style={styles.moreItems}>
            + {order.line_items.length - 2} productos más
          </Text>
        )}
      </View>
      
      <View style={styles.orderFooter}>
        <Text style={styles.paymentMethod}>{order.payment_method_title}</Text>
        <Ionicons name="chevron-forward" size={20} color="#999" />
      </View>
    </TouchableOpacity>
  );
};

// Componente para detalles de un pedido
const OrderDetails = ({ order, onClose }: { order: Order, onClose: () => void }) => {
  const [refreshing, setRefreshing] = useState(false);
  const [currentOrder, setCurrentOrder] = useState<Order>(order);
  
  // Formatear fecha
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-AR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };
  
  // Refrescar estado del pedido
  const refreshOrderStatus = async () => {
    setRefreshing(true);
    try {
      const updatedOrder = await getOrderStatus(order.id);
      if (updatedOrder) {
        setCurrentOrder(updatedOrder);
      }
    } catch (error) {
      console.error('Error al actualizar estado del pedido:', error);
    } finally {
      setRefreshing(false);
    }
  };
  
  // Continuar con el pago si está pendiente
  const continueToPay = () => {
    if (currentOrder.payment_url) {
      router.push({
        pathname: '/webview',
        params: { url: encodeURIComponent(currentOrder.payment_url) }
      } as any);
    } else {
      Alert.alert('Error', 'No se encontró un enlace de pago para este pedido.');
    }
  };
  
  return (
    <View style={styles.detailsContainer}>
      <View style={styles.detailsHeader}>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Ionicons name="close" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.detailsTitle}>Detalles del Pedido</Text>
        <View style={{ width: 24 }} />
      </View>
      
      <View style={styles.detailsContent}>
        <View style={styles.detailsSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Información del Pedido</Text>
            <TouchableOpacity onPress={refreshOrderStatus}>
              <Ionicons name="refresh" size={20} color="#ffbc4c" />
            </TouchableOpacity>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Número:</Text>
            <Text style={styles.infoValue}>#{currentOrder.number}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Fecha:</Text>
            <Text style={styles.infoValue}>{formatDate(currentOrder.date_created)}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Estado:</Text>
            <OrderStatus status={currentOrder.status} />
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Método de pago:</Text>
            <Text style={styles.infoValue}>{currentOrder.payment_method_title}</Text>
          </View>
        </View>
        
        <View style={styles.detailsSection}>
          <Text style={styles.sectionTitle}>Productos</Text>
          
          {currentOrder.line_items.map((item) => (
            <View key={item.id} style={styles.detailsProductItem}>
              <View style={styles.productDetails}>
                <Text style={styles.detailsProductName}>{item.name}</Text>
                <Text style={styles.detailsProductQuantity}>Cantidad: {item.quantity}</Text>
                <Text style={styles.detailsProductPrice}>Precio: ${item.price}</Text>
              </View>
              <Text style={styles.detailsProductTotal}>${item.total}</Text>
            </View>
          ))}
          
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>${currentOrder.total}</Text>
          </View>
        </View>
        
        <View style={styles.detailsSection}>
          <Text style={styles.sectionTitle}>Dirección de Envío</Text>
          
          <Text style={styles.addressText}>
            {currentOrder.shipping.first_name} {currentOrder.shipping.last_name}
          </Text>
          <Text style={styles.addressText}>{currentOrder.shipping.address_1}</Text>
          <Text style={styles.addressText}>
            {currentOrder.shipping.city}, {currentOrder.shipping.state}, {currentOrder.shipping.postcode}
          </Text>
        </View>
        
        {currentOrder.status === 'pending' && currentOrder.payment_url && (
          <TouchableOpacity style={styles.payButton} onPress={continueToPay}>
            <Text style={styles.payButtonText}>Continuar con el Pago</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

export default function OrdersScreen() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  
  // Cargar pedidos
  const loadOrders = async () => {
    if (!user?.email) return;
    
    try {
      const userOrders = await getOrdersByEmail(user.email);
      setOrders(userOrders);
    } catch (error) {
      console.error('Error al cargar pedidos:', error);
      Alert.alert(
        'Error',
        'No se pudieron cargar tus pedidos. Por favor, intenta nuevamente.'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };
  
  // Cargar pedidos al iniciar
  useEffect(() => {
    loadOrders();
  }, [user]);
  
  // Refrescar pedidos
  const handleRefresh = () => {
    setRefreshing(true);
    loadOrders();
  };
  
  // Ver detalles de un pedido
  const handleViewOrder = (order: Order) => {
    setSelectedOrder(order);
  };
  
  // Cerrar detalles
  const handleCloseDetails = () => {
    setSelectedOrder(null);
  };
  
  // Renderizar un pedido
  const renderOrderItem = ({ item }: { item: Order }) => (
    <OrderItem order={item} onPress={() => handleViewOrder(item)} />
  );
  
  // Renderizar contenido vacío
  const renderEmptyContent = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="receipt-outline" size={80} color="#ddd" />
      <Text style={styles.emptyText}>No tienes pedidos</Text>
      <Text style={styles.emptySubtext}>
        Tus pedidos aparecerán aquí cuando realices una compra en la tienda.
      </Text>
      <TouchableOpacity
        style={styles.shopButton}
        onPress={() => router.push('/store' as any)}
      >
        <Text style={styles.shopButtonText}>Ir a la Tienda</Text>
      </TouchableOpacity>
    </View>
  );
  
  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Mis Pedidos',
          headerShown: true,
        }}
      />
      
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#ffbc4c" />
          <Text style={styles.loadingText}>Cargando pedidos...</Text>
        </View>
      ) : (
        <FlatList
          data={orders}
          renderItem={renderOrderItem}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={['#ffbc4c']}
              tintColor="#ffbc4c"
            />
          }
          ListEmptyComponent={renderEmptyContent}
        />
      )}
      
      {selectedOrder && (
        <View style={styles.modalContainer}>
          <OrderDetails order={selectedOrder} onClose={handleCloseDetails} />
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
    fontFamily: 'Inter_500Medium',
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
  },
  orderItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
      web: {
        boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.1)',
      }
    }),
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  orderNumber: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: '#333',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    color: '#fff',
  },
  orderInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  orderDate: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: '#666',
  },
  orderTotal: {
    fontSize: 16,
    fontFamily: 'Inter_700Bold',
    color: '#ffbc4c',
  },
  orderProducts: {
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 12,
    marginBottom: 12,
  },
  productItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  productName: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: '#333',
    flex: 1,
  },
  productPrice: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    color: '#333',
  },
  moreItems: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: '#999',
    marginTop: 4,
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 12,
  },
  paymentMethod: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: '#666',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 18,
    fontFamily: 'Inter_600SemiBold',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  shopButton: {
    backgroundColor: '#ffbc4c',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  shopButtonText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
  },
  modalContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailsContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    width: '90%',
    maxHeight: '90%',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
      web: {
        boxShadow: '0px 4px 8px rgba(0, 0, 0, 0.2)',
      }
    }),
  },
  detailsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  closeButton: {
    padding: 4,
  },
  detailsTitle: {
    fontSize: 18,
    fontFamily: 'Inter_600SemiBold',
    color: '#333',
  },
  detailsContent: {
    padding: 16,
    maxHeight: '80%',
  },
  detailsSection: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: '#333',
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    color: '#666',
  },
  infoValue: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: '#333',
  },
  detailsProductItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  productDetails: {
    flex: 1,
  },
  detailsProductName: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    color: '#333',
    marginBottom: 4,
  },
  detailsProductQuantity: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: '#666',
    marginBottom: 2,
  },
  detailsProductPrice: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: '#666',
  },
  detailsProductTotal: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: '#333',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  totalLabel: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: '#333',
  },
  totalValue: {
    fontSize: 18,
    fontFamily: 'Inter_700Bold',
    color: '#ffbc4c',
  },
  addressText: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: '#333',
    marginBottom: 4,
  },
  payButton: {
    backgroundColor: '#ffbc4c',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  payButtonText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
  },
});
