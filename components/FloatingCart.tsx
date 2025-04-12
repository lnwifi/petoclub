import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Animated, 
  Dimensions, 
  Modal,
  FlatList,
  Image,
  Alert,
  Platform
} from 'react-native';
import { router, usePathname } from 'expo-router';
import { ShoppingCart, X, Minus, Plus, Trash2 } from 'lucide-react-native';
import { useCart } from '../lib/cart-context';
import { useMembership } from '../hooks/useMembership';
import { applyMembershipDiscount } from '../lib/woocommerce';

const { width } = Dimensions.get('window');

const FloatingCart = () => {
  const { 
    items, 
    getCartTotal, 
    getCartCount, 
    updateQuantity, 
    removeFromCart, 
    clearCart 
  } = useCart();
  const { hasStoreDiscount } = useMembership();
  
  const [modalVisible, setModalVisible] = useState(false);
  const [animation] = useState(new Animated.Value(0));
  const pathname = usePathname();
  const isMounted = useRef(true);
  
  // Solo mostrar el carrito en la página de tienda
  const isStorePage = pathname === '/store';
  
  // Cleanup on unmount
  useEffect(() => {
    isMounted.current = true;
    
    return () => {
      isMounted.current = false;
    };
  }, []);
  
  // Animar entrada del carrito cuando hay items
  useEffect(() => {
    if (!isMounted.current) return;
    
    if (items.length > 0 && isStorePage) {
      Animated.spring(animation, {
        toValue: 1,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(animation, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [items.length, isStorePage]);
  
  // Transformaciones para la animación
  const translateY = animation.interpolate({
    inputRange: [0, 1],
    outputRange: [100, 0],
  });
  
  const opacity = animation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });
  
  // Formatear precio
  const formatPrice = (price: number) => {
    return `$${price.toFixed(2)}`;
  };
  
  // Procesar compra
  const handleCheckout = () => {
    if (!isMounted.current) return;
    
    // Navegar a la página de checkout
    router.push('/checkout');
    
    // Cerrar modal
    if (isMounted.current) {
      setModalVisible(false);
    }
  };
  
  // Si no hay items o no estamos en la página de tienda, no mostrar el carrito
  if (items.length === 0 || !isStorePage) {
    return null;
  }
  
  return (
    <>
      <Animated.View 
        style={[
          styles.floatingCart,
          { transform: [{ translateY }], opacity }
        ]}
      >
        <TouchableOpacity 
          style={styles.cartButton}
          onPress={() => {
            if (isMounted.current) {
              setModalVisible(true);
            }
          }}
        >
          <ShoppingCart size={24} color="#fff" />
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{getCartCount()}</Text>
          </View>
          <Text style={styles.cartTotal}>{formatPrice(getCartTotal())}</Text>
        </TouchableOpacity>
      </Animated.View>
      
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => {
          if (isMounted.current) {
            setModalVisible(false);
          }
        }}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Mi Carrito</Text>
              <TouchableOpacity onPress={() => {
                if (isMounted.current) {
                  setModalVisible(false);
                }
              }}>
                <X size={24} color="#333" />
              </TouchableOpacity>
            </View>
            
            {items.length > 0 ? (
              <>
                <FlatList
                  data={items}
                  keyExtractor={(item) => item.product.id.toString()}
                  renderItem={({ item }) => {
                    const price = hasStoreDiscount() 
                      ? applyMembershipDiscount(item.product.price, true) 
                      : item.product.price;
                    
                    return (
                      <View style={styles.cartItem}>
                        <Image 
                          source={{ 
                            uri: item.product.images && item.product.images.length > 0 
                              ? item.product.images[0].src 
                              : 'https://via.placeholder.com/60' 
                          }} 
                          style={styles.productImage} 
                        />
                        
                        <View style={styles.productInfo}>
                          <Text style={styles.productName} numberOfLines={2}>
                            {item.product.name}
                          </Text>
                          <Text style={styles.productPrice}>
                            {formatPrice(parseFloat(price))}
                          </Text>
                        </View>
                        
                        <View style={styles.quantityContainer}>
                          <TouchableOpacity 
                            style={styles.quantityButton}
                            onPress={() => updateQuantity(item.product.id, item.quantity - 1)}
                          >
                            <Minus size={16} color="#666" />
                          </TouchableOpacity>
                          
                          <Text style={styles.quantity}>{item.quantity}</Text>
                          
                          <TouchableOpacity 
                            style={styles.quantityButton}
                            onPress={() => updateQuantity(item.product.id, item.quantity + 1)}
                          >
                            <Plus size={16} color="#666" />
                          </TouchableOpacity>
                        </View>
                        
                        <TouchableOpacity 
                          style={styles.removeButton}
                          onPress={() => removeFromCart(item.product.id)}
                        >
                          <Trash2 size={18} color="#ff4c4c" />
                        </TouchableOpacity>
                      </View>
                    );
                  }}
                  style={styles.cartList}
                />
                
                <View style={styles.cartFooter}>
                  <View style={styles.cartTotalContainer}>
                    <Text style={styles.cartTotalLabel}>Total:</Text>
                    <Text style={styles.cartTotalValue}>
                      {formatPrice(getCartTotal())}
                    </Text>
                  </View>
                  
                  <View style={styles.cartActions}>
                    <TouchableOpacity 
                      style={styles.clearButton}
                      onPress={() => {
                        Alert.alert(
                          "Vaciar carrito",
                          "¿Estás seguro de que deseas vaciar el carrito?",
                          [
                            {
                              text: "Cancelar",
                              style: "cancel"
                            },
                            { 
                              text: "Vaciar", 
                              onPress: () => clearCart(),
                              style: "destructive"
                            }
                          ]
                        );
                      }}
                    >
                      <Text style={styles.clearButtonText}>Vaciar</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                      style={styles.checkoutButton}
                      onPress={handleCheckout}
                    >
                      <Text style={styles.checkoutButtonText}>Finalizar Compra</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </>
            ) : (
              <View style={styles.emptyCartContainer}>
                <ShoppingCart size={60} color="#ccc" />
                <Text style={styles.emptyCartText}>Tu carrito está vacío</Text>
                <TouchableOpacity 
                  style={styles.continueShopping}
                  onPress={() => {
                    if (isMounted.current) {
                      setModalVisible(false);
                      router.push('/store');
                    }
                  }}
                >
                  <Text style={styles.continueShoppingText}>Continuar Comprando</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  floatingCart: {
    position: 'absolute',
    bottom: 80, // Por encima del menú inferior
    alignSelf: 'center',
    zIndex: 999,
  },
  cartButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffbc4c',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 30,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
      },
      android: {
        elevation: 5,
      },
      web: {
        boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.2)',
      }
    }),
  },
  badge: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#ff4c4c',
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontFamily: 'Inter_700Bold',
  },
  cartTotal: {
    color: '#fff',
    marginLeft: 10,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 16,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: 'Inter_600SemiBold',
  },
  cartList: {
    maxHeight: '60%',
  },
  cartItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  productImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 15,
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    marginBottom: 5,
  },
  productPrice: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: '#ffbc4c',
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 15,
  },
  quantityButton: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantity: {
    marginHorizontal: 10,
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
  },
  removeButton: {
    padding: 5,
  },
  cartFooter: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  cartTotalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  cartTotalLabel: {
    fontSize: 16,
    fontFamily: 'Inter_500Medium',
  },
  cartTotalValue: {
    fontSize: 20,
    fontFamily: 'Inter_700Bold',
    color: '#ffbc4c',
  },
  cartActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  clearButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ccc',
    marginRight: 10,
  },
  clearButtonText: {
    color: '#666',
    fontFamily: 'Inter_500Medium',
  },
  checkoutButton: {
    flex: 1,
    backgroundColor: '#ffbc4c',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  checkoutButtonText: {
    color: '#fff',
    fontFamily: 'Inter_600SemiBold',
    fontSize: 16,
  },
  emptyCartContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyCartText: {
    fontSize: 16,
    fontFamily: 'Inter_500Medium',
    color: '#666',
    marginTop: 20,
    marginBottom: 30,
  },
  continueShopping: {
    backgroundColor: '#ffbc4c',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  continueShoppingText: {
    color: '#fff',
    fontFamily: 'Inter_600SemiBold',
  },
});

export default FloatingCart;
