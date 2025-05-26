import { initializeApp } from 'firebase/app';
import { getMessaging, getToken } from 'firebase/messaging';

// URL de la función de notificaciones en Supabase Edge Functions
export const NOTIFICATIONS_FUNCTION_URL = 'https://cbrxgjksefmgtoatkbbs.supabase.co/functions/v1/send_notification';

const firebaseConfig = {
  apiKey: 'AIzaSyAIpjNh7FPnFJBTOj4RP9lVGIRba4EIbQg',
  authDomain: 'petoclub-ea0d1.firebaseapp.com',
  projectId: 'petoclub-ea0d1',
  storageBucket: 'petoclub-ea0d1.firebasestorage.app',
  messagingSenderId: '63121240864',
  appId: '1:63121240864:web:37cf4ccdde5a6c3e9b1d45',
};

const app = initializeApp(firebaseConfig);
const messaging = getMessaging(app);

export { messaging, getToken };
