import { messaging, getToken } from './firebase';
import { supabase } from './supabase';

export async function registerWebPushToken(userId: string) {
  try {
    console.log('[registerWebPushToken] userId:', userId);
    if (!userId) {
      alert('Error: userId no definido al registrar FCM token');
      return;
    }
    const currentToken = await getToken(messaging, { vapidKey: 'BIDO0uxvuyyF0DlbD-zLEb1C9emzDmX65ugDRBzqtGvk_wZVOYxzyB4F8xqGnK0ND6JHoiYipbFPbbsU0NYkmL4' });
    console.log('[registerWebPushToken] currentToken:', currentToken);
    if (currentToken) {
      const { error, data } = await supabase.from('profiles').update({ fcm_token: currentToken }).eq('id', userId);
      console.log('[registerWebPushToken] supabase update result:', { error, data });
      if (error) {
        alert('Error guardando FCM token en Supabase: ' + error.message);
      } else {
        console.log('FCM token guardado correctamente en profiles.');
      }
      return currentToken;
    } else {
      alert('No se pudo obtener token FCM. Por favor, acepta los permisos de notificación.');
      console.log('No se pudo obtener token. Solicita permiso para notificaciones.');
    }
  } catch (err) {
    alert('Error obteniendo token FCM: ' + (err?.message || err));
    console.error('Error obteniendo token FCM:', err);
  }
}

