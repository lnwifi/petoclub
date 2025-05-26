import { fetchFromWooCommerce } from './woocommerce';

// Valida un cupón en WooCommerce	export async function validateCoupon(code: string) {
  const coupons = await fetchFromWooCommerce('coupons', { code });
  if (Array.isArray(coupons) && coupons.length > 0) {
    return coupons[0];
  }
  throw new Error('Cupón no válido');
}

// Obtiene los métodos de envío y calcula el costo según la dirección del usuario
export async function getShippingMethods({ country, state, postcode, city, items }: {
  country: string;
  state: string;
  postcode: string;
  city: string;
  items: Array<{ product_id: number; quantity: number }>;
}) {
  // WooCommerce REST API no expone directamente el cálculo de envío, pero puedes usar un endpoint custom o plugin.
  // Aquí se muestra un ejemplo genérico que deberás adaptar si tienes un endpoint personalizado en tu backend.
  const response = await fetchFromWooCommerce('shipping/zones', {});
  // Aquí deberías buscar la zona correspondiente por país, estado, código postal...
  // Luego consultar los métodos de esa zona. Esto es un ejemplo base.
  return response;
}
