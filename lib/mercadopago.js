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
      timestamp: Date.now(), // Incluir timestamp para diferenciar solicitudes muy cercanas
      sessionToken: orderData.meta_data?.find(m => m.key === 'session_token')?.value || ''
    });
    
    // Verificar si ya hay una solicitud idéntica en proceso
    if (pendingOrderRequests.has(orderRequestId)) {
      console.warn('Se detectó un intento de crear un pedido duplicado. Solicitud ignorada.');
      throw new Error('Ya existe una solicitud de pedido idéntica en proceso. Por favor, espere.');
    }
    
    // Verificar si hay solicitudes similares (mismo email y productos) en proceso
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
    
    // Marcar esta solicitud como en proceso
    pendingOrderRequests.add(orderRequestId);
    
    try {
      // Asegurarse de que el User-Agent indique que es la app móvil (solo en entornos nativos)
      // Los navegadores web no permiten modificar este encabezado por seguridad
      const headers = Platform.OS !== 'web' ? {
        'User-Agent': 'PetoClub-App'
      } : {};

      // Crear la orden en WooCommerce
      const response = await createOrder(orderData, headers);
      console.log('Respuesta completa de WooCommerce:', JSON.stringify(response));

      // Verificar si tenemos los datos necesarios para MercadoPago
      if (!response || !response.id) {
        throw new Error('No se recibieron los datos necesarios para procesar el pago con MercadoPago');
      }

      // Buscar el ID de preferencia en los metadatos
      let preferenceId = null;
      let initPoint = null;
      let sandboxInitPoint = null;
      
      // Verificar si los metadatos existen y contienen la preferencia de MercadoPago
      if (response.meta_data && Array.isArray(response.meta_data)) {
        const mpPreference = response.meta_data.find(m => m.key === '_mercadopago_preference_id');
        if (mpPreference && mpPreference.value) {
          preferenceId = mpPreference.value;
        }
      }
      
      // Si no encontramos la preferencia en los metadatos, hacer una solicitud adicional al backend
      let success = true;
      let errorMessage = null;
      let mpData = null;
      
      if (!preferenceId) {
        try {
          // Construir la URL para obtener la preferencia de MercadoPago
          const apiUrl = `https://petoclub.com.ar/wp-json/petoclub/v1/mercadopago-preference?order_id=${response.id}`;
          
          console.log('Solicitando preferencia de MercadoPago al backend...');
          
          // Realizar la solicitud al backend
          const mpResponse = await fetch(apiUrl, {
            method: 'GET',
            headers: Platform.OS !== 'web' ? {
              'User-Agent': 'PetoClub-App',
              'Content-Type': 'application/json'
            } : {
              'Content-Type': 'application/json'
              // No incluimos User-Agent en web para evitar errores de seguridad
            }
          });
          
          if (mpResponse.ok) {
            mpData = await mpResponse.json();
            console.log('Respuesta de preferencia de MercadoPago:', JSON.stringify(mpData));
            
            if (mpData.success && mpData.preference_id) {
              preferenceId = mpData.preference_id;
              initPoint = mpData.init_point;
              sandboxInitPoint = mpData.sandbox_init_point;
            }
            
            // Si la respuesta indica un error en la configuración de MercadoPago
            if (mpData.success === false && mpData.error) {
              success = false;
              errorMessage = mpData.error;
              console.warn('Error reportado por el servidor:', errorMessage);
            }
          }
        } catch (mpError) {
          console.error('Error al obtener preferencia de MercadoPago:', mpError);
          // Continuamos con el flujo aunque falle esta solicitud
        }
      }
      
      // Si aún no tenemos preferencia, usar un ID genérico
      if (!preferenceId) {
        preferenceId = `order_${response.id}`;
        console.log('Usando ID de preferencia genérico:', preferenceId);
      }
      
      // Extraer los datos necesarios para MercadoPago, usando valores por defecto si no existen
      const result = {
        success: success,
        error: errorMessage,
        preferenceId: preferenceId,
        publicKey: process.env.EXPO_PUBLIC_MERCADOPAGO_PUBLIC_KEY || '',
        orderId: response.id,
        status: response.status,
        // Usar URLs de pago de la respuesta o construir una URL genérica
        initPoint: initPoint || response.payment_url || `https://petoclub.com.ar/checkout/order-pay/${response.id}?pay_for_order=true&key=${response.order_key}`,
        sandboxInitPoint: sandboxInitPoint || response.payment_url || `https://petoclub.com.ar/checkout/order-pay/${response.id}?pay_for_order=true&key=${response.order_key}`
      };
      
      // Eliminar la solicitud del conjunto de pendientes una vez procesada
      pendingOrderRequests.delete(orderRequestId);
      
      return result;
    } catch (error) {
      // Si ocurre un error, eliminar la solicitud del conjunto de pendientes
      pendingOrderRequests.delete(orderRequestId);
      throw error;
    }
  } catch (error) {
    console.error('Error al crear orden para MercadoPago:', error);
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