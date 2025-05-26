import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '../../lib/auth-context';
import { Ticket, Copy, Check } from 'lucide-react-native';
import { useFonts, Inter_400Regular, Inter_500Medium, Inter_700Bold } from '@expo-google-fonts/inter';
import { Stack, useRouter } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import CouponUpgradeModal from '../components/CouponUpgradeModal';

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
  const [redeemedCodes, setRedeemedCodes] = useState<{ [couponId: string]: { code: string, redeemed_at: string, expires_at: string, is_expired: boolean } }>({});
  const [isCouponUpgradeModalVisible, setCouponUpgradeModalVisible] = useState(false);
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

        // Cargar cupones para todos los usuarios
        const { data: couponsData, error: couponsError } = await supabase
          .rpc('get_available_coupons', { user_id: session?.user.id });

        if (couponsError) {
          console.error('Error al cargar cupones:', couponsError);
          Alert.alert('Error', 'No se pudieron cargar los cupones disponibles');
          return;
        }

        setCoupons(couponsData || []);
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

  // Handler para canjear desde Supabase
  const handleRedeem = async (couponId: string) => {
    if (!session?.user?.id) {
      Alert.alert('Debes iniciar sesión para canjear cupones');
      return;
    }
    // Verificar membresía premium antes de canjear
    if (!userMembership || userMembership.membership_name.toLowerCase() !== 'premium') {
      setCouponUpgradeModalVisible(true);
      return;
    }
    const { data, error } = await supabase.rpc('redeem_coupon', {
      p_user_id: session.user.id,
      p_coupon_id: couponId,
    });
    if (error) {
      Alert.alert('Error', error.message || 'No se pudo canjear el cupón');
      return;
    }
    if (data && data.length > 0) {
      const { code, redeemed_at, expires_at, is_expired } = data[0];
      setRedeemedCodes(prev => ({ ...prev, [couponId]: { code, redeemed_at, expires_at, is_expired } }));
      if (is_expired) {
        Alert.alert('Cupón caducado', `Tu código (${code}) ha expirado.`);
      } else {
        Alert.alert('¡Cupón canjeado!', `Tu código es: ${code}\nVálido hasta: ${new Date(expires_at).toLocaleTimeString()}`);
      }
    } else {
      Alert.alert('Error', 'No se pudo canjear el cupón.');
    }
  };

  // Al cargar la pantalla, consulta los canjes del usuario para mostrar el estado
  useEffect(() => {
    const fetchRedemptions = async () => {
      if (!session?.user?.id) return;
      const { data, error } = await supabase
        .from('user_coupons')
        .select('coupon_id, code, redeemed_at, expires_at, is_expired')
        .eq('user_id', session.user.id);
      if (!error && data) {
        const map = {};
        data.forEach((row: any) => {
          map[row.coupon_id] = {
            code: row.code,
            redeemed_at: row.redeemed_at,
            expires_at: row.expires_at,
            is_expired: row.is_expired,
          };
        });
        setRedeemedCodes(map);
      }
    };
    fetchRedemptions();
  }, [session]);

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
        ) : (
          <View style={styles.couponsContainer}>
            {coupons.map((coupon) => (
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
                
                {/* Solo mostrar el botón "Canjear" si el cupón NO fue canjeado */}
                {!redeemedCodes[coupon.id] && (
                  <View style={{ alignItems: 'center', marginTop: 8, marginBottom: 8 }}>
                    <TouchableOpacity
                      style={styles.upgradeButton}
                      onPress={() => handleRedeem(coupon.id)}
                    >
                      <Text style={styles.upgradeButtonText}>Canjear</Text>
                    </TouchableOpacity>
                  </View>
                )}
                {/* Mostrar el código solo si ya fue canjeado */}
                {redeemedCodes[coupon.id] && (
                  <View style={{ alignItems: 'center', marginTop: 12 }}>
                    <Text style={{ color: '#ffbc4c', fontWeight: 'bold', fontSize: 18 }}>{redeemedCodes[coupon.id].code}</Text>
                    <Text style={{ color: '#666', fontSize: 13 }}>
                      {redeemedCodes[coupon.id].is_expired
                        ? 'Este código ha caducado.'
                        : `Válido hasta: ${new Date(redeemedCodes[coupon.id].expires_at).toLocaleTimeString()}`}
                    </Text>
                  </View>
                )}
                
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
      <CouponUpgradeModal
        visible={isCouponUpgradeModalVisible}
        onClose={() => setCouponUpgradeModalVisible(false)}
        onUpgrade={() => {
          setCouponUpgradeModalVisible(false);
          router.push('/memberships');
        }}
      />
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
  validUntil: {
    fontFamily: 'Inter_400Regular',
    color: '#666',
    fontSize: 12,
    textAlign: 'right',
  },
});
