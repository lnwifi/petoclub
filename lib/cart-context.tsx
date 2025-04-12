import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Product } from './woocommerce';
import { useMembership } from '../hooks/useMembership';
import { applyMembershipDiscount } from './woocommerce';

// Definir el tipo para los items del carrito
export interface CartItem {
  product: Product;
  quantity: number;
}

// Definir el tipo para el contexto del carrito
interface CartContextType {
  items: CartItem[];
  addToCart: (product: Product, quantity: number) => void;
  removeFromCart: (productId: number) => void;
  updateQuantity: (productId: number, quantity: number) => void;
  clearCart: () => void;
  getCartTotal: () => number;
  getCartCount: () => number;
  isInCart: (productId: number) => boolean;
}

// Crear el contexto
const CartContext = createContext<CartContextType | undefined>(undefined);

// Hook personalizado para usar el contexto
export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart debe ser usado dentro de un CartProvider');
  }
  return context;
};

// Proveedor del contexto
export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<CartItem[]>([]);
  const { hasStoreDiscount } = useMembership();
  const isMounted = useRef(true);

  // Cargar carrito desde AsyncStorage al iniciar
  useEffect(() => {
    // Set isMounted ref to true when component mounts
    isMounted.current = true;
    
    const loadCart = async () => {
      try {
        const savedCart = await AsyncStorage.getItem('cart');
        if (savedCart && isMounted.current) {
          setItems(JSON.parse(savedCart));
        }
      } catch (error) {
        console.error('Error al cargar el carrito:', error);
      }
    };

    loadCart();
    
    // Cleanup function to prevent state updates on unmounted component
    return () => {
      isMounted.current = false;
    };
  }, []);

  // Guardar carrito en AsyncStorage cuando cambia
  useEffect(() => {
    const saveCart = async () => {
      try {
        await AsyncStorage.setItem('cart', JSON.stringify(items));
      } catch (error) {
        console.error('Error al guardar el carrito:', error);
      }
    };

    if (isMounted.current) {
      saveCart();
    }
  }, [items]);

  // Añadir producto al carrito
  const addToCart = (product: Product, quantity: number) => {
    if (!isMounted.current) return;
    
    setItems(prevItems => {
      const existingItem = prevItems.find(item => item.product.id === product.id);
      
      if (existingItem) {
        // Si el producto ya está en el carrito, actualizar cantidad
        return prevItems.map(item => 
          item.product.id === product.id 
            ? { ...item, quantity: item.quantity + quantity } 
            : item
        );
      } else {
        // Si el producto no está en el carrito, añadirlo
        return [...prevItems, { product, quantity }];
      }
    });
  };

  // Eliminar producto del carrito
  const removeFromCart = (productId: number) => {
    if (!isMounted.current) return;
    setItems(prevItems => prevItems.filter(item => item.product.id !== productId));
  };

  // Actualizar cantidad de un producto
  const updateQuantity = (productId: number, quantity: number) => {
    if (!isMounted.current) return;
    
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    
    setItems(prevItems => 
      prevItems.map(item => 
        item.product.id === productId 
          ? { ...item, quantity } 
          : item
      )
    );
  };

  // Vaciar carrito
  const clearCart = () => {
    if (!isMounted.current) return;
    setItems([]);
  };

  // Obtener total del carrito
  const getCartTotal = () => {
    return items.reduce((total, item) => {
      const price = hasStoreDiscount() 
        ? applyMembershipDiscount(item.product.price, true) 
        : item.product.price;
      
      return total + (parseFloat(price) * item.quantity);
    }, 0);
  };

  // Obtener número total de productos en el carrito
  const getCartCount = () => {
    return items.reduce((count, item) => count + item.quantity, 0);
  };

  // Verificar si un producto está en el carrito
  const isInCart = (productId: number) => {
    return items.some(item => item.product.id === productId);
  };

  // Valor del contexto
  const value: CartContextType = {
    items,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    getCartTotal,
    getCartCount,
    isInCart
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};
