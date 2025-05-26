import React from 'react';
import { View, Text, StyleSheet, Image, ScrollView, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

export default function ProductDetail() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const product = params.product ? JSON.parse(decodeURIComponent(params.product as string)) : null;

  if (!product) {
    return <View style={styles.center}><Text>Producto no encontrado</Text></View>;
  }

  return (
    <ScrollView style={styles.container}>
      {/* Flecha para volver atrás */}
      <TouchableOpacity style={styles.backBtn} onPress={() => router.replace('/store')}>
        <Text style={styles.backBtnText}>← Volver a la tienda</Text>
      </TouchableOpacity>
      <Image source={{ uri: product.images?.[0]?.src }} style={styles.image} />
      <Text style={styles.name}>{product.name}</Text>
      <Text style={styles.price}>${product.price}</Text>
      <Text style={styles.description}>{product.description?.replace(/<[^>]+>/g, '')}</Text>
      <TouchableOpacity style={styles.addBtn} onPress={() => router.push(`/cart?add=${product.id}`)}>
        <Text style={styles.addBtnText}>Agregar al carrito</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 16,
  },
  image: {
    width: '100%',
    height: 220,
    borderRadius: 14,
    marginBottom: 16,
    resizeMode: 'contain',
    backgroundColor: '#fafafa',
  },
  name: {
    fontSize: 22,
    fontFamily: 'Inter_700Bold',
    color: '#222',
    marginBottom: 8,
  },
  price: {
    fontSize: 18,
    fontFamily: 'Inter_700Bold',
    color: '#ffbc4c',
    marginBottom: 12,
  },
  description: {
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    color: '#555',
    marginBottom: 18,
  },
  addBtn: {
    backgroundColor: '#ffbc4c',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  addBtnText: {
    color: '#fff',
    fontFamily: 'Inter_700Bold',
    fontSize: 16,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtn: {
    marginBottom: 8,
    alignSelf: 'flex-start',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#f3f3f3',
  },
  backBtnText: {
    fontSize: 16,
    color: '#333',
    fontFamily: 'Inter_500Medium',
  },
});
