import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { Ticket, Copy, Check } from 'lucide-react-native';
import { useFonts, Inter_400Regular, Inter_500Medium, Inter_700Bold } from '@expo-google-fonts/inter';
import { Stack, useRouter } from 'expo-router';
import * as Clipboard from 'expo-clipboard';

// Definir tipos
type Coupon = {
  id: string;
  title: string;
  description: string;
  code: string;
  discount_percentage: number | null;
  discount_amount: number | null;
  valid_from: string;
  valid_until: string | null;
  partner_name: string;
};

type UserMembership = {
  membership_name: string;
  has_coupons: boolean;
};

export default function CouponsScreen() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [userMembership, setUserMembership] = useState<UserMembership | null>(null);
  const [loading, setLoading] = useState(true);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const { session } = useAuth();
  const router = useRouter();

  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_700Bold,
  });

  useEffect(() => {
    if (session) {
      loadCouponsData();
    }
  }, [session]);

  const loadCouponsData = async () => {
    try {
      setLoading(true);

      // Cargar membresía del usuario
      const { data: userMembershipData, error: userMembershipError } = await supabase
        .rpc('get_user_membership', { user_id: session?.user.id });

      if (userMembershipError) {
        console.error('Error al cargar membresía del usuario:', userMembershipError);
        Alert.alert('Error', 'No se pudo cargar tu membresía actual');
        return;
      }

      if (userMembershipData && userMembershipData.length > 0) {
        setUserMembership({
          membership_name: userMembershipData[0].membership_name,
          has_coupons: userMembershipData[0].has_coupons
        });

        // Si el usuario tiene acceso a cupones, cargarlos
        if (userMembershipData[0].has_coupons) {
          const { data: couponsData, error: couponsError } = await supabase
            .rpc('get_available_coupons', { user_id: session?.user.id });

          if (couponsError) {
            console.error('Error al cargar cupones:', couponsError);
            Alert.alert('Error', 'No se pudieron cargar los cupones disponibles');
            return;
          }

          setCoupons(couponsData || []);
        }
      } else {
        setUserMembership(null);
      }
    } catch (error) {
      console.error('Error inesperado:', error);
      Alert.alert('Error', 'Ocurrió un error inesperado');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (code: string) => {
    try {
      await Clipboard.setStringAsync(code);
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 3000); // Resetear después de 3 segundos
    } catch (error) {
      console.error('Error al copiar al portapapeles:', error);
      Alert.alert('Error', 'No se pudo copiar el código');
    }
  };

  if (!fontsLoaded) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Cupones de descuento' }} />
      
      <ScrollView style={styles.scrollView}>
        <View style={styles.header}>
          <Ticket size={24} color="#ffbc4c" />
          <Text style={styles.headerTitle}>Cupones de descuento</Text>
        </View>
        
        {loading ? (
          <Text style={styles.loadingText}>Cargando cupones...</Text>
        ) : !userMembership?.has_coupons ? (
          <View style={styles.upgradeContainer}>
            <Text style={styles.upgradeTitle}>Acceso exclusivo para miembros Premium</Text>
            <Text style={styles.upgradeDescription}>
              Actualiza tu membresía a Premium para acceder a cupones de descuento exclusivos en servicios y productos para tu mascota.
            </Text>
            <TouchableOpacity 
              style={styles.upgradeButton}
              onPress={() => router.push('/memberships')}
            >
              <Text style={styles.upgradeButtonText}>Actualizar a Premium</Text>
            </TouchableOpacity>
          </View>
        ) : coupons.length === 0 ? (
          <View style={styles.emptyCouponsContainer}>
            <Text style={styles.emptyCouponsTitle}>No hay cupones disponibles</Text>
            <Text style={styles.emptyCouponsDescription}>
              Actualmente no hay cupones disponibles. Vuelve a revisar más tarde para encontrar nuevas ofertas.
            </Text>
          </View>
        ) : (
          <View style={styles.couponsContainer}>
            {coupons.map(coupon => (
              <View key={coupon.id} style={styles.couponCard}>
                <View style={styles.couponHeader}>
                  <Text style={styles.couponTitle}>{coupon.title}</Text>
                  {coupon.partner_name && (
                    <Text style={styles.partnerName}>{coupon.partner_name}</Text>
                  )}
                </View>
                
                <Text style={styles.couponDescription}>{coupon.description}</Text>
                
                <View style={styles.discountContainer}>
                  {coupon.discount_percentage ? (
                    <Text style={styles.discountText}>{coupon.discount_percentage}% de descuento</Text>
                  ) : coupon.discount_amount ? (
                    <Text style={styles.discountText}>${coupon.discount_amount} de descuento</Text>
                  ) : (
                    <Text style={styles.discountText}>Descuento especial</Text>
                  )}
                </View>
                
                <View style={styles.codeContainer}>
                  <Text style={styles.codeLabel}>Código:</Text>
                  <Text style={styles.codeText}>{coupon.code}</Text>
                  <TouchableOpacity 
                    style={styles.copyButton}
                    onPress={() => copyToClipboard(coupon.code)}
                  >
                    {copiedCode === coupon.code ? (
                      <Check size={18} color="#4CAF50" />
                    ) : (
                      <Copy size={18} color="#666" />
                    )}
                  </TouchableOpacity>
                </View>
                
                {coupon.valid_until && (
                  <Text style={styles.validUntil}>
                    Válido hasta: {new Date(coupon.valid_until).toLocaleDateString()}
                  </Text>
                )}
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 22,
    fontFamily: 'Inter_700Bold',
    color: '#333',
    marginLeft: 12,
  },
  loadingText: {
    fontFamily: 'Inter_400Regular',
    color: '#666',
    textAlign: 'center',
    marginVertical: 16,
  },
  upgradeContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    alignItems: 'center',
  },
  upgradeTitle: {
    fontSize: 18,
    fontFamily: 'Inter_700Bold',
    color: '#333',
    marginBottom: 12,
    textAlign: 'center',
  },
  upgradeDescription: {
    fontFamily: 'Inter_400Regular',
    color: '#666',
    textAlign: 'center',
    marginBottom: 16,
  },
  upgradeButton: {
    backgroundColor: '#ffbc4c',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  upgradeButtonText: {
    fontFamily: 'Inter_700Bold',
    color: '#fff',
  },
  emptyCouponsContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    alignItems: 'center',
  },
  emptyCouponsTitle: {
    fontSize: 18,
    fontFamily: 'Inter_700Bold',
    color: '#333',
    marginBottom: 12,
    textAlign: 'center',
  },
  emptyCouponsDescription: {
    fontFamily: 'Inter_400Regular',
    color: '#666',
    textAlign: 'center',
  },
  couponsContainer: {
    marginBottom: 16,
  },
  couponCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  couponHeader: {
    marginBottom: 12,
  },
  couponTitle: {
    fontSize: 18,
    fontFamily: 'Inter_700Bold',
    color: '#333',
    marginBottom: 4,
  },
  partnerName: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    color: '#666',
  },
  couponDescription: {
    fontFamily: 'Inter_400Regular',
    color: '#666',
    marginBottom: 16,
  },
  discountContainer: {
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    alignItems: 'center',
  },
  discountText: {
    fontSize: 16,
    fontFamily: 'Inter_700Bold',
    color: '#333',
  },
  codeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  codeLabel: {
    fontFamily: 'Inter_500Medium',
    color: '#666',
    marginRight: 8,
  },
  codeText: {
    flex: 1,
    fontFamily: 'Inter_700Bold',
    color: '#ffbc4c',
    fontSize: 16,
  },
  copyButton: {
    padding: 8,
  },
  validUntil: {
    fontFamily: 'Inter_400Regular',
    color: '#666',
    fontSize: 12,
    textAlign: 'right',
  },
});
