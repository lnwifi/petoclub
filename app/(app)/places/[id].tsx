import { useRouter, useLocalSearchParams } from 'expo-router';
import { View, Text, StyleSheet, Image, TouchableOpacity, Linking, ScrollView, Alert, Animated, ActivityIndicator } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import CouponUpgradeModal from '../../components/CouponUpgradeModal';
import RedeemQrScanner from '../../components/RedeemQrScanner';
import RedeemCodeModal from '../../components/RedeemCodeModal';
import CouponCodeValidation from '../../components/CouponCodeValidation';
import { useAuth } from '../../../lib/auth-context';
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import QrScannerWeb from '../../components/QrScannerWeb';
import QrScannerExpo from '../../components/QrScannerExpo';
import { Platform } from 'react-native';

const YELLOW = '#fbaa30';
const SOFT_BG = '#FFF5E5';
const CARD_SHADOW = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.08,
  shadowRadius: 8,
  elevation: 3,
};

const STAR_COUNT = 5;

// Tipos explícitos para place y coupon
interface Place {
  id: string;
  photo_url?: string;
  name: string;
  category?: string;
  description?: string;
  whatsapp?: string;
  address?: string;
  phone?: string;
  hours?: PlaceHour[];
  rating?: number;
}

interface PlaceHour {
  closed?: boolean;
  open?: string | null;
  close?: string | null;
}

interface Coupon {
  id: string;
  title: string;
  description: string;
  discount_percentage?: number;
  discount_amount?: number;
  valid_from?: string;
  valid_until?: string;
  expires_at?: string;
}

interface Rating {
  rating: number;
}

interface StarRatingProps {
  value: number;
  onRate: (v: number) => void;
  disabled?: boolean;
}

function StarRating({ value, onRate, disabled = false }: StarRatingProps) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 8 }}>
      {[...Array(STAR_COUNT)].map((_, i: number) => (
        <TouchableOpacity
          key={i}
          onPress={() => !false && onRate(i + 1)}
          activeOpacity={false ? 1 : 0.7}
          disabled={false}
        >
          <FontAwesome
            name={i < value ? 'star' : 'star-o'}
            size={28}
            color={i < value ? '#FFD700' : '#CCC'}
            style={{ marginHorizontal: 2 }}
          />
        </TouchableOpacity>
      ))}
    </View>
  );
}

