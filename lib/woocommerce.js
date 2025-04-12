import axios from 'axios';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

// Get WooCommerce API credentials from environment variables
const consumerKey = Constants.expoConfig?.extra?.woocommerceKey || process.env.EXPO_PUBLIC_WOOCOMMERCE_KEY;
const consumerSecret = Constants.expoConfig?.extra?.woocommerceSecret || process.env.EXPO_PUBLIC_WOOCOMMERCE_SECRET;

// Base URL for the WooCommerce site
const baseUrl = 'https://petoclub.com.ar/wp-json/wc/v3';

// Create the API instance
const api = axios.create({
  baseURL: baseUrl,
  params: {
    consumer_key: consumerKey,
    consumer_secret: consumerSecret,
  },
});

// Product interface
export class Product {
  constructor(data) {
    this.id = data.id;
    this.name = data.name;
    this.price = data.price;
    this.regular_price = data.regular_price;
    this.sale_price = data.sale_price;
    this.on_sale = data.on_sale;
    this.description = data.description;
    this.short_description = data.short_description;
    this.images = data.images || [];
    this.categories = data.categories || [];
    this.stock_status = data.stock_status;
    this.stock_quantity = data.stock_quantity;
    this.attributes = data.attributes || [];
    this.variations = data.variations || [];
  }
}

// Get all products with pagination
export const getProducts = async (page = 1, perPage = 10, category = null) => {
  try {
    const params = {
      page,
      per_page: perPage,
      status: 'publish',
    };

    // Add category filter if provided
    if (category) {
      params.category = category;
    }

    const response = await api.get('/products', { params });
    return {
      products: response.data.map(product => new Product(product)),
      totalPages: parseInt(response.headers['x-wp-totalpages'] || '1', 10),
      total: parseInt(response.headers['x-wp-total'] || '0', 10),
    };
  } catch (error) {
    console.error('Error fetching products:', error);
    throw error;
  }
};

// Get a single product by ID
export const getProduct = async (productId) => {
  try {
    const response = await api.get(`/products/${productId}`);
    return new Product(response.data);
  } catch (error) {
    console.error(`Error fetching product ${productId}:`, error);
    throw error;
  }
};

// Get all product categories
export const getCategories = async () => {
  try {
    const response = await api.get('/products/categories', {
      params: {
        per_page: 100,
      },
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching categories:', error);
    throw error;
  }
};

// Search products
export const searchProducts = async (searchTerm, page = 1, perPage = 10) => {
  try {
    const response = await api.get('/products', {
      params: {
        search: searchTerm,
        page,
        per_page: perPage,
        status: 'publish',
      },
    });
    return {
      products: response.data.map(product => new Product(product)),
      totalPages: parseInt(response.headers['x-wp-totalpages'] || '1', 10),
      total: parseInt(response.headers['x-wp-total'] || '0', 10),
    };
  } catch (error) {
    console.error('Error searching products:', error);
    throw error;
  }
};

// Apply membership discount to product price
export const applyMembershipDiscount = (price, isPremium = false) => {
  if (!isPremium || !price) return price;
  
  // Apply 10% discount for premium members
  const discountRate = 0.10;
  const numericPrice = parseFloat(price);
  const discountedPrice = numericPrice - (numericPrice * discountRate);
  
  return discountedPrice.toFixed(2);
};

// Create an order (checkout)
export const createOrder = async (orderData, customHeaders = {}) => {
  try {
    // Añadir User-Agent personalizado para identificar solicitudes desde la app (solo en entornos nativos)
    let headers = {...customHeaders};
    
    // Solo agregar User-Agent en entornos nativos, no en web (donde causa errores)
    // Los navegadores web no permiten modificar este encabezado por seguridad
    if (Platform.OS !== 'web') {
      headers['User-Agent'] = customHeaders['User-Agent'] || 'PetoClub-App';
    }

    const response = await api.post('/orders', orderData, { headers });
    return response.data;
  } catch (error) {
    console.error('Error creating order:', error);
    throw error;
  }
};

// Verificar estado de un pedido
export const getOrderStatus = async (orderId) => {
  try {
    const response = await api.get(`/orders/${orderId}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching order ${orderId}:`, error);
    throw error;
  }
};

export default {
  getProducts,
  getProduct,
  getCategories,
  searchProducts,
  applyMembershipDiscount,
  createOrder,
};
