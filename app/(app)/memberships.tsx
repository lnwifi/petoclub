import { View, Text, StyleSheet, TouchableOpacity, Image as RNImage, ScrollView, Alert, Modal, Platform, ActivityIndicator } from 'react-native';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '../../lib/auth-context';
import { Check, X, CreditCard, Gift, Tag, ShoppingBag, Image, Crown } from 'lucide-react-native';
import { useFonts, Inter_400Regular, Inter_500Medium, Inter_700Bold } from '@expo-google-fonts/inter';
import { Stack } from 'expo-router';
import { Linking } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

// Definir tipos
type MembershipType = {
  id: string;
  name: string;
  description: string;
  max_pets: number;
  max_photos_per_pet: number;
  max_interests_per_pet: number;
  has_ads: boolean;
  has_coupons: boolean;
  has_store_discount: boolean;
  price: number;
};

type UserMembership = {
  membership_id: string;
  membership_name: string;
  membership_description: string;
  max_pets: number;
  max_photos_per_pet: number;
  max_interests_per_pet: number;
  has_ads: boolean;
  has_coupons: boolean;
  has_store_discount: boolean;
  price: number;
  start_date: string;
  end_date: string | null;
  is_active: boolean;
  status: string;
  membership_type_name: string;
  membership_type_id: string;
};

type Pet = {
  id: string;
  name: string;
  owner_id: string;
  is_active: boolean;
  image_url: string;
};

