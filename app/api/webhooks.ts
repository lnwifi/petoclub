import { supabase } from '../../lib/supabase';
import { setupOrderWebhook } from '../../lib/woocommerce';

// Función para procesar los datos del webhook de WooCommerce
export const processWooCommerceWebhook = async (payload: any) => {
  try {
    // Extraer información relevante
    const { id, status, billing } = payload;
    
    console.log(`Procesando webhook para pedido #${id} con estado ${status}`);
    
    // Guardar la actualización en Supabase para notificaciones
    if (billing?.email) {
      // Buscar el usuario en Supabase por el email de facturación
      const { data: userData, error: userError } = await supabase
        .from('profiles')
        .select('id, user_id')
        .eq('email', billing.email)
        .single();
      
      if (userData && !userError) {
        // Guardar la notificación
        const { error: notifError } = await supabase
          .from('notifications')
          .insert({
            user_id: userData.user_id,
            title: `Actualización de pedido #${id}`,
            message: `Tu pedido ha cambiado a estado: ${status}`,
            type: 'order_update',
            metadata: { order_id: id, status },
            read: false,
          });
          
        if (notifError) {
          console.error('Error al guardar notificación:', notifError);
          return { success: false, error: notifError };
        }
        
        return { success: true, userId: userData.user_id };
      } else {
        console.error('Usuario no encontrado para el email:', billing.email);
        return { success: false, error: 'Usuario no encontrado' };
      }
    } else {
      console.error('No se proporcionó email de facturación en el webhook');
      return { success: false, error: 'Email no proporcionado' };
    }
  } catch (error) {
    console.error('Error al procesar webhook:', error);
    return { success: false, error };
  }
};

// Función para configurar el webhook en WooCommerce
export const configureWooCommerceWebhook = async (callbackUrl: string) => {
  try {
    // Configurar el webhook en WooCommerce
    const result = await setupOrderWebhook(callbackUrl);
    
    console.log('Webhook configurado correctamente:', result);
    return { success: true, webhook: result };
  } catch (error) {
    console.error('Error al configurar webhook:', error);
    return { success: false, error };
  }
};
