import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

export default function FloatingCartBtn({ cart, onPress }: { cart: any[]; onPress: () => void }) {
  const totalQty = cart.reduce((a, p) => a + (p.qty || 1), 0);
  return (
    <TouchableOpacity style={styles.fab} onPress={onPress} activeOpacity={0.85}>
      <Text style={styles.icon}>🛒</Text>
      {totalQty > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{totalQty}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    right: 24,
    bottom: 32,
    backgroundColor: '#ffbc4c',
    borderRadius: 32,
    width: 56,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 99,
  },
  icon: {
    fontSize: 28,
    color: '#fff',
    fontWeight: 'bold',
  },
  badge: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: '#e74c3c',
    borderRadius: 10,
    paddingHorizontal: 5,
    paddingVertical: 1,
    minWidth: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: 'bold',
  },
});
