import axios from 'axios';

// Configura tus credenciales de WooCommerce
const WOO_BASE_URL = 'https://petoclub.com.ar/wp-json/wc/v3';
// Soporte para Expo/React Native: usa globalThis.expo?.env si process.env no funciona
const WOO_CONSUMER_KEY = process.env.EXPO_PUBLIC_WOOCOMMERCE_KEY || (globalThis as any).expo?.env?.EXPO_PUBLIC_WOOCOMMERCE_KEY;
const WOO_CONSUMER_SECRET = process.env.EXPO_PUBLIC_WOOCOMMERCE_SECRET || (globalThis as any).expo?.env?.EXPO_PUBLIC_WOOCOMMERCE_SECRET;

interface WooCartItem {
  id: number;
  name?: string;
  price?: number | string;
  qty?: number;
  quantity?: number;
}

interface WooUser {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
}

interface WooOrderParams {
  cart: WooCartItem[];
  user: WooUser;
}

interface OrderData {
  payment_method: string;
  payment_method_title: string;
  set_paid: boolean;
  billing: {
    first_name: string;
    last_name: string;
    address_1: string;
    address_2: string;
    city: string;
    state: string;
    postcode: string;
    country: string;
    email: string;
    phone: string;
  };
  shipping: {
    first_name: string;
    last_name: string;
    address_1: string;
    address_2: string;
    city: string;
    state: string;
    postcode: string;
    country: string;
  };
  line_items: any[];
  shipping_lines?: any[];
  meta_data?: any[];
}

export async function createWooOrder({ cart, user }: WooOrderParams) {
  // cart: [{ id, name, price, qty }]
  // user: { firstName, lastName, email, phone }
  const line_items = cart.map((item) => ({
    product_id: item.id,
    quantity: item.qty || item.quantity || 1,
  }));

  // Generar email dummy si no hay email
  const billingEmail = user.email && user.email.trim() !== ''
    ? user.email
    : `invitado+${Date.now()}@petoclub.com.ar`;

  // Rellenar campos mínimos requeridos para WooCommerce
  const defaultAddress = {
    address_1: 'Sin dirección',
    address_2: '',
    city: 'Ciudad',
    state: 'BA',
    postcode: '1000',
    country: 'AR',
  };

  const orderData: OrderData = {
    payment_method: 'mercadopago',
    payment_method_title: 'MercadoPago',
    set_paid: false, // El pago se realiza luego en el checkout web
    billing: {
      first_name: user.firstName || 'Invitado',
      last_name: user.lastName || 'App',
      ...defaultAddress,
      email: billingEmail,
      phone: user.phone || '000000000',
    },
    shipping: {
      first_name: user.firstName || 'Invitado',
      last_name: user.lastName || 'App',
      ...defaultAddress,
    },
    line_items,
  };

  // DEBUG: mostrar las credenciales y el payload
  if (!WOO_CONSUMER_KEY || !WOO_CONSUMER_SECRET) {
    throw new Error('Las credenciales de WooCommerce no están definidas.\nKEY: ' + WOO_CONSUMER_KEY + '\nSECRET: ' + WOO_CONSUMER_SECRET + '\nReinicia el servidor de desarrollo y asegúrate de que las variables EXPO_PUBLIC_WOOCOMMERCE_KEY y EXPO_PUBLIC_WOOCOMMERCE_SECRET estén en tu .env');
  }
  console.log('WooCommerce Order Payload:', JSON.stringify(orderData, null, 2));
  console.log('KEY:', WOO_CONSUMER_KEY, 'SECRET:', WOO_CONSUMER_SECRET);

  const url = `${WOO_BASE_URL}/orders?consumer_key=${WOO_CONSUMER_KEY}&consumer_secret=${WOO_CONSUMER_SECRET}`;
  try {
    const response = await axios.post(url, orderData);
    return response.data; // Devuelve el objeto order
  } catch (error: any) {
    if (error.response) {
      throw new Error(`WooCommerce error ${error.response.status}: ${JSON.stringify(error.response.data)}\nPayload: ${JSON.stringify(orderData)}`);
    }
    throw error;
  }
}
