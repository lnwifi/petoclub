import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, FlatList, Image, TouchableOpacity, ActivityIndicator, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import CartModal from '../components/CartModal';

const BASE_URL = 'https://petoclub.com.ar/wp-json/wc/v3';
const CONSUMER_KEY = process.env.EXPO_PUBLIC_WOOCOMMERCE_KEY;
const CONSUMER_SECRET = process.env.EXPO_PUBLIC_WOOCOMMERCE_SECRET;

function getAuthParams() {
  return `consumer_key=${CONSUMER_KEY}&consumer_secret=${CONSUMER_SECRET}`;
}

declare global {
  // eslint-disable-next-line no-var
  var petoclub_cart: string | undefined;
}

const CART_KEY = 'petoclub_cart';

function setCart(cart: any[]) {
  try {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
  } catch (e) {
    // fallback para React Native sin localStorage
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

export default function Store() {
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [cart, setCartState] = useState<any[]>(getCart());
  const [qtyState, setQtyState] = useState<{[id: string]: number}>({});
  const [search, setSearch] = useState('');
  const router = useRouter();
  const [cartModalVisible, setCartModalVisible] = useState(false);

  useEffect(() => {
    fetchCategories();
    fetchProducts();
  }, []);

  const fetchCategories = async () => {
    try {
      const res = await fetch(`${BASE_URL}/products/categories?${getAuthParams()}&per_page=30`);
      const data = await res.json();
      // Mostrar solo categorías principales (parent === 0) y con productos
      setCategories(data.filter((cat: any) => cat.parent === 0 && cat.count > 0));
    } catch (e) {
      setCategories([]);
    }
  };

  const fetchProducts = async (categoryId?: number) => {
    setLoading(true);
    try {
      let url = `${BASE_URL}/products?${getAuthParams()}&per_page=20`;
      if (categoryId) url += `&category=${categoryId}`;
      const res = await fetch(url);
      const data = await res.json();
      setProducts(data);
      // Inicializa qtyState con 1 para cada producto
      const qtys: {[id: string]: number} = {};
      data.forEach((p: any) => {
        qtys[p.id] = 1;
      });
      setQtyState(qtys);
    } catch (e) {
      setProducts([]);
    }
    setLoading(false);
  };

  const handleCategoryPress = (catId: number) => {
    setSelectedCategory(catId);
    fetchProducts(catId);
  };

  const addToCart = (product: any, qty: number) => {
    const exists = cart.find((p: any) => p.id === product.id);
    let newCart;
    if (exists) {
      newCart = cart.map((p: any) => p.id === product.id ? { ...p, qty: Math.min(p.qty + qty, parseInt(product.stock_quantity || '99')) } : p);
    } else {
      newCart = [...cart, { ...product, qty: qty }];
    }
    setCart(newCart);
    setCartState([...newCart]);
    // Notifica a otras pantallas que el carrito fue actualizado
    if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
      window.dispatchEvent(new Event('cartUpdated'));
    }
  };

  const changeQty = (id: number, delta: number, stock: number) => {
    setQtyState(prev => {
      const newQty = Math.max(1, Math.min((prev[id] || 1) + delta, stock));
      return { ...prev, [id]: newQty };
    });
  };

  const goToProduct = (product: any) => {
    router.push({
      pathname: '/productDetail',
      params: { product: encodeURIComponent(JSON.stringify(product)) },
    });
  };

  const openCartModal = () => setCartModalVisible(true);
  const closeCartModal = () => setCartModalVisible(false);

  // Filtrado de productos por búsqueda
  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginHorizontal: 16 }}>
        <Text style={styles.title}>Encontrá lo mejor para tu mascota!</Text>
        <TouchableOpacity onPress={openCartModal} style={{ padding: 6 }}>
          <Text style={{ fontSize: 18, color: '#ffbc4c', fontFamily: 'Inter_700Bold' }}>🛒 {cart.length > 0 ? `(${cart.reduce((a, p) => a + p.qty, 0)})` : ''}</Text>
        </TouchableOpacity>
      </View>
      <CartModal visible={cartModalVisible} onClose={closeCartModal} />
      {/* Buscador */}
      <View style={{ marginHorizontal: 16, marginBottom: 8 }}>
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Buscar productos..."
          style={{ backgroundColor: '#fff', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, fontSize: 16, borderWidth: 1, borderColor: '#eee' }}
          autoCorrect={false}
          autoCapitalize="none"
        />
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8, marginLeft: 4 }}>
        <FlatList
          data={categories}
          horizontal
          keyExtractor={item => String(item.id)}
          showsHorizontalScrollIndicator={false}
          style={{ maxHeight: 80 }}
          contentContainerStyle={{ alignItems: 'center', paddingVertical: 4, paddingRight: 12 }}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.categoryBtn,
                selectedCategory === item.id && styles.categoryBtnSelected,
                { flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minWidth: 74, minHeight: 72, marginRight: 8 }
              ]}
              onPress={() => handleCategoryPress(item.id)}
              activeOpacity={0.85}
            >
              {item.image && item.image.src ? (
                <Image source={{ uri: item.image.src }} style={[styles.categoryImgCircle, { tintColor: '#fff' }]} />
              ) : (
                <View style={styles.categoryImgPlaceholder}><Text style={{ color: '#fff', fontSize: 22 }}>🐾</Text></View>
              )}
              <Text style={styles.categoryTextCenter} numberOfLines={2}>{item.name}</Text>
            </TouchableOpacity>
          )}
        />
      </View>
      {loading ? (
        <ActivityIndicator size="large" color="#ffbc4c" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={filteredProducts}
          keyExtractor={item => String(item.id)}
          numColumns={2}
          contentContainerStyle={{ paddingHorizontal: 8 }}
          renderItem={({ item }) => {
            const stock = parseInt(item.stock_quantity) || 0;
            const qty = qtyState[item.id] || 1;
            return (
              <View style={styles.productCard}>
                <TouchableOpacity onPress={() => goToProduct(item)} style={{ flex: 1, width: '100%' }}>
                  <Image source={{ uri: item.images?.[0]?.src }} style={styles.productImage} />
                  <Text style={styles.productName}>{item.name}</Text>
                  <Text style={styles.productPrice}>${item.price}</Text>
                  <Text style={styles.stock}>Stock: {stock}</Text>
                </TouchableOpacity>
                <View style={[styles.qtyRow, { flexWrap: 'wrap', justifyContent: 'center' }]}>
                  <TouchableOpacity style={styles.qtyBtn} onPress={() => changeQty(item.id, -1, stock)} disabled={qty <= 1 || stock === 0}>
                    <Text style={styles.qtyBtnText}>-</Text>
                  </TouchableOpacity>
                  <Text style={styles.qty}>{qty}</Text>
                  <TouchableOpacity style={styles.qtyBtn} onPress={() => changeQty(item.id, 1, stock)} disabled={qty >= stock || stock === 0}>
                    <Text style={styles.qtyBtnText}>+</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.addBtn,
                      stock === 0 && styles.outOfStockBtn,
                      { minWidth: 90, marginTop: 4 }
                    ]}
                    onPress={() => stock > 0 && addToCart(item, qty)}
                    disabled={stock === 0}
                  >
                    <Text style={[
                      styles.addBtnText,
                      stock === 0 && styles.outOfStockBtnText
                    ]}>
                      {stock === 0 ? 'Sin stock' : 'Agregar'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontFamily: 'Inter_700Bold',
    marginTop: 20,
    marginBottom: 8,
  },
  categoryBtn: {
    backgroundColor: '#fff',
    borderRadius: 18,
    paddingHorizontal: 4,
    paddingVertical: 6,
    marginHorizontal: 0,
    borderWidth: 1,
    borderColor: '#eee',
    minHeight: 60,
    minWidth: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryBtnSelected: {
    backgroundColor: '#ffbc4c22',
    borderColor: '#ffbc4c',
    shadowColor: '#ffbc4c',
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  categoryTextCenter: {
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
    color: '#333',
    marginTop: 3,
    textAlign: 'center',
    maxWidth: 70,
  },
  categoryImgCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#ffbc4c', // amarillo institucional
    marginBottom: 2,
    resizeMode: 'cover',
    borderWidth: 1.5,
    borderColor: '#fff',
  },
  categoryImgPlaceholder: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#ffbc4c', // amarillo institucional
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
    borderWidth: 1.5,
    borderColor: '#fff',
  },
  productCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 14,
    margin: 8,
    padding: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
    minWidth: 160,
    maxWidth: '48%',
  },
  productImage: {
    width: 90,
    height: 90,
    resizeMode: 'contain',
    marginBottom: 8,
  },
  productName: {
    fontSize: 15,
    fontFamily: 'Inter_500Medium',
    color: '#222',
    textAlign: 'center',
    marginBottom: 4,
  },
  productPrice: {
    fontSize: 16,
    fontFamily: 'Inter_700Bold',
    color: '#ffbc4c',
    marginBottom: 8,
    textAlign: 'center',
  },
  stock: {
    fontSize: 13,
    color: '#888',
    marginBottom: 6,
    textAlign: 'center',
  },
  qtyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  qtyBtn: {
    backgroundColor: '#eee',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginHorizontal: 6,
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
  },
  addBtn: {
    backgroundColor: '#ffbc4c',
    borderRadius: 8,
    paddingHorizontal: 18,
    paddingVertical: 6,
    marginTop: 2,
    alignSelf: 'stretch',
    marginHorizontal: 0,
  },
  addBtnText: {
    color: '#fff',
    fontFamily: 'Inter_700Bold',
    fontSize: 15,
    textAlign: 'center',
  },
  outOfStockBtn: {
    backgroundColor: '#eee',
    borderColor: '#ccc',
    borderWidth: 1,
  },
  outOfStockBtnText: {
    color: '#aaa',
    fontWeight: 'bold',
  },
});
