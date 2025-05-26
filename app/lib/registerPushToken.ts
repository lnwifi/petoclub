import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { supabase } from './supabase';

export async function registerForPushNotificationsAsync(userId: string) {
  let token;
  if (Constants.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') {
      alert('Debes permitir notificaciones para recibir avisos importantes.');
      return;
    }
    token = (await Notifications.getExpoPushTokenAsync()).data;
    // Guarda el token en Supabase
    await supabase.from('profiles').update({ fcm_token: token }).eq('id', userId);
  } else {
    alert('Debes usar un dispositivo físico para recibir notificaciones push.');
  }
  return token;
}
