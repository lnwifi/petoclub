/**
 * Integración con MercadoPago para la app móvil
 * Este archivo proporciona funciones para procesar pagos con MercadoPago directamente en la app
 */

import { Platform } from 'react-native';
import { createOrder } from './woocommerce';

// Almacena los IDs de órdenes en proceso para evitar duplicados
const pendingOrderRequests = new Set();

/**
 * Inicializa el SDK de MercadoPago para la app móvil
 * @param {string} publicKey - Clave pública de MercadoPago
 */
export const initMercadoPago = (publicKey) => {
  // Esta función se utilizará cuando se implemente el SDK nativo de MercadoPago
  console.log('Inicializando MercadoPago con clave pública:', publicKey);
  return true;
};

/**
 * Crea una orden en WooCommerce y obtiene una preferencia de pago de MercadoPago
 * @param {Object} orderData - Datos de la orden para WooCommerce
 * @returns {Promise<Object>} - Datos de la preferencia de pago
 */
export const createMercadoPagoOrder = async (orderData) => {
  try {
    // Generar un ID único para esta solicitud basado en los datos del pedido
    const orderRequestId = JSON.stringify({
      email: orderData.billing?.email,
      items: orderData.line_items?.map(item => `${item.product_id}-${item.quantity}`).join(','),
      timestamp: Date.now(),
      sessionToken: orderData.meta_data?.find(m => m.key === 'session_token')?.value || ''
    });

    if (pendingOrderRequests.has(orderRequestId)) {
      console.warn('Se detectó un intento de crear un pedido duplicado. Solicitud ignorada.');
      throw new Error('Ya existe una solicitud de pedido idéntica en proceso. Por favor, espere.');
    }

    const similarRequestExists = Array.from(pendingOrderRequests).some(request => {
      try {
        const requestData = JSON.parse(request);
        return requestData.email === orderData.billing?.email &&
          requestData.items === orderData.line_items?.map(item => `${item.product_id}-${item.quantity}`).join(',');
      } catch (e) {
        return false;
      }
    });
    if (similarRequestExists) {
      console.warn('Se detectó un posible pedido duplicado con datos similares. Solicitud ignorada.');
      throw new Error('Ya existe una solicitud de pedido similar en proceso. Por favor, espere unos momentos.');
    }
    pendingOrderRequests.add(orderRequestId);
    try {
      // Llamar SIEMPRE a la función Edge de Supabase para crear la preferencia de MercadoPago
      const supabaseUrl = 'https://cbrxgjksefmgtoatkbbs.supabase.co/functions/v1/create_payment_preference';
      if (!orderData.id) {
        throw new Error('No se puede crear la preferencia de pago: falta el ID de la orden de WooCommerce (orderData.id)');
      }
      const fetchBody = {
        tipo: 'pedido_tienda',
        order_id: orderData.id,
        external_reference: orderData.id.toString(),
        items: Array.isArray(orderData.line_items) ? orderData.line_items.map(item => ({
          id: item.product_id ? item.product_id.toString() : undefined,
          title: item.name,
          quantity: item.quantity,
          unit_price: parseFloat(item.price || '0'),
          currency_id: 'ARS',
        })) : [],
        payer: {
          email: orderData.billing?.email,
          name: orderData.billing?.first_name,
          surname: orderData.billing?.last_name,
        },
        back_urls: {
          success: 'https://petoclub.com/success',
          failure: 'https://petoclub.com/failure',
          pending: 'https://petoclub.com/pending',
          // Si tienes rutas propias en la app, reemplaza aquí
        },
      };
      const response = await fetch(supabaseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(fetchBody),
      });
      let mpData;
      try {
        mpData = await response.json();
      } catch (e) {
        mpData = { error: 'Respuesta no es JSON', raw: await response.text() };
      }
      // Manejar error explícito
      if (mpData.error) {
        throw new Error(mpData.error);
      }
      // Eliminar la solicitud del conjunto de pendientes una vez procesada
      pendingOrderRequests.delete(orderRequestId);
      // Devolver el formato esperado por el frontend
      return {
        success: true,
        error: null,
        preferenceId: mpData.preference_id,
        orderId: orderData.id,
        status: mpData.status || null,
        initPoint: mpData.init_point,
        sandboxInitPoint: mpData.sandbox_init_point,
        publicKey: mpData.public_key || process.env.EXPO_PUBLIC_MERCADOPAGO_PUBLIC_KEY || '',
      };
    } catch (error) {
      pendingOrderRequests.delete(orderRequestId);
      throw error;
    }
  } catch (error) {
    console.error('Error al crear orden para MercadoPago (Supabase):', error);
    throw error;
  }
};

/**
 * Procesa un pago con MercadoPago en la app
 * @param {Object} paymentData - Datos del pago
 * @returns {Promise<Object>} - Resultado del pago
 */
export const processMercadoPagoPayment = async (paymentData) => {
  try {
    // Esta función se implementará cuando se integre el SDK nativo de MercadoPago
    // Por ahora, devolvemos un objeto simulado
    return {
      success: true,
      paymentId: 'mp_' + Date.now(),
      status: 'approved',
      message: 'Pago procesado correctamente'
    };
  } catch (error) {
    console.error('Error al procesar pago con MercadoPago:', error);
    throw error;
  }
};

/**
 * Verifica el estado de un pago en MercadoPago
 * @param {string} paymentId - ID del pago en MercadoPago
 * @returns {Promise<Object>} - Estado del pago
 */
export const checkMercadoPagoPaymentStatus = async (paymentId) => {
  try {
    // Esta función se implementará para verificar el estado de un pago
    // Por ahora, devolvemos un objeto simulado
    return {
      success: true,
      status: 'approved',
      message: 'Pago aprobado'
    };
  } catch (error) {
    console.error('Error al verificar estado del pago:', error);
    throw error;
  }
};

export default {
  initMercadoPago,
  createMercadoPagoOrder,
  processMercadoPagoPayment,
  checkMercadoPagoPaymentStatus
};