export default function PlaceDetail() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { user, session } = useAuth();
  const [place, setPlace] = useState<Place | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [userMembership, setUserMembership] = useState<{ membership_name: string; has_coupons: boolean; is_active: boolean } | null>(null);
  const [loadingMembership, setLoadingMembership] = useState(true);
  const [upgradeModal, setUpgradeModal] = useState(false);
  const [redeemed, setRedeemed] = useState<{[couponId: string]: boolean}>({});
  const [showScanner, setShowScanner] = useState(false);
  const [redeemCode, setRedeemCode] = useState<string | null>(null);
  const [redeemLoading, setRedeemLoading] = useState(false);
  const [redeemSuccess, setRedeemSuccess] = useState(false);
  const [pendingCode, setPendingCode] = useState<string | null>(null);
  const [showCodeModal, setShowCodeModal] = useState(false);
  const [userRating, setUserRating] = useState<number | null>(null);
  const [ratingLoading, setRatingLoading] = useState(false);
  const [averageRating, setAverageRating] = useState<number | null>(null);
  const [ratingCount, setRatingCount] = useState<number>(0);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loadingCoupons, setLoadingCoupons] = useState(true);
  const [userCoupons, setUserCoupons] = useState<string[]>([]);
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [redeemCouponId, setRedeemCouponId] = useState<string | null>(null);
  const [codeExpiresAt, setCodeExpiresAt] = useState<Date | null>(null);
  const [qrScanOpen, setQrScanOpen] = useState(false);
  const [showValidation, setShowValidation] = useState(false);
  const [selectedCoupon, setSelectedCoupon] = useState<Coupon | null>(null);

  useEffect(() => {
    const fetchPlace = async () => {
      setLoading(true);
      setNotFound(false);
      const { data, error } = await supabase.from('places').select('*').eq('id', params.id).single();
      if (error || !data) {
        setNotFound(true);
        setPlace(null);
      } else {
        setPlace(data);
      }
      setLoading(false);
    };
    if (params.id) fetchPlace();
  }, [params.id]);

  const loadMembership = async () => {
    if (session?.user?.id) {
      setLoadingMembership(true);
      const { data: userMembershipData, error: userMembershipError } = await supabase
        .rpc('get_user_membership', { user_id: session.user.id });
      if (!userMembershipError && userMembershipData && userMembershipData.length > 0) {
        setUserMembership({
          membership_name: userMembershipData[0].membership_name,
          has_coupons: userMembershipData[0].has_coupons,
          is_active: userMembershipData[0].is_active
        });
      } else {
        setUserMembership(null);
      }
      setLoadingMembership(false);
    }
  };

  // Cargar membresía al montar el componente
  useEffect(() => {
    router.setParams({ title: 'Detalles' });
    loadMembership();
  }, [session]);

  // Recargar membresía cuando se reciba el parámetro refreshMembership
  useEffect(() => {
    if (params.refreshMembership) {
      loadMembership();
    }
  }, [params.refreshMembership]);

  useEffect(() => {
    const fetchRatings = async () => {
      if (!place?.id) return;
      // Obtener promedio y cantidad
      const { data: avgData, error: avgError } = await supabase
        .from('ratings')
        .select('rating', { count: 'exact', head: false })
        .eq('place_id', place.id);
      if (!avgError && avgData) {
        const ratings = avgData.map((r: any) => r.rating);
        const avg = ratings.length > 0 ? ratings.reduce((a: number, b: number) => a + b, 0) / ratings.length : null;
        setAverageRating(avg);
        setRatingCount(ratings.length);
      }
      // Obtener rating del usuario
      if (user) {
        const { data: userData } = await supabase
          .from('ratings')
          .select('rating')
          .eq('place_id', place.id)
          .eq('user_id', user.id)
          .single();
        setUserRating(userData?.rating || null);
      } else {
        setUserRating(null);
      }
    };
    fetchRatings();
  }, [place, user]);

  useEffect(() => {
    // --- DATOS DE PRUEBA PARA CUPONES ---
    const TEST_COUPONS: Coupon[] = [
      {
        id: 'test-coupon-1',
        title: '10% de descuento',
        description: 'Obtén un 10% de descuento en tu compra',
        discount_percentage: 10,
        valid_from: '2025-04-01T00:00:00.000Z',
        valid_until: '2025-12-31T23:59:59.000Z',
        expires_at: '2025-12-31T23:59:59.000Z',
      },
      {
        id: 'test-coupon-2',
        title: '2x1 en cafés',
        description: 'Llévate dos cafés por el precio de uno',
        discount_amount: 100,
        valid_from: '2025-04-01T00:00:00.000Z',
        valid_until: '2025-12-31T23:59:59.000Z',
        expires_at: '2025-12-31T23:59:59.000Z',
      },
    ];
    // --- FIN DATOS DE PRUEBA ---
    setCoupons(TEST_COUPONS);
    setLoadingCoupons(false);
  }, []);

  useEffect(() => {
    const fetchUserCoupons = async () => {
      if (!user || !params.id) return;
      // Traer los cupones ya canjeados por el usuario para este negocio
      const { data, error } = await supabase
        .from('user_coupons')
        .select('coupon_id')
        .eq('user_id', user.id)
        .eq('place_id', params.id);
      if (!error && data) setUserCoupons(data.map((uc: any) => uc.coupon_id));
    };
    fetchUserCoupons();
  }, [user, params.id]);

  const handleRate = async (stars: number) => {
    if (!user) {
      Alert.alert('Debes iniciar sesión para puntuar.');
      return;
    }
    
    if (!place) {
      Alert.alert('Error', 'No se pudo cargar la información del negocio.');
      return;
    }
    
    setRatingLoading(true);
    try {
      // Upsert rating del usuario
      const { error } = await supabase
        .from('ratings')
        .upsert({ place_id: place.id, user_id: user.id, rating: stars }, { onConflict: 'place_id,user_id' });
        
      if (error) throw error;
      
      setUserRating(stars);
      
      // Refrescar promedio y cantidad
      const { data: avgData, error: avgError } = await supabase
        .from('ratings')
        .select('rating', { count: 'exact', head: false })
        .eq('place_id', place.id);
        
      if (avgError) throw avgError;
      
      if (avgData) {
        const ratings = avgData.map((r: any) => r.rating);
        const avg = ratings.length > 0 ? ratings.reduce((a: number, b: number) => a + b, 0) / ratings.length : null;
        
        setAverageRating(avg);
        setRatingCount(ratings.length);
        
        // Sincronizar promedio en places.rating
        if (avg !== null) {
          const { error: updateError } = await supabase
            .from('places')
            .update({ rating: avg })
            .eq('id', place.id);
            
          if (updateError) throw updateError;
          
          // Notificar a la pantalla principal y a la lista de locales que deben refrescar
          if (router.canGoBack()) {
            router.replace({ pathname: '/', params: { refreshTop: '1' } });
            router.replace({ pathname: '/places', params: { refreshPlaces: '1' } });
          }
        }
      }
      
      Alert.alert('¡Gracias por tu puntuación!', `Le diste ${stars} estrella${stars === 1 ? '' : 's'} a este negocio.`);
    } catch (error) {
      console.error('Error al guardar la puntuación:', error);
      Alert.alert('Error', 'No se pudo guardar la puntuación. Por favor, inténtalo de nuevo.');
    } finally {
      setRatingLoading(false);
    }
  };

  const handleRedeem = (couponId: string) => {
    if (!userMembership || userMembership.membership_name.toLowerCase() !== 'premium' || !userMembership.is_active) {
      Alert.alert(
        'Membresía requerida',
        'Necesitas una membresía Premium activa para canjear este cupón.'
      );
      return;
    }
    if (userCoupons.includes(couponId)) return;
    // Generar código y expiración 15 minutos
    const code = Math.random().toString(36).substring(2, 10).toUpperCase();
    const expires = new Date(Date.now() + 15 * 60 * 1000);
    setGeneratedCode(code);
    setRedeemCouponId(couponId);
    setCodeExpiresAt(expires);
    setShowCodeModal(true);
  };

  const handleQrScan = () => {
    setShowScanner(true);
    setShowCodeModal(false);
  };

  const handleQrScanned = async (qrData: string) => {
    setShowScanner(false);
    if (!place?.id || !redeemCouponId || !generatedCode || !codeExpiresAt) return;
    // Validar QR: debe contener el id del local y del cupón
    if (!qrData.includes(place.id) || !qrData.includes(redeemCouponId)) {
      Alert.alert('QR inválido', 'El QR no corresponde a este cupón o local.');
      return;
    }
    // Validar expiración del código
    if (new Date() > codeExpiresAt) {
      Alert.alert('Código expirado', 'El código generado ha expirado. Por favor, vuelve a canjear el cupón.');
      setGeneratedCode(null);
      setRedeemCouponId(null);
      setCodeExpiresAt(null);
      return;
    }
    // Registrar canje en user_coupons
    const { error } = await supabase.from('user_coupons').insert({
      user_id: user.id,
      coupon_id: redeemCouponId,
      place_id: place.id,
      code: generatedCode,
      redeemed_at: new Date().toISOString(),
      expires_at: codeExpiresAt.toISOString(),
    });
    if (!error) {
      setUserCoupons((prev) => [...prev, redeemCouponId]);
      Alert.alert('¡Canje exitoso!', `Tu código: ${generatedCode}`);
    } else {
      Alert.alert('Error', 'No se pudo registrar el canje.');
    }
    setShowCodeModal(false);
    setGeneratedCode(null);
    setRedeemCouponId(null);
    setCodeExpiresAt(null);
  };

  const handleQrSuccess = (coupon: Coupon) => {
    setSelectedCoupon(coupon);
    setShowValidation(true);
  };

  if (loading) {
    return (
      <View style={{flex:1, justifyContent:'center', alignItems:'center'}}>
        <ActivityIndicator size="large" color={YELLOW} />
        <Text>Cargando negocio...</Text>
      </View>
    );
  }

  if (notFound || !place) {
    return (
      <View style={{flex:1, justifyContent:'center', alignItems:'center'}}>
        <Text style={styles.notFound}>Negocio no encontrado</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>Volver</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Valores por defecto para campos opcionales
  const safePlace = {
    ...place,
    photo_url: place.photo_url || 'https://via.placeholder.com/300x200?text=Sin+logo',
    whatsapp: place.whatsapp || '',
    phone: place.phone || '',
    address: place.address || 'Dirección no disponible',
    description: place.description || 'Sin descripción disponible',
    category: place.category || 'Sin categoría'
  };

  return (
    <ScrollView contentContainerStyle={{ alignItems: 'center', paddingBottom: 40 }} style={{ backgroundColor: '#f5f5f5' }}>
      <Image source={{ uri: safePlace.photo_url }} style={styles.image} />
      {/* Card principal */}
      <View style={[styles.card, CARD_SHADOW]}>
        <View style={styles.headerRow}>
          <Text style={styles.name}>{safePlace.name}</Text>
          <View style={styles.badge}><Text style={styles.badgeText}>{safePlace.category}</Text></View>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
          <StarRating value={userRating || 0} onRate={handleRate} disabled={ratingLoading} />
          <Text style={{ marginLeft: 8, fontSize: 16, color: '#888' }}>
            {averageRating ? `${averageRating.toFixed(1)} / 5` : 'Sin puntuación'}
            {ratingCount > 0 ? ` (${ratingCount} voto${ratingCount === 1 ? '' : 's'})` : ''}
          </Text>
        </View>
        <Text style={styles.description}>{safePlace.description}</Text>
        {/* Botones de acción grandes y circulares */}
        <View style={styles.actionRow}>
          <TouchableOpacity 
            style={styles.circleBtn} 
            onPress={() => safePlace.whatsapp && Linking.openURL(`https://wa.me/${safePlace.whatsapp.replace(/[^\d]/g, '')}?text=¡Hola! Me gustaría consultar sobre ${safePlace.name}`)}
            disabled={!safePlace.whatsapp}
          >
            <FontAwesome name="whatsapp" size={28} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.circleBtn} 
            onPress={() => safePlace.address && Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(safePlace.address)}`)}
            disabled={!safePlace.address}
          >
            <FontAwesome name="map-marker" size={28} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.circleBtn} 
            onPress={() => safePlace.phone && Linking.openURL(`tel:${safePlace.phone.replace(/[^\d+]/g, '')}`)}
            disabled={!safePlace.phone}
          >
            <FontAwesome name="phone" size={28} color="#fff" />
          </TouchableOpacity>
        </View>
        <View style={styles.actionLabels}>
          <Text style={[styles.actionLabel, !safePlace.whatsapp && styles.disabledLabel]}>WhatsApp</Text>
          <Text style={[styles.actionLabel, !safePlace.address && styles.disabledLabel]}>Ubicación</Text>
          <Text style={[styles.actionLabel, !safePlace.phone && styles.disabledLabel]}>Llamar</Text>
        </View>
        {/* Dirección y teléfono */}
        <View style={styles.infoRow}>
          <FontAwesome name="map-pin" size={18} color={YELLOW} />
          <Text style={styles.info}>{safePlace.address}</Text>
        </View>
        <View style={styles.infoRow}>
          <FontAwesome name="phone" size={18} color={YELLOW} />
          <Text style={styles.info}>{safePlace.phone || 'No disponible'}</Text>
        </View>
        {/* Horarios con fondo suave y badge "Abierto ahora" */}
        {Array.isArray(safePlace.hours) && safePlace.hours.length > 0 ? (
          safePlace.hours.map((h: PlaceHour, i: number) => {
            const days = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
            if (!h) return null;
            if (h.closed) {
              return (
                <Text key={i} style={styles.hoursText}>
                  <Text style={{fontWeight:'bold'}}>{days[i] || ''}: </Text>
                  Cerrado
                </Text>
              );
            }
            // Validar formato de hora (HH:mm)
            const open = h.open && /^\d{2}:\d{2}$/.test(h.open) ? h.open : '--:--';
            const close = h.close && /^\d{2}:\d{2}$/.test(h.close) ? h.close : '--:--';
            return (
              <Text key={i} style={styles.hoursText}>
                <Text style={{fontWeight:'bold'}}>{days[i] || ''}: </Text>
                {open} - {close}
              </Text>
            );
          })
        ) : (
          <Text style={styles.hoursText}>No hay horarios cargados.</Text>
        )}
      </View>
      {/* Sección de cupones */}
      {!loadingCoupons && coupons.length > 0 && (
        <View style={styles.couponSection}>
          <Text style={styles.couponTitle}>Cupones de descuento</Text>
          {coupons.map((coupon: Coupon) => {
            const yaCanjeado = userCoupons.includes(coupon.id);
            return (
              <View key={coupon.id} style={styles.couponCard}>
                <View style={styles.couponLeftBar} />
                <View style={styles.couponInfo}>
                  <Text style={styles.couponHeaderText}>{coupon.title || 'Cupón de descuento'}</Text>
                  <Text style={styles.couponDiscount}>{coupon.discount_percentage ? `-${coupon.discount_percentage}%` : coupon.discount_amount ? `-$${coupon.discount_amount}` : ''}</Text>
                  <Text style={styles.couponDesc}>{coupon.description}</Text>
                  <Text style={styles.couponTerms}>Válido hasta: {coupon.expires_at ? new Date(coupon.expires_at).toLocaleDateString() : 'Sin fecha'}</Text>
                  <TouchableOpacity
                    style={[styles.redeemBtn, yaCanjeado && styles.redeemBtnDisabled]}
                    onPress={() => {
                      if (yaCanjeado) return;
                      if (!userMembership || userMembership.membership_name.toLowerCase() !== 'premium') {
                        setUpgradeModal(true);
                        return;
                      }
                      handleRedeem(coupon.id);
                    }}
                    disabled={yaCanjeado}
                  >
                    <Text style={styles.redeemBtnText}>
                      {yaCanjeado ? 'Ya canjeado' : 'Canjear'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </View>
      )}
      <TouchableOpacity onPress={() => router.replace('/(app)/places')} style={styles.fabBack}>
        <Text style={styles.fabBackText}>← Volver</Text>
      </TouchableOpacity>
      <CouponUpgradeModal
        visible={upgradeModal}
        onClose={() => setUpgradeModal(false)}
        onUpgrade={() => {
          setUpgradeModal(false);
          router.push('/(app)/memberships');
        }}
      />
      {showCodeModal && (
        <View style={{ position: 'absolute', left: 0, top: 0, width: '100%', height: '100%', backgroundColor: '#0008', zIndex: 99, justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ backgroundColor: '#fff', borderRadius: 16, padding: 28, alignItems: 'center', width: 320 }}>
            <Text style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 10 }}>¡Cupón generado!</Text>
            <Text style={{ fontSize: 16, marginBottom: 12 }}>Tu código de canje (válido por 15 minutos):</Text>
            <Text selectable style={{ fontSize: 26, fontWeight: 'bold', letterSpacing: 2, color: '#fbaa30', marginBottom: 16 }}>{generatedCode}</Text>
            <Text style={{ color: '#888', marginBottom: 16, fontSize: 15 }}>
              Expira: {codeExpiresAt ? codeExpiresAt.toLocaleTimeString() : ''}
            </Text>
            <TouchableOpacity style={[styles.redeemBtn, { marginBottom: 10 }]} onPress={handleQrScan}>
              <Text style={styles.redeemBtnText}>Escanear QR del local</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.fabBack} onPress={() => { setShowCodeModal(false); setGeneratedCode(null); setRedeemCouponId(null); setCodeExpiresAt(null); }}>
              <Text style={styles.fabBackText}>Cerrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
      <RedeemQrScanner visible={showScanner} onClose={() => setShowScanner(false)} onSuccess={handleQrScanned} />
      {showValidation && selectedCoupon && user && place && (
        <CouponCodeValidation
          placeId={place.id}
          userId={user.id}
          couponId={selectedCoupon.id}
          onSuccess={() => {
            setShowValidation(false);
            setSelectedCoupon(null);
            Alert.alert('¡Cupón canjeado con éxito!');
          }}
        />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  image: {
    width: '100%',
    height: 210,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    marginBottom: -36,
  },
  card: {
    width: '90%',
    backgroundColor: '#fff',
    borderRadius: 22,
    marginTop: -32,
    marginBottom: 18,
    padding: 20,
    ...CARD_SHADOW,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
    gap: 12,
  },
  name: {
    fontFamily: 'Inter_700Bold',
    fontSize: 24,
    color: '#222',
    flex: 1,
    marginRight: 8,
  },
  badge: {
    backgroundColor: YELLOW,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: 'flex-start',
  },
  badgeText: {
    fontFamily: 'Inter_600SemiBold',
    color: '#fff',
    fontSize: 13,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 4,
  },
  ratingValue: {
    fontFamily: 'Inter_600SemiBold',
    color: YELLOW,
    fontSize: 16,
    marginLeft: 7,
  },
  description: {
    fontFamily: 'Inter_400Regular',
    color: '#444',
    fontSize: 15,
    marginBottom: 14,
    marginTop: 2,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginVertical: 12,
    gap: 16,
  },
  circleBtn: {
    backgroundColor: YELLOW,
    width: 54,
    height: 54,
    borderRadius: 27,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 6,
    shadowColor: YELLOW,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.14,
    shadowRadius: 8,
    elevation: 2,
  },
  actionLabels: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 10,
    marginTop: -6,
  },
  actionLabel: {
    fontFamily: 'Inter_400Regular',
    color: '#555',
    fontSize: 13,
    width: 64,
    textAlign: 'center',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
    gap: 6,
  },
  info: {
    fontFamily: 'Inter_400Regular',
    color: '#333',
    fontSize: 15,
    marginLeft: 6,
  },
  hoursBlock: {
    backgroundColor: SOFT_BG,
    borderRadius: 12,
    padding: 10,
    marginTop: 8,
    marginBottom: 12,
  },
  hoursTitle: {
    fontFamily: 'Inter_600SemiBold',
    color: '#333',
    fontSize: 15,
    marginRight: 8,
  },
  openBadge: {
    backgroundColor: '#27c17c',
    color: '#fff',
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginLeft: 7,
    overflow: 'hidden',
  },
  hoursText: {
    fontFamily: 'Inter_400Regular',
    color: '#555',
    fontSize: 14,
    marginBottom: 1,
  },
  couponSection: {
    width: '90%',
    marginTop: 4,
    marginBottom: 20,
  },
  couponTitle: {
    fontFamily: 'Inter_700Bold',
    color: YELLOW,
    fontSize: 20,
    marginBottom: 12,
    marginLeft: 2,
  },
  couponCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 16,
    minHeight: 100,
    ...CARD_SHADOW,
    position: 'relative',
  },
  couponLeftBar: {
    width: 8,
    borderTopLeftRadius: 16,
    borderBottomLeftRadius: 16,
    backgroundColor: YELLOW,
    marginRight: 12,
  },
  couponInfo: {
    flex: 1,
    padding: 12,
    paddingLeft: 0,
    justifyContent: 'center',
  },
  couponHeaderText: {
    fontFamily: 'Inter_600SemiBold',
    color: '#222',
    fontSize: 16,
    marginBottom: 2,
  },
  couponDiscount: {
    fontFamily: 'Inter_700Bold',
    color: YELLOW,
    fontSize: 22,
    marginBottom: 0,
  },
  couponDesc: {
    fontFamily: 'Inter_400Regular',
    color: '#555',
    fontSize: 14,
    marginBottom: 2,
  },
  couponTerms: {
    fontFamily: 'Inter_400Regular',
    color: '#888',
    fontSize: 13,
    marginBottom: 8,
  },
  redeemBtn: {
    backgroundColor: YELLOW,
    borderRadius: 22,
    paddingVertical: 10,
    paddingHorizontal: 32,
    alignSelf: 'flex-end',
    marginTop: 6,
    marginBottom: 2,
    shadowColor: YELLOW,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.09,
    shadowRadius: 4,
    elevation: 1,
  },
  redeemBtnDisabled: {
    backgroundColor: '#eee',
    shadowColor: 'transparent',
  },
  redeemBtnText: {
    color: '#222',
    fontFamily: 'Inter_700Bold',
    fontSize: 15,
  },
  fabBack: {
    marginTop: 10,
    backgroundColor: '#FFF9E3',
    borderRadius: 20,
    paddingHorizontal: 24,
    paddingVertical: 8,
    alignSelf: 'center',
    shadowColor: YELLOW,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  fabBackText: {
    color: YELLOW,
    fontFamily: 'Inter_700Bold',
    fontSize: 16,
    textAlign: 'center',
  },
  notFound: {
    fontFamily: 'Inter_700Bold',
    fontSize: 20,
    color: '#888',
    marginBottom: 8,
  },
  backBtn: {
    backgroundColor: YELLOW,
    borderRadius: 16,
    paddingHorizontal: 24,
    paddingVertical: 10,
    marginTop: 10,
  },
  backBtnText: {
    color: '#fff',
    fontFamily: 'Inter_700Bold',
    fontSize: 15,
  },
  disabledLabel: {
    opacity: 0.5,
  },
});
