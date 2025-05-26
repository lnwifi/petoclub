import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';
import axios from 'axios';
import { useAuth } from '../../lib/auth-context';
import { saveCartToSupabase, getCartFromSupabase } from '../lib/cart-sync';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontFamily: 'Inter_700Bold', // Usar fontFamily si está disponible, si no, se puede cambiar por fontWeight
    marginBottom: 16,
  },
  empty: {
    fontSize: 16,
    color: '#888',
    textAlign: 'center',
    marginTop: 40,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: '#eee',
  },
  image: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: '#fafafa',
  },
  name: {
    fontSize: 16,
    fontFamily: 'Inter_500Medium',
    marginBottom: 2,
    fontWeight: '500', // fallback
  },
  price: {
    fontSize: 15,
    color: '#ffbc4c',
    fontFamily: 'Inter_700Bold',
    marginBottom: 6,
  },
  remove: {
    color: '#ff4c4c',
    fontFamily: 'Inter_700Bold',
    fontSize: 20,
    marginLeft: 8,
    padding: 8, // para mantener compatibilidad
  },
  qtyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2, // preferir el valor más reciente
  },
  qtyBtn: {
    backgroundColor: '#eee',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginHorizontal: 6,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  qtyBtnText: {
    fontSize: 18,
    color: '#333',
    fontFamily: 'Inter_700Bold',
  },
  qty: {
    fontSize: 16,
    fontFamily: 'Inter_500Medium',
    minWidth: 24,
    textAlign: 'center',
    marginHorizontal: 12,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 18,
    marginBottom: 4,
    padding: 16, // para compatibilidad
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  totalText: {
    fontSize: 18,
    fontFamily: 'Inter_700Bold',
    fontWeight: '600', // fallback
  },
  totalAmount: {
    fontSize: 18,
    fontFamily: 'Inter_700Bold',
    color: '#ffbc4c',
    fontWeight: 'bold', // fallback
  },
  checkoutBtn: {
    backgroundColor: '#ffbc4c',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 10,
    padding: 16, // para compatibilidad
    margin: 16, // para compatibilidad
  },
  checkoutBtnText: {
    color: '#fff',
    fontFamily: 'Inter_700Bold',
    fontSize: 17,
    fontWeight: '600', // fallback
  },
});

declare global {
  // eslint-disable-next-line no-var
  var petoclub_cart: string | undefined;
}

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

