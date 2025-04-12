import { View, Text, StyleSheet, Image, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { Settings, CreditCard, Heart, MapPin, LogOut, Ticket, Gift, ShoppingBag } from 'lucide-react-native';
import { useAuth } from '@/lib/auth-context';
import { router } from 'expo-router';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useFonts, Inter_400Regular, Inter_500Medium, Inter_700Bold } from '@expo-google-fonts/inter';
import OrderNotifications from '@/components/OrderNotifications';

type UserMembership = {
  membership_id: string;
  membership_name: string;
  max_pets: number;
  max_photos_per_pet: number;
  max_interests_per_pet: number;
  has_ads: boolean;
  has_coupons: boolean;
  has_store_discounts: boolean;
};

export default function Profile() {
  const { user, signOut, loading } = useAuth();
  const [userMembership, setUserMembership] = useState<UserMembership | null>(null);
  const [loadingMembership, setLoadingMembership] = useState(true);
  
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_700Bold,
  });

  useEffect(() => {
    if (user) {
      loadUserMembership();
    }
  }, [user]);

  const loadUserMembership = async () => {
    try {
      setLoadingMembership(true);
      
      const { data, error } = await supabase
        .rpc('get_user_membership', { user_id: user?.id });

      if (error) {
        console.error('Error al cargar membresía:', error);
        Alert.alert('Error', 'No se pudo cargar la información de membresía');
        return;
      }

      if (data && data.length > 0) {
        setUserMembership(data[0]);
      }
    } catch (error) {
      console.error('Error inesperado:', error);
    } finally {
      setLoadingMembership(false);
    }
  };

  const handleSignOut = async () => {
    const { error } = await signOut();
    if (!error) {
      router.replace('/(auth)/login');
    }
  };

  if (loading || !fontsLoaded) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#ffbc4c" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Image
          source={{ uri: user?.user_metadata?.avatar_url || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(user?.user_metadata?.full_name || 'Usuario') }}
          style={styles.profileImage}
        />
        <Text style={styles.name}>{user?.user_metadata?.full_name || 'Usuario'}</Text>
        <Text style={styles.email}>{user?.email}</Text>
      </View>

      {loadingMembership ? (
        <View style={styles.membershipCardLoading}>
          <ActivityIndicator size="small" color="#ffbc4c" />
          <Text style={styles.membershipLoadingText}>Cargando membresía...</Text>
        </View>
      ) : (
        <View style={styles.membershipCard}>
          <Text style={styles.membershipTitle}>
            Membresía {userMembership?.membership_name || 'Gratuita'}
          </Text>
          <View style={styles.membershipDetails}>
            <View style={styles.membershipDetail}>
              <Text style={styles.membershipDetailLabel}>Mascotas:</Text>
              <Text style={styles.membershipDetailValue}>{userMembership?.max_pets || 1}</Text>
            </View>
            <View style={styles.membershipDetail}>
              <Text style={styles.membershipDetailLabel}>Fotos por mascota:</Text>
              <Text style={styles.membershipDetailValue}>{userMembership?.max_photos_per_pet || 1}</Text>
            </View>
          </View>
          <TouchableOpacity 
            style={styles.membershipButton}
            onPress={() => router.push('/memberships')}
          >
            <Text style={styles.membershipButtonText}>
              {userMembership?.membership_name === 'Premium' ? 'Ver detalles' : 'Actualizar a Premium'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Notificaciones de pedidos */}
      <OrderNotifications />

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Mi Cuenta</Text>
        <TouchableOpacity 
          style={styles.menuItem}
          onPress={() => router.push('/(app)/profile/settings' as any)}
        >
          <Settings size={24} color="#666" />
          <Text style={styles.menuText}>Configuración</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.menuItem}
          onPress={() => router.push('/(app)/profile/orders' as any)}
        >
          <ShoppingBag size={24} color="#666" />
          <Text style={styles.menuText}>Mis Pedidos</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.menuItem}
          onPress={() => router.push('/memberships' as any)}
        >
          <CreditCard size={24} color="#666" />
          <Text style={styles.menuText}>Membresía y Facturación</Text>
        </TouchableOpacity>
        {userMembership?.has_coupons && (
          <TouchableOpacity 
            style={styles.menuItem}
            onPress={() => router.push('/coupons')}
          >
            <Ticket size={24} color="#666" />
            <Text style={styles.menuText}>Cupones de descuento</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={styles.menuItem}>
          <Heart size={24} color="#666" />
          <Text style={styles.menuText}>Mis Coincidencias</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuItem}>
          <MapPin size={24} color="#666" />
          <Text style={styles.menuText}>Lugares Guardados</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity 
        style={styles.logoutButton}
        onPress={handleSignOut}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#ffbc4c" size={24} />
        ) : (
          <>
            <LogOut size={24} color="#ffbc4c" />
            <Text style={styles.logoutText}>Cerrar Sesión</Text>
          </>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 16,
  },
  name: {
    fontSize: 24,
    fontFamily: 'Inter_700Bold',
    marginBottom: 4,
  },
  email: {
    fontSize: 16,
    color: '#666',
    fontFamily: 'Inter_400Regular',
  },
  membershipCard: {
    margin: 16,
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  membershipCardLoading: {
    margin: 16,
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  membershipLoadingText: {
    marginLeft: 8,
    fontFamily: 'Inter_400Regular',
    color: '#666',
  },
  membershipTitle: {
    fontSize: 18,
    fontFamily: 'Inter_700Bold',
    color: '#333',
    marginBottom: 12,
  },
  membershipExpiry: {
    fontSize: 14,
    color: '#666',
    fontFamily: 'Inter_400Regular',
  },
  membershipDetails: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  membershipDetail: {
    flex: 1,
  },
  membershipDetailLabel: {
    fontSize: 14,
    color: '#666',
    fontFamily: 'Inter_400Regular',
    marginBottom: 4,
  },
  membershipDetailValue: {
    fontSize: 16,
    fontFamily: 'Inter_700Bold',
    color: '#333',
  },
  membershipButton: {
    backgroundColor: '#ffbc4c',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  membershipButtonText: {
    color: '#fff',
    fontFamily: 'Inter_700Bold',
    fontSize: 14,
  },
  section: {
    margin: 16,
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter_700Bold',
    color: '#333',
    marginBottom: 16,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  menuText: {
    marginLeft: 16,
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    color: '#333',
  },
  logoutButton: {
    margin: 16,
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutText: {
    marginLeft: 16,
    fontSize: 16,
    fontFamily: 'Inter_700Bold',
    color: '#ffbc4c',
  },
});