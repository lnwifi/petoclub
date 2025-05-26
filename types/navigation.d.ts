import { NavigatorScreenParams } from '@react-navigation/native';

export type RootStackParamList = {
  // Rutas principales
  '(tabs)': NavigatorScreenParams<TabParamList>;
  
  // Rutas de autenticación
  'login': undefined;
  'register': undefined;
  'forgot-password': undefined;
  'reset-password': { token: string };
  
  // Rutas de la aplicación
  'product/[id]': { id: string };
  'cart': undefined;
  'checkout': undefined;
  'payment': { 
    preferenceId: string; 
    publicKey: string; 
    orderId: string 
  };
  'payment/success': { orderId: string };
  'orders': undefined;
  'orders/[id]': { id: string };
  'profile': undefined;
  'settings': undefined;
  'notifications': undefined;
  'search': undefined;
  'favorites': undefined;
  'addresses': undefined;
  'addresses/add': undefined;
  'addresses/edit': { id: string };
  'help': undefined;
  'about': undefined;
  'terms': undefined;
  'privacy': undefined;
  'contact': undefined;
};

export type TabParamList = {
  'home': undefined;
  'search': undefined;
  'cart': undefined;
  'favorites': undefined;
  'profile': undefined;
};

// Extender las definiciones de tipos de React Navigation
declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
