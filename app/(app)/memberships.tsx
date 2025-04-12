import { View, Text, StyleSheet, TouchableOpacity, Image as RNImage, ScrollView, Alert } from 'react-native';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { Check, X, CreditCard, Gift, Tag, ShoppingBag, Image } from 'lucide-react-native';
import { useFonts, Inter_400Regular, Inter_500Medium, Inter_700Bold } from '@expo-google-fonts/inter';
import { Stack } from 'expo-router';

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
};

export default function MembershipsScreen() {
  const [membershipTypes, setMembershipTypes] = useState<MembershipType[]>([]);
  const [userMembership, setUserMembership] = useState<UserMembership | null>(null);
  const [loading, setLoading] = useState(true);
  const { session } = useAuth();

  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_700Bold,
  });

  useEffect(() => {
    if (session) {
      loadMembershipData();
    }
  }, [session]);

  const loadMembershipData = async () => {
    try {
      setLoading(true);

      // Cargar tipos de membresía
      const { data: membershipTypesData, error: membershipTypesError } = await supabase
        .from('membership_types')
        .select('*')
        .order('price', { ascending: true });

      if (membershipTypesError) {
        console.error('Error al cargar tipos de membresía:', membershipTypesError);
        Alert.alert('Error', 'No se pudieron cargar los tipos de membresía');
        return;
      }

      setMembershipTypes(membershipTypesData || []);

      // Cargar membresía del usuario
      const { data: userMembershipData, error: userMembershipError } = await supabase
        .rpc('get_user_membership', { user_id: session?.user.id });

      if (userMembershipError) {
        console.error('Error al cargar membresía del usuario:', userMembershipError);
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

  const upgradeMembership = async (membershipTypeId: string) => {
    try {
      // Si ya tiene esa membresía, no hacer nada
      if (userMembership && userMembership.membership_id === membershipTypeId) {
        Alert.alert('Información', 'Ya tienes esta membresía');
        return;
      }

      // Aquí se integraría un procesador de pagos para membresías premium
      // Por ahora, solo actualizamos directamente para demostración
      const isPremium = membershipTypeId !== membershipTypes[0]?.id;
      
      if (isPremium) {
        Alert.alert(
          'Actualizar a Premium',
          '¿Estás seguro que deseas actualizar a la membresía Premium?',
          [
            {
              text: 'Cancelar',
              style: 'cancel',
            },
            {
              text: 'Actualizar',
              onPress: async () => {
                // Simular procesamiento de pago
                Alert.alert('Procesando pago...', 'Esto es una simulación');
                
                // Actualizar membresía
                const { data, error } = await supabase
                  .rpc('update_user_membership', {
                    p_user_id: session?.user.id,
                    p_membership_type_id: membershipTypeId,
                    // Para demostración, establecer fecha de fin a 30 días
                    p_end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
                  });

                if (error) {
                  console.error('Error al actualizar membresía:', error);
                  Alert.alert('Error', 'No se pudo actualizar tu membresía');
                  return;
                }

                Alert.alert('¡Éxito!', 'Tu membresía ha sido actualizada correctamente');
                loadMembershipData();
              }
            }
          ]
        );
      } else {
        // Downgrade a membresía gratuita
        Alert.alert(
          'Cambiar a membresía gratuita',
          'Cambiar a la membresía gratuita puede limitar algunas funciones. ¿Deseas continuar?',
          [
            {
              text: 'Cancelar',
              style: 'cancel',
            },
            {
              text: 'Continuar',
              onPress: async () => {
                const { data, error } = await supabase
                  .rpc('update_user_membership', {
                    p_user_id: session?.user.id,
                    p_membership_type_id: membershipTypeId
                  });

                if (error) {
                  console.error('Error al actualizar membresía:', error);
                  Alert.alert('Error', 'No se pudo actualizar tu membresía');
                  return;
                }

                Alert.alert('¡Éxito!', 'Tu membresía ha sido actualizada correctamente');
                loadMembershipData();
              }
            }
          ]
        );
      }
    } catch (error) {
      console.error('Error inesperado:', error);
      Alert.alert('Error', 'Ocurrió un error inesperado');
    }
  };

  if (!fontsLoaded) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Membresías' }} />
      
      <ScrollView style={styles.scrollView}>
        {/* Membresía actual */}
        <View style={styles.currentMembershipContainer}>
          <Text style={styles.sectionTitle}>Tu membresía actual</Text>
          
          {loading ? (
            <Text style={styles.loadingText}>Cargando información de membresía...</Text>
          ) : userMembership ? (
            <View style={styles.currentMembershipCard}>
              <View style={styles.membershipHeader}>
                <Text style={styles.membershipName}>{userMembership.membership_name}</Text>
                {userMembership.membership_name === 'Premium' && (
                  <View style={styles.premiumBadge}>
                    <Text style={styles.premiumBadgeText}>PREMIUM</Text>
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
          {membershipTypes
            .filter(type => !userMembership || type.id !== userMembership.membership_id)
            .map(type => (
              <View key={type.id} style={[
                styles.membershipCard,
                type.name === 'Premium' && styles.premiumCard
              ]}>
                <View style={styles.membershipCardHeader}>
                  <Text style={[
                    styles.membershipCardTitle,
                    type.name === 'Premium' && styles.premiumCardTitle
                  ]}>
                    {type.name}
                  </Text>
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
                  onPress={() => upgradeMembership(type.id)}
                >
                  <Text style={[
                    styles.membershipCardButtonText,
                    type.name === 'Premium' && styles.premiumCardButtonText
                  ]}>
                    {type.name === 'Premium' ? 'Actualizar a Premium' : 'Cambiar a plan gratuito'}
                  </Text>
                </TouchableOpacity>
              </View>
            ))}
        </View>
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
    color: '#333',
  },
  membershipCardButton: {
    backgroundColor: '#f0f0f0',
    paddingVertical: 12,
    alignItems: 'center',
  },
  premiumCardButton: {
    backgroundColor: '#FFD700',
  },
  membershipCardButtonText: {
    fontFamily: 'Inter_700Bold',
    color: '#333',
  },
  premiumCardButtonText: {
    color: '#1a1a2e',
  },
});
