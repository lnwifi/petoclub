import WooCommerceRestApi from '@woocommerce/woocommerce-rest-api';
import { Alert } from 'react-native';

// Configuración básica
const WOOCOMMERCE_URL = 'https://petoclub.com.ar';
const WOOCOMMERCE_KEY = process.env.EXPO_PUBLIC_WOOCOMMERCE_KEY || '';
const WOOCOMMERCE_SECRET = process.env.EXPO_PUBLIC_WOOCOMMERCE_SECRET || '';
const API_VERSION = 'wc/v3';

// Configuración de la API de WooCommerce usando la biblioteca
const WooCommerceAPI = new WooCommerceRestApi({
  url: WOOCOMMERCE_URL,
  consumerKey: WOOCOMMERCE_KEY,
  consumerSecret: WOOCOMMERCE_SECRET,
  version: API_VERSION,
  queryStringAuth: true // Forzar autenticación básica en la URL para evitar problemas CORS
});

// Función alternativa usando fetch directamente para casos donde la biblioteca falla
const fetchFromWooCommerce = async (
  endpoint: string, 
  params: Record<string, any> = {}, 
  method: 'GET' | 'POST' = 'GET',
  body?: any,
  customHeaders?: Record<string, string>
) => {
  try {
    // Construir la URL con autenticación
    const queryParams = new URLSearchParams({
      consumer_key: WOOCOMMERCE_KEY,
      consumer_secret: WOOCOMMERCE_SECRET,
      ...params
    }).toString();
    
    const url = `${WOOCOMMERCE_URL}/wp-json/${API_VERSION}/${endpoint}?${queryParams}`;
    console.log(`${method} request to:`, url);
    
    // Mostrar claves para depuración (solo en desarrollo)
    if (__DEV__) {
      console.log('WooCommerce API Keys:', {
        key: WOOCOMMERCE_KEY ? WOOCOMMERCE_KEY.substring(0, 4) + '...' : 'No configurada',
        secret: WOOCOMMERCE_SECRET ? WOOCOMMERCE_SECRET.substring(0, 4) + '...' : 'No configurada'
      });
    }
    
    if (body && method === 'POST') {
      console.log('Enviando datos:', JSON.stringify(body));
    }
    
    const options: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...(customHeaders || {})
      }
    };
    
    if (body && method === 'POST') {
      options.body = JSON.stringify(body);
    }
    
    const response = await fetch(url, options);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Error en respuesta WooCommerce (${response.status}):`, errorText);
      
      try {
        // Intentar parsear el error como JSON
        const errorJson = JSON.parse(errorText);
        throw new Error(`Error WooCommerce: ${errorJson.message || errorText}`);
      } catch (parseError) {
        throw new Error(`Error WooCommerce (${response.status}): ${errorText}`);
      }
    }
    
    const data = await response.json();
    console.log('Respuesta WooCommerce:', JSON.stringify(data).substring(0, 500) + '...');
    return data;
  } catch (error: any) {
    console.error('Error en fetchFromWooCommerce:', error.message);
    throw error;
  }
};

// Función para verificar la conexión con la API
export const testConnection = async (): Promise<boolean> => {
  try {
    console.log('Verificando conexión con WooCommerce API...');
    console.log('URL:', WOOCOMMERCE_URL);
    console.log('Consumer Key:', WOOCOMMERCE_KEY ? 'Configurada' : 'No configurada');
    console.log('Consumer Secret:', WOOCOMMERCE_SECRET ? 'Configurada' : 'No configurada');
    
    // Intentar obtener productos para verificar la conexión
    try {
      // Primero intentar con la biblioteca
      const response = await WooCommerceAPI.get('products', { per_page: 1 });
      console.log('Conexión exitosa con WooCommerce API (biblioteca)');
      return true;
    } catch (libraryError) {
      console.log('Error con la biblioteca, intentando con fetch directo...');
      // Si falla, intentar con fetch directo
      try {
        await fetchFromWooCommerce('products', { per_page: 1 });
        console.log('Conexión exitosa con WooCommerce API (fetch directo)');
        return true;
      } catch (fetchError) {
        console.error('Error con fetch directo:', fetchError);
        return false;
      }
    }
  } catch (error: any) {
    console.error('Error al conectar con WooCommerce API:', error.message);
    if (error.response) {
      console.error('Detalles del error:', {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data
      });
    }
    return false;
  }
};

// Tipos de datos
export interface Product {
  id: number;
  name: string;
  price: string;
  regular_price: string;
  sale_price: string;
  description: string;
  short_description: string;
  categories: Array<{id: number, name: string}>;
  images: Array<{id: number, src: string}>;
  permalink: string;
  stock_status: string;
  on_sale: boolean;
}

export interface Category {
  id: number;
  name: string;
  slug: string;
  count: number;
}

// Funciones para obtener datos de WooCommerce
export const getProducts = async (
  page = 1, 
  perPage = 10, 
  category?: number, 
  search?: string
): Promise<Product[]> => {
  try {
    const params: Record<string, any> = {
      page,
      per_page: perPage,
    };

    if (category) {
      params.category = category;
    }

    if (search) {
      params.search = search;
    }

    try {
      // Primero intentar con la biblioteca
      const response = await WooCommerceAPI.get('products', params);
      return response.data;
    } catch (libraryError) {
      console.log('Error con la biblioteca al obtener productos, intentando con fetch directo...');
      // Si falla, intentar con fetch directo
      const data = await fetchFromWooCommerce('products', params);
      return data;
    }
  } catch (error: any) {
    console.error('Error al obtener productos:', error.message);
    if (error.response) {
      console.error('Detalles del error:', {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data
      });
    }
    return [];
  }
};

export const getProductById = async (id: number): Promise<Product | null> => {
  try {
    try {
      // Primero intentar con la biblioteca
      const response = await WooCommerceAPI.get(`products/${id}`);
      return response.data;
    } catch (libraryError) {
      console.log(`Error con la biblioteca al obtener producto ${id}, intentando con fetch directo...`);
      // Si falla, intentar con fetch directo
      const data = await fetchFromWooCommerce(`products/${id}`);
      return data;
    }
  } catch (error: any) {
    console.error(`Error al obtener producto con ID ${id}:`, error.message);
    if (error.response) {
      console.error('Detalles del error:', {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data
      });
    }
    return null;
  }
};

export const getCategories = async (): Promise<Category[]> => {
  try {
    try {
      // Primero intentar con la biblioteca
      const response = await WooCommerceAPI.get('products/categories', {
        per_page: 100,
      });
      return response.data;
    } catch (libraryError) {
      console.log('Error con la biblioteca al obtener categorías, intentando con fetch directo...');
      // Si falla, intentar con fetch directo
      const data = await fetchFromWooCommerce('products/categories', { per_page: 100 });
      return data;
    }
  } catch (error: any) {
    console.error('Error al obtener categorías:', error.message);
    if (error.response) {
      console.error('Detalles del error:', {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data
      });
    }
    return [];
  }
};

// Función para aplicar descuento según la membresía del usuario
export const applyMembershipDiscount = (price: string, hasDiscount: boolean, discountPercentage = 10): string => {
  if (!hasDiscount) return price;
  
  const numericPrice = parseFloat(price);
  if (isNaN(numericPrice)) return price;
  
  const discountedPrice = numericPrice * (1 - discountPercentage / 100);
  return discountedPrice.toFixed(2);
};

// Interfaces para la creación de órdenes
export interface OrderLineItem {
  product_id: number;
  quantity: number;
  name?: string;
  price?: string;
}

export interface OrderCustomer {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
}

export interface OrderShipping {
  address_1: string;
  city: string;
  state: string;
  postcode: string;
  country: string;
}

export interface OrderData {
  payment_method: string;
  payment_method_title: string;
  set_paid?: boolean;
  customer_note?: string;
  billing: OrderCustomer & OrderShipping;
  shipping: OrderCustomer & OrderShipping;
  line_items: OrderLineItem[];
  shipping_lines: Array<{
    method_id: string;
    method_title: string;
    total: string;
  }>;
}

// Función para crear una orden en WooCommerce
export const createOrder = async (orderData: OrderData, customHeaders?: Record<string, string>): Promise<any> => {
  try {
    console.log('Iniciando creación de orden en WooCommerce...');
    console.log('Datos de la orden:', JSON.stringify(orderData));
    
    // Asegurarse de que el método de pago esté correctamente configurado para MercadoPago
    if (orderData.payment_method === 'mercadopago') {
      console.log('Método de pago: MercadoPago');
      // Asegurarse de que el método de pago esté correctamente configurado
      orderData.payment_method = 'mercadopago';
      orderData.payment_method_title = 'MercadoPago';
      
      // Añadir campo set_paid a false para que WooCommerce espere el pago
      orderData.set_paid = false;
    }
    
    let response;
    try {
      // Primero intentar con la biblioteca
      console.log('Intentando crear orden con la biblioteca WooCommerce...');
      // Si hay headers personalizados, configurar la instancia de axios
      if (customHeaders) {
        console.log('Usando headers personalizados:', customHeaders);
        // Crear una copia de la configuración de WooCommerceAPI
        const axiosConfig = {
          ...WooCommerceAPI.axiosConfig,
          headers: {
            ...WooCommerceAPI.axiosConfig.headers,
            ...customHeaders
          }
        };
        response = await WooCommerceAPI.post('orders', orderData, axiosConfig);
      } else {
        response = await WooCommerceAPI.post('orders', orderData);
      }
      console.log('Orden creada exitosamente con la biblioteca');
      return response.data;
    } catch (libraryError) {
      console.log('Error con la biblioteca al crear orden:', libraryError);
      console.log('Intentando con fetch directo...');
      
      // Si falla, intentar con fetch directo
      const data = await fetchFromWooCommerce('orders', {}, 'POST', orderData, customHeaders);
      console.log('Orden creada exitosamente con fetch directo');
      return data;
    }
  } catch (error: any) {
    console.error('Error al crear orden:', error.message);
    if (error.response) {
      console.error('Detalles del error:', {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data
      });
    }
    
    // Mostrar alerta al usuario
    Alert.alert(
      'Error al crear pedido',
      'No se pudo procesar tu pedido. Por favor, intenta nuevamente más tarde.',
      [{ text: 'Aceptar' }]
    );
    
    throw error;
  }
};

// Interfaz para el pedido
export interface Order {
  id: number;
  number: string;
  status: string;
  date_created: string;
  total: string;
  payment_method_title: string;
  line_items: Array<{
    id: number;
    name: string;
    product_id: number;
    quantity: number;
    price: string;
    total: string;
    image?: {
      id: number;
      src: string;
    };
  }>;
  shipping: {
    first_name: string;
    last_name: string;
    address_1: string;
    city: string;
    state: string;
    postcode: string;
  };
  payment_url?: string;
}

// Función para obtener los pedidos de un usuario por email
export const getOrdersByEmail = async (email: string): Promise<Order[]> => {
  try {
    try {
      // Primero intentar con la biblioteca
      const response = await WooCommerceAPI.get('orders', {
        customer: email,
        per_page: 20,
      });
      return response.data;
    } catch (libraryError) {
      console.log('Error con la biblioteca al obtener pedidos, intentando con fetch directo...');
      // Si falla, intentar con fetch directo
      const data = await fetchFromWooCommerce('orders', { customer: email, per_page: 20 });
      return data;
    }
  } catch (error: any) {
    console.error('Error al obtener pedidos:', error.message);
    if (error.response) {
      console.error('Detalles del error:', {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data
      });
    }
    return [];
  }
};

// Función para verificar el estado de un pedido
export const getOrderStatus = async (orderId: number): Promise<Order | null> => {
  try {
    try {
      // Primero intentar con la biblioteca
      const response = await WooCommerceAPI.get(`orders/${orderId}`);
      return response.data;
    } catch (libraryError) {
      console.log(`Error con la biblioteca al obtener estado del pedido ${orderId}, intentando con fetch directo...`);
      // Si falla, intentar con fetch directo
      const data = await fetchFromWooCommerce(`orders/${orderId}`);
      return data;
    }
  } catch (error: any) {
    console.error(`Error al obtener estado del pedido ${orderId}:`, error.message);
    if (error.response) {
      console.error('Detalles del error:', {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data
      });
    }
    return null;
  }
};

// Función para configurar un webhook para actualizaciones de pedidos
export const setupOrderWebhook = async (callbackUrl: string): Promise<any> => {
  try {
    // Primero verificar si ya existe un webhook con la misma URL
    let existingWebhooks;
    
    try {
      // Intentar obtener webhooks existentes
      const response = await WooCommerceAPI.get('webhooks');
      existingWebhooks = response.data;
    } catch (error) {
      // Si falla, intentar con fetch directo
      existingWebhooks = await fetchFromWooCommerce('webhooks');
    }
    
    // Verificar si ya existe un webhook con la misma URL
    const existingWebhook = existingWebhooks.find(
      (webhook: any) => webhook.delivery_url === callbackUrl && webhook.topic === 'order.updated'
    );
    
    if (existingWebhook) {
      console.log('El webhook ya existe, no es necesario crearlo nuevamente', existingWebhook);
      return existingWebhook;
    }
    
    // Si no existe, crear uno nuevo
    const webhookData = {
      name: 'Actualización de pedidos en la app',
      topic: 'order.updated',
      delivery_url: callbackUrl,
      status: 'active',
    };
    
    try {
      // Primero intentar con la biblioteca
      const response = await WooCommerceAPI.post('webhooks', webhookData);
      console.log('Webhook creado exitosamente:', response.data);
      return response.data;
    } catch (libraryError) {
      console.log('Error con la biblioteca al crear webhook, intentando con fetch directo...');
      // Si falla, intentar con fetch directo
      const data = await fetchFromWooCommerce('webhooks', {}, 'POST', webhookData);
      console.log('Webhook creado exitosamente con fetch directo:', data);
      return data;
    }
  } catch (error: any) {
    console.error('Error al configurar webhook:', error.message);
    if (error.response) {
      console.error('Detalles del error:', {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data
      });
    }
    throw error;
  }
};