export default function Cart() {
  const [cart, setCartState] = useState<Array<{
    id: number;
    name: string;
    price: string;
    qty: number;
    images?: Array<{ src: string }>;
  }>>(getCart());
  const router = useRouter();
  const { user } = useAuth();

  // Sincronizar carrito local con Supabase al iniciar sesión
  useEffect(() => {
    async function syncCartFromSupabase() {
      if (user?.id) {
        const remoteCart = await getCartFromSupabase(user.id);
        if (remoteCart && remoteCart.length > 0) {
          setCart(remoteCart);
          setCartState(remoteCart);
        }
      }
    }
    syncCartFromSupabase();
  }, [user?.id]);

  useEffect(() => {
    const update = () => setCartState(getCart());
    window.addEventListener?.('storage', update);
    const focus = () => setCartState(getCart());
    window.addEventListener?.('focus', focus);
    window.addEventListener?.('cartUpdated', update);
    return () => {
      window.removeEventListener?.('storage', update);
      window.removeEventListener?.('focus', focus);
      window.removeEventListener?.('cartUpdated', update);
    };
  }, []);

  // Guardar carrito en Supabase cada vez que cambie
  useEffect(() => {
    if (user?.id) {
      saveCartToSupabase(user.id, cart);
    }
  }, [cart, user?.id]);

  const removeItem = (id: number) => {
    const newCart = cart.filter(p => p.id !== id);
    setCart(newCart);
    setCartState(newCart);
  };

  const changeQty = (id: number, delta: number) => {
    const newCart = cart.map(p => 
      p.id === id ? { ...p, qty: Math.max(1, p.qty + delta) } : p
    );
    setCart(newCart);
    setCartState(newCart);
  };

  const goToCheckout = async () => {
    if (cart.length === 0) {
      Alert.alert('Carrito vacío', 'Agrega productos antes de comprar');
      return;
    }

    try {
      const session = await supabase.auth.getSession();
      const jwt = session.data.session?.access_token;
      if (!jwt) {
        Alert.alert('Error', 'No se pudo obtener el token de sesión.');
        return;
      }

      try {
        const total = cart.reduce((sum, item) => sum + (parseFloat(item.price) * item.qty), 0);
        const itemsDescription = cart.map(item => `${item.name} x${item.qty}`).join(', ');
        const orderId = `order_${Date.now()}`;

        // Primero, crear la orden en WooCommerce
        const orderResponse = await fetch('https://YOUR_WORDPRESS_SITE/wp-json/wc/v3/orders', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${jwt}`
          },
          body: JSON.stringify({
            payment_method: 'mercadopago',
            payment_method_title: 'MercadoPago',
            status: 'pending',
            customer_id: user?.id,
            customer_note: `Pedido creado desde la app - ID: ${orderId}`,
            billing: {
              first_name: user?.user_metadata?.full_name?.split(' ')[0] || 'Cliente',
              last_name: user?.user_metadata?.full_name?.split(' ').slice(1).join(' ') || '',
              email: user?.email || '',
              phone: user?.user_metadata?.phone || '',
              address_1: '',
              city: '',
              state: '',
              postcode: '',
              country: 'AR'
            },
            line_items: cart.map(item => ({
              product_id: item.id,
              name: item.name,
              quantity: item.qty,
              price: parseFloat(item.price),
              subtotal: (parseFloat(item.price) * item.qty).toString(),
              total: (parseFloat(item.price) * item.qty).toString()
            })),
            shipping_lines: [
              {
                method_id: 'flat_rate',
                method_title: 'Envío Estándar',
                total: '0.00'
              }
            ],
            meta_data: [
              {
                key: '_external_reference',
                value: orderId
              },
              {
                key: '_created_via',
                value: 'mobile_app'
              }
            ]
          })
        });
        const orderData = await orderResponse.json();
        if (!orderResponse.ok) {
          throw new Error(orderData.message || 'Error al crear la orden');
        }

        // Ahora crear la preferencia de pago en MercadoPago
        const mpPayload = {
          tipo: 'pedido_tienda',
          order_id: orderData.id.toString(),
          external_reference: orderData.id.toString(),
          title: `Compra en PetoClub - ${itemsDescription}`,
          price: total,
          items: cart.map(item => ({
            id: item.id.toString(),
            title: item.name,
            quantity: item.qty,
            unit_price: parseFloat(item.price),
            currency_id: 'ARS',
          })),
          payer: {
            email: user?.email,
            name: user?.firstName,
            surname: user?.lastName,
          },
          back_urls: {
            success: `${window.location.origin}/payment/success`,
            failure: `${window.location.origin}/payment/failure`,
            pending: `${window.location.origin}/payment/pending`
          },
        };

        try {
          const preferenceResponse = await fetch('https://cbrxgjksefmgtoatkbbs.supabase.co/functions/v1/create_payment_preference', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${jwt}`
            },
            body: JSON.stringify(mpPayload)
          });
          const preferenceText = await preferenceResponse.text();
          console.log('Respuesta de MercadoPago:', preferenceText);
          
          let preferenceData;
          try {
            preferenceData = JSON.parse(preferenceText);
            
            if (!preferenceResponse.ok) {
              throw new Error(preferenceData?.error || 'Error al crear la preferencia de pago');
            }

            // Normalizar el link de pago
            const paymentUrl =
              preferenceData?.init_point ||
              preferenceData?.sandbox_init_point ||
              preferenceData?.initPoint ||
              preferenceData?.sandboxInitPoint ||
              null;

            if (paymentUrl) {
              if (typeof window !== 'undefined' && window.matchMedia('(display-mode: browser)').matches) {
                window.open(paymentUrl, '_blank');
              } else {
                router.push({
                  pathname: '/webview',
                  params: { url: encodeURIComponent(paymentUrl) }
                } as any);
              }
            } else {
              const errorMsg = preferenceData?.error || preferenceData?.message || 'No se pudo obtener el link de pago';
              Alert.alert('Error', errorMsg);
            }
          } catch (e) {
            console.error('Error procesando respuesta de MercadoPago:', e);
            Alert.alert('Error', 'No se pudo procesar la respuesta del servidor de pagos');
          }
        } catch (error) {
          console.error('Error en el proceso de checkout:', error);
          Alert.alert('Error', 'Ocurrió un error al procesar el pago');
        }
      } catch (error) {
        console.error('Error en goToCheckout:', error);
        Alert.alert('Error', 'Ocurrió un error al iniciar el checkout');
      }
    } catch (error) {
      console.error('Error en goToCheckout:', error);
      Alert.alert('Error', 'Ocurrió un error al procesar el pago');
    }
  };

  const cartTotal = cart.reduce((sum, p) => sum + (parseFloat(p.price) * p.qty), 0);

  return (
    <View style={styles.container}>
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
              <TouchableOpacity onPress={() => removeItem(item.id)}>
                <Text style={styles.remove}>✕</Text>
              </TouchableOpacity>
            </View>
          )}
        />
      )}
      <View style={styles.totalRow}>
        <Text style={styles.totalText}>Total:</Text>
        <Text style={styles.totalAmount}>${cartTotal.toFixed(2)}</Text>
      </View>
      <TouchableOpacity style={styles.checkoutBtn} onPress={goToCheckout}>
        <Text style={styles.checkoutBtnText}>Ir a pagar</Text>
      </TouchableOpacity>
    </View>
  );
}