export default function MembershipsScreen() {
  const { user, session } = useAuth();
  const navigation = useRouter();
  const [membershipTypes, setMembershipTypes] = useState<MembershipType[]>([]);
  const [userMembership, setUserMembership] = useState<UserMembership | null>(null);
  const [loading, setLoading] = useState(true);
  const [userPets, setUserPets] = useState<Pet[]>([]);
  // Modal de selección de mascota se maneja globalmente por contexto, no localmente aquí.
  // Detectar membresía activa por nombre (como en coupons.tsx)
  const isFreeActive = userMembership && userMembership.membership_name === 'Gratuita';
  
  // State for pet selection modal
  const [showPetSelectModal, setShowPetSelectModal] = useState(false);
  const [selectedPetId, setSelectedPetId] = useState<string | null>(null);

  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_700Bold,
  });

  useEffect(() => {
    if (session) {
      loadMembershipData();
      loadUserPets();
    }
  }, [session]);

  // La lógica de mostrar el modal de selección de mascota ahora es global mediante contexto.

  const loadMembershipData = async () => {
    try {
      setLoading(true);

      // Cargar tipos de membresía
      const { data: membershipTypesData, error: membershipTypesError } = await supabase
        .from('membership_types')
        .select('*')
        .order('price', { ascending: true });

      if (membershipTypesError) {
  
        Alert.alert('Error', 'No se pudieron cargar los tipos de membresía');
        return;
      }

      setMembershipTypes(membershipTypesData || []);

      // Cargar membresía del usuario
      const { data: userMembershipData, error: userMembershipError } = await supabase
        .rpc('get_user_membership', { user_id: session?.user.id });

      if (userMembershipError) {

        Alert.alert('Error', 'No se pudo cargar tu membresía actual');
        return;
      }

      if (userMembershipData && userMembershipData.length > 0) {
        setUserMembership(userMembershipData[0]);
      }
    } catch (error) {
      console.error('Error inesperado:', error);
      Alert.alert('Error', 'Ocurrió un error inesperado');
    } finally {
      setLoading(false);
    }
  };

  const loadUserPets = async () => {
    if (!session || !session.user) return;
    const { data, error } = await supabase
      .from('pets')
      .select('*')
      .eq('owner_id', session.user.id);
    if (!error) setUserPets(data);
  };

  // --- Cambiar a premium y activar mascotas automáticamente ---
  const handleMembershipChange = async (type: MembershipType) => {

    if (!session?.user) {
      Alert.alert('Error', 'No hay sesión de usuario.');
      return;
    }
    try {
      if (type.name === 'Gratuita') {
        if (userPets.length > 1) {
          // Modal de selección de mascota ahora es global/contexto.
          return;
        } else if (userPets.length === 1) {
          await confirmDowngrade(userPets[0].id);
        } else {
          Alert.alert('No tienes mascotas registradas');
        }
        return;
      }
      // Lógica para upgrade a Premium

      const { data, error } = await supabase.functions.invoke('create_payment_preference', {
        body: JSON.stringify({
          tipo: 'membresia',
          price: type.price,
          title: 'Membresía Premium por 30 días',
          user_id: session.user.id,
          metadata: {
            membership_type_id: type.id,
            membership_type: type.name.toLowerCase()
          }
        })
      });

      if (error) {
        Alert.alert('Error', `Supabase error: ${error.message || error}`);
        throw error;
      }
      // Parsear la respuesta si es un string JSON
      let paymentData = data;
      if (typeof data === 'string') {
        try {
          paymentData = JSON.parse(data);
        } catch (e) {
          Alert.alert('Error', 'La respuesta de pago no es válida.');
          return;
        }
      }
      if (paymentData?.init_point) {

        if (Platform.OS === 'web') {
          window.open(paymentData.init_point, '_blank', 'noopener,noreferrer');
        } else {
          await WebBrowser.openBrowserAsync(paymentData.init_point);
        }
      } else {
        Alert.alert('Error', 'No se recibió un enlace de pago de MercadoPago.');
      }
    } catch (error) {

      Alert.alert('Error', 'No se pudo procesar el pago. Por favor, inténtalo de nuevo.');
    }
  };

  const upgradeMembership = async (membershipTypeId: string) => {
    try {
      if (!session || !session.user) throw new Error('Sesión no válida');
      // Si ya tiene esa membresía, no hacer nada
      if (userMembership && userMembership.membership_type_id === membershipTypeId) {
        Alert.alert('Información', 'Ya tienes esta membresía');
        return;
      }

      const isPremium = membershipTypeId !== membershipTypes[0]?.id;

      if (isPremium) {
        // Actualizar membresía y activar todas las mascotas en el mismo flujo
        const { data, error } = await supabase
          .rpc('update_user_membership', {
            p_user_id: session?.user.id,
            p_membership_type_id: membershipTypeId
          });
        if (error) {
  
          Alert.alert('Error', 'No se pudo actualizar tu membresía');
          return;
        }
        // ACTIVAR TODAS LAS MASCOTAS
        const { error: petsError } = await supabase
          .from('pets')
          .update({ is_active: true })
          .eq('owner_id', session.user.id);
        if (petsError) {

          Alert.alert('Error', 'No se pudieron activar tus mascotas');
        }
        // Forzar refresco del estado de autenticación
        const { data: { session: newSession } } = await supabase.auth.getSession();
        
        // Recargar datos
        await Promise.all([
          loadUserPets(),
          loadMembershipData()
        ]);
        
        Alert.alert('¡Éxito!', 'Tu membresía ha sido actualizada exitosamente. Los cambios se reflejarán en breve.');
        
        // Navegar de vuelta a la pantalla anterior con un parámetro de recarga
        if (navigation.canGoBack()) {
          navigation.replace({
            pathname: '/',
            params: { refreshMembership: new Date().getTime() }
          });
        }
      } else {
        // Downgrade a membresía gratuita
        // Mostrar modal para elegir mascota si hay más de una
        if (userPets.length > 1) {
          // Modal de selección de mascota ahora es global, no se maneja aquí.
        } else {
          await handleDowngradeToFree();
        }
      }
    } catch (error) {
      console.error('Error inesperado:', error);
      Alert.alert('Error', 'Ocurrió un error inesperado');
    }
  };

  const handleDowngradeToFree = async () => {
    if (userPets.length > 1) {
      // Modal de selección de mascota ahora es global/contexto.
    } else if (userPets.length === 1) {
      await confirmDowngrade(userPets[0].id);
    } else {
      Alert.alert('No tienes mascotas registradas');
    }
  };

  const confirmDowngrade = async (petId: string) => {
    if (!session || !session.user) return;
    await supabase
      .from('pets')
      .update({ is_active: false })
      .eq('owner_id', session.user.id)
      .neq('id', petId);
    await supabase
      .from('pets')
      .update({ is_active: true })
      .eq('id', petId);
    await downgradeMembershipToFree();
    loadUserPets();
    loadMembershipData();
    Alert.alert('¡Éxito!', 'Tu membresía ha sido actualizada y la mascota seleccionada quedó activa.');
  };

  const downgradeMembershipToFree = async () => {
    const { data, error } = await supabase
      .rpc('update_user_membership', {
        p_user_id: session?.user.id,
        p_membership_type_id: membershipTypes[0]?.id
      });

    if (error) {
      Alert.alert('Error', 'No se pudo actualizar tu membresía');
      return;
    }
    Alert.alert('¡Éxito!', 'Tu membresía ha sido actualizada exitosamente.');
  };

  const handleUpgradeToPremium = async (membershipTypeId: string) => {
    try {
      await upgradeMembership(membershipTypeId);
    } catch (error) {
      console.error('Error inesperado:', error);
      Alert.alert('Error', 'Ocurrió un error inesperado');
    }
  };

  if (!fontsLoaded) {
    return null;
  }

  console.log('DEBUG userMembership:', userMembership);
  console.log('DEBUG membershipTypes:', membershipTypes);

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Membresías' }} />
      
      <ScrollView style={styles.scrollView}>
        {/* Título principal */}
        <View style={styles.sectionContainer}>
          <Text style={styles.title}>Elige tu membresía</Text>
          {isFreeActive && (
            <Text style={styles.subtitle}>Cambiar plan</Text>
          )}
        </View>

        {/* Membresía actual */}
        <View style={styles.sectionContainer}>
          {loading ? (
            <Text style={styles.loadingText}>Cargando información de membresía...</Text>
          ) : userMembership ? (
            <View style={styles.currentMembershipCard}>
              <View style={styles.membershipHeader}>
                <Text style={styles.membershipName}>{userMembership.membership_name}</Text>
                {userMembership.membership_name === 'Premium' && (
                  <View style={{ backgroundColor: 'transparent', borderWidth: 0, borderColor: 'transparent', padding: 0, borderRadius: 0, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Crown size={16} color="#ffbc4c" style={{ marginRight: 4 }} />
                    <Text style={[styles.premiumBadgeText, { color: '#ffbc4c', backgroundColor: 'transparent', borderWidth: 0, borderColor: 'transparent', padding: 0, borderRadius: 0 }]}>PREMIUM</Text>
                  </View>
                )}
              </View>
              
              {userMembership.end_date && (
                <Text style={styles.expirationDate}>
                  Válido hasta: {new Date(userMembership.end_date).toLocaleDateString()}
                </Text>
              )}
            </View>
          ) : (
            <Text style={styles.noMembershipText}>No tienes una membresía activa</Text>
          )}
        </View>
        
        {/* Comparación de membresías */}
        <Text style={styles.sectionTitle}>Comparación de membresías</Text>
        
        <View style={styles.comparisonContainer}>
          <View style={styles.comparisonHeader}>
            <Text style={styles.comparisonFeature}>Característica</Text>
            {membershipTypes.map(type => (
              <Text key={type.id} style={styles.comparisonPlan}>
                {type.name}
              </Text>
            ))}
          </View>
          
          {/* Filas de comparación */}
          <View style={styles.comparisonRow}>
            <Text style={styles.comparisonFeature}>Mascotas</Text>
            {membershipTypes.map(type => (
              <Text key={type.id} style={styles.comparisonValue}>
                {type.max_pets}
              </Text>
            ))}
          </View>
          
          <View style={styles.comparisonRow}>
            <Text style={styles.comparisonFeature}>Fotos por mascota</Text>
            {membershipTypes.map(type => (
              <Text key={type.id} style={styles.comparisonValue}>
                {type.max_photos_per_pet}
              </Text>
            ))}
          </View>
          
          <View style={styles.comparisonRow}>
            <Text style={styles.comparisonFeature}>Intereses por mascota</Text>
            {membershipTypes.map(type => (
              <Text key={type.id} style={styles.comparisonValue}>
                {type.max_interests_per_pet}
              </Text>
            ))}
          </View>
          
          <View style={styles.comparisonRow}>
            <Text style={styles.comparisonFeature}>Sin publicidad</Text>
            {membershipTypes.map(type => (
              <View key={type.id} style={styles.comparisonIconContainer}>
                {!type.has_ads ? (
                  <Check size={18} color="#4CAF50" />
                ) : (
                  <X size={18} color="#ff4c4c" />
                )}
              </View>
            ))}
          </View>
          
          <View style={styles.comparisonRow}>
            <Text style={styles.comparisonFeature}>Cupones de descuento</Text>
            {membershipTypes.map(type => (
              <View key={type.id} style={styles.comparisonIconContainer}>
                {type.has_coupons ? (
                  <Check size={18} color="#4CAF50" />
                ) : (
                  <X size={18} color="#ff4c4c" />
                )}
              </View>
            ))}
          </View>
          
          <View style={styles.comparisonRow}>
            <Text style={styles.comparisonFeature}>Descuentos en tienda</Text>
            {membershipTypes.map(type => (
              <View key={type.id} style={styles.comparisonIconContainer}>
                {type.has_store_discount ? (
                  <Check size={18} color="#4CAF50" />
                ) : (
                  <X size={18} color="#ff4c4c" />
                )}
              </View>
            ))}
          </View>
          
          <View style={styles.comparisonRow}>
            <Text style={styles.comparisonFeature}>Precio</Text>
            {membershipTypes.map(type => (
              <Text key={type.id} style={styles.comparisonValue}>
                {type.price > 0 ? `$${type.price}/mes` : 'Gratis'}
              </Text>
            ))}
          </View>
        </View>
        
        {/* Tarjetas de membresía - solo mostrar la que no está activa */}
        <Text style={styles.sectionTitle}>Cambiar plan</Text>
        
        <View style={styles.membershipCardsContainer}>
          {userMembership && membershipTypes.length > 0 ? (
            membershipTypes
              .filter(type => type.id !== userMembership.membership_type_id && type.id !== membershipTypes[0]?.id)
              .map(type => (
                <View key={type.id} style={[
                  styles.membershipCard,
                  type.name === 'Premium' && styles.premiumCard
                ]}>
                  <View style={styles.membershipCardHeader}>
                    <Text style={[
                      styles.membershipCardTitle,
                      type.name === 'Premium' && styles.premiumCard
                    ]}>
                      {type.name}
                    </Text>
                    {type.name === 'Premium' && (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                        <Crown size={16} color="#ffbc4c" style={{ marginRight: 4 }} />
                      </View>
                    )}
                    {type.price > 0 ? (
                      <Text style={styles.membershipCardPrice}>${type.price}<Text style={styles.perMonth}>/mes</Text></Text>
                    ) : (
                      <Text style={styles.membershipCardPrice}>Gratis</Text>
                    )}
                  </View>
                  <View style={styles.membershipCardFeatures}>
                    <View style={styles.membershipCardFeature}>
                      <View style={styles.featureIconContainer}>
                        <CreditCard size={18} color={type.name === 'Premium' ? "#ffbc4c" : "#666"} />
                      </View>
                      <Text style={styles.featureText}>{type.max_pets} {type.max_pets === 1 ? 'mascota' : 'mascotas'}</Text>
                    </View>
                    
                    <View style={styles.membershipCardFeature}>
                      <View style={styles.featureIconContainer}>
                        <Image size={18} color={type.name === 'Premium' ? "#ffbc4c" : "#666"} />
                      </View>
                      <Text style={styles.featureText}>{type.max_photos_per_pet} {type.max_photos_per_pet === 1 ? 'foto' : 'fotos'} por mascota</Text>
                    </View>
                    
                    <View style={styles.membershipCardFeature}>
                      <View style={styles.featureIconContainer}>
                        <Tag size={18} color={type.name === 'Premium' ? "#ffbc4c" : "#666"} />
                      </View>
                      <Text style={styles.featureText}>{type.max_interests_per_pet} intereses por mascota</Text>
                    </View>
                    
                    {!type.has_ads && (
                      <View style={styles.membershipCardFeature}>
                        <View style={styles.featureIconContainer}>
                          <Check size={18} color={type.name === 'Premium' ? "#ffbc4c" : "#666"} />
                        </View>
                        <Text style={styles.featureText}>Sin publicidad</Text>
                      </View>
                    )}
                    
                    {type.has_coupons && (
                      <View style={styles.membershipCardFeature}>
                        <View style={styles.featureIconContainer}>
                          <Gift size={18} color={type.name === 'Premium' ? "#ffbc4c" : "#666"} />
                        </View>
                        <Text style={styles.featureText}>Cupones de descuento</Text>
                      </View>
                    )}
                    
                    {type.has_store_discount && (
                      <View style={styles.membershipCardFeature}>
                        <View style={styles.featureIconContainer}>
                          <ShoppingBag size={18} color={type.name === 'Premium' ? "#ffbc4c" : "#666"} />
                        </View>
                        <Text style={styles.featureText}>Descuentos en tienda</Text>
                      </View>
                    )}
                  </View>
                  
                  <TouchableOpacity
                    style={[
                      styles.membershipCardButton,
                      type.name === 'Premium' && styles.premiumCardButton
                    ]}
                    onPress={() => handleMembershipChange(type)}
                  >
                    <Text style={[
                      styles.membershipCardButtonText,
                      type.name === 'Premium' && styles.premiumCardButtonText
                    ]}>
                      {type.name === 'Premium' ? 'Actualizar a Premium' : 'Cambiar a plan gratuito'}
                    </Text>
                  </TouchableOpacity>
                </View>
              ))
          ) : (
            <Text style={styles.loadingText}>Cargando opciones de cambio de plan...</Text>
          )}
        </View>
      </ScrollView>
      {/* Modal de selección de mascota ahora es global/contexto. */}
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
  sectionContainer: {
    marginBottom: 20,
    paddingHorizontal: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: 'Inter_700Bold',
    color: '#333',
    marginBottom: 16,
    marginTop: 24,
  },
  currentMembershipContainer: {
    marginBottom: 16,
  },
  loadingText: {
    fontFamily: 'Inter_400Regular',
    color: '#666',
    textAlign: 'center',
    marginVertical: 16,
  },
  currentMembershipCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  premiumBadge: {
    backgroundColor: '#ffbc4c',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  premiumBadgeText: {
    color: '#fff',
    fontFamily: 'Inter_700Bold',
    fontSize: 12,
  },
  membershipHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  membershipName: {
    fontSize: 18,
    fontFamily: 'Inter_700Bold',
    color: '#333',
  },
  expirationDate: {
    fontFamily: 'Inter_400Regular',
    color: '#666',
    fontSize: 12,
    textAlign: 'right',
  },
  noMembershipText: {
    fontFamily: 'Inter_400Regular',
    color: '#666',
    textAlign: 'center',
    marginVertical: 16,
  },
  comparisonContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  comparisonHeader: {
    flexDirection: 'row',
    backgroundColor: '#f0f0f0',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  comparisonFeature: {
    flex: 2,
    fontFamily: 'Inter_500Medium',
    color: '#333',
  },
  comparisonPlan: {
    flex: 1,
    fontFamily: 'Inter_700Bold',
    color: '#333',
    textAlign: 'center',
  },
  comparisonRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  comparisonValue: {
    flex: 1,
    fontFamily: 'Inter_400Regular',
    color: '#333',
    textAlign: 'center',
  },
  comparisonIconContainer: {
    flex: 1,
    alignItems: 'center',
  },
  membershipCardsContainer: {
    marginBottom: 32,
  },
  membershipCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    overflow: 'hidden',
  },
  premiumCard: {
    borderWidth: 2,
    borderColor: '#ffbc4c',
    borderRadius: 16,
  },
  membershipCardHeader: {
    padding: 16,
    backgroundColor: '#f9f9f9',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  membershipCardTitle: {
    fontSize: 18,
    fontFamily: 'Inter_700Bold',
    color: '#333',
    marginBottom: 8,
  },
  membershipCardPrice: {
    fontSize: 24,
    fontFamily: 'Inter_700Bold',
    color: '#333',
  },
  perMonth: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: '#666',
  },
  membershipCardFeatures: {
    padding: 16,
  },
  membershipCardFeature: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  featureIconContainer: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  featureText: {
    fontFamily: 'Inter_400Regular',
    color: '#666',
    flex: 1,
  },
  membershipCardButton: {
    backgroundColor: '#f0f0f0',
    paddingVertical: 12,
    alignItems: 'center',
  },
  premiumCardButton: {
    backgroundColor: '#ffbc4c',
  },
  membershipCardButtonText: {
    color: '#333',
    fontFamily: 'Inter_600SemiBold',
    fontSize: 16,
  },
  premiumCardButtonText: {
    color: '#fff',
    fontFamily: 'Inter_700Bold',
    fontSize: 16,
  },
});
