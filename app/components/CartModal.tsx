import React, { useEffect, useState } from 'react';
import { Modal, View, Text, StyleSheet, FlatList, Image, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';
import { saveCartToSupabase, getCartFromSupabase } from '../lib/cart-sync';

const CART_KEY = 'petoclub_cart';

function setCart(cart: any[]) {
  try {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
  } catch (e) {
    globalThis[CART_KEY] = JSON.stringify(cart);
  }
}

function getCart() {
  try {
    const cart = localStorage.getItem(CART_KEY);
    return cart ? JSON.parse(cart) : [];
  } catch (e) {
    if (globalThis[CART_KEY]) {
      return JSON.parse(globalThis[CART_KEY]!);
    }
    return [];
  }
}

export default function CartModal({ visible, onClose }: { visible: boolean, onClose: () => void }) {
  const [cart, setCartState] = useState<any[]>(getCart());
  const router = useRouter();

  // Obtener usuario Supabase desde contexto global (si existe)
  // Si usas useAuth, reemplaza aquí:
  // const { user } = useAuth();
  const [userId, setUserId] = useState<string | null>(null);
  useEffect(() => {
    async function getUserId() {
      const session = await supabase.auth.getSession();
      setUserId(session.data.session?.user?.id || null);
    }
    getUserId();
  }, []);

  useEffect(() => {
    if (visible) {
      setCartState(getCart());
    }
    const update = () => setCartState(getCart());
    window.addEventListener?.('storage', update);
    window.addEventListener?.('cartUpdated', update);
    return () => {
      window.removeEventListener?.('storage', update);
      window.removeEventListener?.('cartUpdated', update);
    };
  }, [visible]);

  // Sincronizar carrito local con Supabase al abrir modal
  useEffect(() => {
    async function syncCartFromSupabase() {
      if (visible && userId) {
        const remoteCart = await getCartFromSupabase(userId);
        if (remoteCart && remoteCart.length > 0) {
          setCart(remoteCart);
          setCartState(remoteCart);
        }
      }
    }
    syncCartFromSupabase();
  }, [visible, userId]);

  // Guardar carrito en Supabase cada vez que cambie
  useEffect(() => {
    if (userId) {
      saveCartToSupabase(userId, cart);
    }
  }, [cart, userId]);

  const removeItem = (id: number) => {
    const newCart = cart.filter((p: any) => p.id !== id);
    setCart(newCart);
    setCartState(newCart);
  };

  const changeQty = (id: number, delta: number) => {
    let newCart = cart.map((p: any) => p.id === id ? { ...p, qty: Math.max(1, p.qty + delta) } : p);
    setCart(newCart);
    setCartState(newCart);
  };

  const goToCheckout = () => {
  if (cart.length === 0) {
    Alert.alert('Carrito vacío', 'Agrega productos antes de comprar');
    return;
  }
  // Navegar al flujo de checkout in-app
  router.push('/checkout');
  onClose();
};

  const total = cart.reduce((sum, p) => sum + (parseFloat(p.price) * p.qty), 0);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <Text style={styles.title}>Carrito</Text>
          {cart.length === 0 ? (
            <Text style={styles.empty}>Tu carrito está vacío</Text>
          ) : (
            <FlatList
              data={cart}
              keyExtractor={item => String(item.id)}
              renderItem={({ item }) => (
                <View style={styles.item}>
                  <Image source={{ uri: item.images?.[0]?.src }} style={styles.image} />
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.name}>{item.name}</Text>
                    <Text style={styles.price}>${item.price}</Text>
                    <View style={styles.qtyRow}>
                      <TouchableOpacity style={styles.qtyBtn} onPress={() => changeQty(item.id, -1)}>
                        <Text style={styles.qtyBtnText}>-</Text>
                      </TouchableOpacity>
                      <Text style={styles.qty}>{item.qty}</Text>
                      <TouchableOpacity style={styles.qtyBtn} onPress={() => changeQty(item.id, 1)}>
                        <Text style={styles.qtyBtnText}>+</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                  <TouchableOpacity style={styles.removeBtn} onPress={() => removeItem(item.id)}>
                    <Text style={styles.removeBtnText}>✕</Text>
                  </TouchableOpacity>
                </View>
              )}
            />
          )}
          <View style={styles.footer}>
            <Text style={styles.total}>Total: ${total.toFixed(2)}</Text>
            <TouchableOpacity style={styles.checkoutBtn} onPress={goToCheckout}>
  <Text style={styles.checkoutBtnText}>Ir a pagar</Text>
</TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeBtnText}>Cerrar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modal: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    minHeight: 400,
    maxHeight: '80%',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 14,
    textAlign: 'center',
  },
  empty: {
    textAlign: 'center',
    color: '#888',
    marginVertical: 20,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  image: {
    width: 54,
    height: 54,
    borderRadius: 10,
    backgroundColor: '#eee',
  },
  name: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 2,
  },
  price: {
    fontSize: 15,
    color: '#555',
    marginBottom: 3,
  },
  qtyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  qtyBtn: {
    backgroundColor: '#ffbc4c',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginHorizontal: 4,
  },
  qtyBtnText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: 'bold',
  },
  qty: {
    fontSize: 16,
    minWidth: 24,
    textAlign: 'center',
  },
  removeBtn: {
    marginLeft: 10,
    padding: 4,
  },
  removeBtnText: {
    fontSize: 20,
    color: '#e74c3c',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 18,
  },
  total: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  checkoutBtn: {
    backgroundColor: '#ffbc4c',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 22,
  },
  checkoutBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  closeBtn: {
    marginTop: 18,
    alignSelf: 'center',
  },
  closeBtnText: {
    color: '#555',
    fontSize: 16,
  },
});
