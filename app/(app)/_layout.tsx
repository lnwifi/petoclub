import { Tabs, Slot } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { AuthRoute } from '@/lib/auth-route';
import { useAuth } from '@/lib/auth-context';
import NotificationBell from '@/components/NotificationBell';
import FloatingCart from '@/components/FloatingCart';
import { Image, View, Platform } from 'react-native';
import { useEffect, useState, useRef } from 'react';
import { AuthProvider } from '@/lib/auth-context';
import { CartProvider } from '@/lib/cart-context';
import { useFonts, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import { configureWooCommerceWebhook } from '@/app/api/webhooks';
import Constants from 'expo-constants';
import * as Linking from 'expo-linking';

const linking = {
  prefixes: [
    'petoclub://',
    'https://app.petoclub.com.ar',
    'https://www.app.petoclub.com.ar',
  ],
  config: {
    screens: {
      membershipsSuccess: 'memberships-success',
    },
  },
};

export default function AppLayout() {
  const { user } = useAuth();
  const [firstName, setFirstName] = useState('Usuario');
  const isMounted = useRef(true);
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  // Handle component lifecycle
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  // Handle user name safely
  useEffect(() => {
    if (!isMounted.current) return;

    if (user?.user_metadata?.full_name) {
      const fullName = user.user_metadata.full_name;
      setFirstName(fullName.split(' ')[0]);
    }
  }, [user]);

  // Configurar webhook de MercadoPago al iniciar la aplicación
  useEffect(() => {
    const setupWebhook = async () => {
      try {
        // URL de tu backend donde recibirás las notificaciones de MercadoPago
        // En producción, esto debería ser una URL pública accesible desde internet
        const webhookUrl = Constants.expoConfig?.extra?.WEBHOOK_URL || 'https://petoclub.com.ar/api/webhooks/woocommerce';

        // Configurar el webhook en WooCommerce
        await configureWooCommerceWebhook(webhookUrl);
        console.log('Webhook de MercadoPago configurado correctamente');
      } catch (error) {
        console.error('Error al configurar webhook de MercadoPago:', error);
      }
    };

    setupWebhook();
  }, []);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <AuthRoute requireAuth={true}>
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: '#ffbc4c',
          tabBarInactiveTintColor: '#666',
          tabBarStyle: {
            borderTopColor: '#eee',
          },
          tabBarLabelStyle: {
            fontFamily: 'Inter_400Regular',
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: "Inicio",
            headerTitle: `¡Hola, ${firstName}!`,
            tabBarIcon: ({ color, size }) => <Ionicons name="home" size={size} color={color} />,
            headerLeft: () => (
              <View style={{ marginLeft: 10, flex: 1, justifyContent: 'center' }}>
                <Image
                  source={require('@/assets/images/logo.png')}
                  style={{ width: 120, height: 40 }}
                  resizeMode="contain"
                />
              </View>
            ),
            headerRight: () => <NotificationBell />,
            headerRightContainerStyle: { paddingRight: 16 },
            headerTitleAlign: 'center',
          }}
        />
        <Tabs.Screen
          name="match"
          options={{
            title: 'PetoMatch',
            tabBarIcon: ({ color, size }) => <Ionicons name="heart" size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="places"
          options={{
            title: 'Asociados',
            tabBarIcon: ({ color, size }) => <Ionicons name="location" size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="places/[id]"
          options={{
            href: null, // Oculta la ruta dinámica del TabBar
            title: 'Detalles',
          }}
        />
        <Tabs.Screen
          name="red-de-ayuda"
          options={{
            title: 'Red de Ayuda',
            tabBarIcon: ({ color, size }) => <Ionicons name="megaphone" size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="red-de-ayuda/[id]"
          options={{
            href: null, // Oculta la ruta dinámica del detalle del aviso del TabBar
            title: 'Detalle Aviso',
          }}
        />
        <Tabs.Screen
          name="refugios"
          options={{
            title: 'Refugios',
            tabBarIcon: ({ color, size }) => <Ionicons name="paw" size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="eventos"
          options={{
            href: null, // Esto oculta la pestaña del menú
            title: 'Eventos',
            tabBarIcon: ({ color, size }) => <Ionicons name="calendar" size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="store"
          options={{
            title: 'Tienda',
            tabBarIcon: ({ color, size }) => <Ionicons name="cart" size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Perfil',
            tabBarIcon: ({ color, size }) => <Ionicons name="person" size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="chat"
          options={{
            title: 'Chat',
            headerShown: true,
            href: null,
          }}
        />
        <Tabs.Screen
          name="memberships"
          options={{
            title: 'Membresías',
            headerShown: true,
            href: null,
          }}
        />
        <Tabs.Screen
          name="coupons"
          options={{
            title: 'Cupones de descuento',
            headerShown: true,
            href: null,
          }}
        />
        <Tabs.Screen
          name="profile/orders"
          options={{
            title: 'Mis Pedidos',
            headerShown: true,
            href: null,
          }}
        />
        <Tabs.Screen
          name="profile/settings"
          options={{
            title: 'Configuración',
            headerShown: true,
            href: null,
          }}
        />
        <Tabs.Screen
          name="memberships-success"
          options={{
            title: 'Pago Exitoso',
            headerShown: true,
            href: null, // Oculta del menú inferior y navegación pública
          }}
        />
        {/* Oculta rutas no deseadas del menú inferior */}
        <Tabs.Screen name="cart" options={{ href: null }} />
        <Tabs.Screen name="storeWebview" options={{ href: null }} />
        <Tabs.Screen name="productDetail" options={{ href: null }} />
        <Tabs.Screen name="webview" options={{ href: null }} />
        <Tabs.Screen name="checkout" options={{ href: null }} />
        <Tabs.Screen name="checkoutWebview" options={{ href: null }} />
        {/* Oculta rutas de payment y estados del menú inferior */}
        <Tabs.Screen name="payment" options={{ href: null }} />
        <Tabs.Screen name="payment/success" options={{ href: null }} />
        <Tabs.Screen name="payment/failure" options={{ href: null }} />
        <Tabs.Screen name="payment/pending" options={{ href: null }} />
      </Tabs>
      <FloatingCart />
    </AuthRoute>
  );
}