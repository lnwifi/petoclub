import { View, Text, StyleSheet, Image, TouchableOpacity, ScrollView, ActivityIndicator, Alert, Modal } from 'react-native';
import { Settings, CreditCard, Heart, MapPin, LogOut, Ticket, ShoppingBag } from 'lucide-react-native';
import { useAuth } from '../../lib/auth-context';
import { router } from 'expo-router';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useFonts, Inter_400Regular, Inter_500Medium, Inter_700Bold } from '@expo-google-fonts/inter';
import OrderNotifications from '@/components/OrderNotifications';
import { getCurrentUserId } from '../lib/getCurrentUserId';

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

type ConfirmedMatch = {
  id: string;
  pet_image_url: string;
  pet_name: string;
  pet_species: string;
  pet_breed: string;
  pet_age: string;
  my_pet_name: string;
  my_pet_image_url: string;
  my_pet_active: boolean;
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

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

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

  const [showMatches, setShowMatches] = useState(false);
  const [confirmedMatches, setConfirmedMatches] = useState<ConfirmedMatch[]>([]);
  const [loadingMatches, setLoadingMatches] = useState(false);

  useEffect(() => {
    if (showMatches && user) {
      fetchConfirmedMatches();
    }
  }, [showMatches, user]);

  const fetchConfirmedMatches = async () => {
    setLoadingMatches(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Debes iniciar sesión');
      const { data: pets, error: petsError } = await supabase
        .from('pets')
        .select('id, name, image_url, is_active')
        .eq('owner_id', session.user.id);
      if (petsError) throw petsError;
      if (!pets || pets.length === 0) {
        setConfirmedMatches([]);
        setLoadingMatches(false);
        return;
      }
      const petIds = pets.map((p: any) => p.id);
      const petsMap = new Map(pets.map((p: any) => [p.id, p]));
      const { data, error } = await supabase
        .from('pet_matches')
        .select(`
          *,
          pet_1:pet_id_1(id, name, species, breed, age, image_url, owner_id),
          pet_2:pet_id_2(id, name, species, breed, age, image_url, owner_id)
        `)
        .eq('match_status', 'matched')
        .or(`pet_id_1.in.(${petIds.join(',')}),pet_id_2.in.(${petIds.join(',')})`);
      if (error) throw error;
      // Filtrar duplicados y asociar la mascota propia
      const unique = new Map();
      (data || []).forEach((m: any) => {
        const ids = [m.pet_1?.id, m.pet_2?.id].sort().join('-');
        if (!unique.has(ids)) {
          let myPet, otherPet;
          if (petIds.includes(m.pet_1?.id)) {
            myPet = m.pet_1;
            otherPet = m.pet_2;
          } else {
            myPet = m.pet_2;
            otherPet = m.pet_1;
          }
          const myPetActive = petsMap.get(myPet?.id)?.is_active ?? true;
          unique.set(ids, {
            id: m.id,
            pet_image_url: otherPet?.image_url || '',
            pet_name: otherPet?.name || '',
            pet_species: otherPet?.species || '',
            pet_breed: otherPet?.breed || '',
            pet_age: otherPet?.age || '',
            my_pet_name: myPet?.name || '',
            my_pet_image_url: myPet?.image_url || '',
            my_pet_active: myPetActive,
          });
        }
      });
      setConfirmedMatches(Array.from(unique.values()));
    } catch (e) {
      setConfirmedMatches([]);
    } finally {
      setLoadingMatches(false);
    }
  };

  const goToChat = (match: ConfirmedMatch) => {
    setShowMatches(false);
    setTimeout(() => {
      router.push({ pathname: '/(app)/chat', params: { matchId: match.id } });
    }, 200); // Pequeño delay para la animación del modal
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
        {/* Mostrar siempre la opción Cupones de descuento en el menú del perfil */}
        <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/coupons')}>
          <Ticket size={24} color="#666" />
          <Text style={styles.menuText}>Cupones de descuento</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuItem} onPress={() => setShowMatches(true)}>
          <Heart size={24} color="#666" />
          <Text style={styles.menuText}>Mis Matches</Text>
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

      {showMatches && (
        <Modal
          visible={showMatches}
          animationType="slide"
          onRequestClose={() => setShowMatches(false)}
          transparent={true}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.sectionTitle}>Mis Matches Confirmados</Text>
              {loadingMatches ? (
                <ActivityIndicator size="large" color="#ffbc4c" />
              ) : confirmedMatches.length === 0 ? (
                <Text style={styles.emptyText}>No tienes matches confirmados aún.</Text>
              ) : (
                <ScrollView style={{maxHeight: 400}}>
                  {confirmedMatches.map((match: ConfirmedMatch) => (
                    <View style={styles.matchCard} key={match.id}>
                      <Image source={{ uri: match.pet_image_url }} style={styles.matchImage} />
                      <View style={{flex:1, marginLeft:12}}>
                        <Text style={styles.matchName}>{match.pet_name}</Text>
                        <Text style={styles.matchBreed}>
                          {match.pet_species} {match.pet_breed ? `• ${match.pet_breed}` : ''} {match.pet_age ? `• ${match.pet_age}` : ''}
                        </Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                          <Image source={{ uri: match.my_pet_image_url }} style={{ width: 28, height: 28, borderRadius: 14, marginRight: 8, backgroundColor: '#eee' }} />
                          <Text style={{ fontSize: 13, color: '#888', fontFamily: 'Inter_500Medium' }}>Con tu mascota: <Text style={{ color: '#333', fontFamily: 'Inter_700Bold' }}>{match.my_pet_name}</Text></Text>
                        </View>
                        {match.my_pet_active ? (
                          <TouchableOpacity style={styles.chatButton} onPress={() => goToChat(match)}>
                            <Text style={styles.chatButtonText}>Abrir chat</Text>
                          </TouchableOpacity>
                        ) : (
                          <View style={[styles.chatButton, { backgroundColor: '#ccc' }]}> 
                            <Text style={[styles.chatButtonText, { color: '#888' }]}>Mascota inactiva</Text>
                          </View>
                        )}
                      </View>
                    </View>
                  ))}
                </ScrollView>
              )}
              <TouchableOpacity style={styles.closeButton} onPress={() => setShowMatches(false)}>
                <Text style={styles.closeButtonText}>Cerrar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '90%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  matchCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    width: 300,
  },
  matchImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#eee',
  },
  matchName: {
    fontSize: 18,
    fontFamily: 'Inter_700Bold',
    color: '#333',
  },
  matchBreed: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  chatButton: {
    marginTop: 10,
    backgroundColor: '#ffbc4c',
    borderRadius: 6,
    paddingVertical: 6,
    paddingHorizontal: 16,
    alignSelf: 'flex-start',
  },
  chatButtonText: {
    color: '#fff',
    fontFamily: 'Inter_700Bold',
    fontSize: 14,
  },
  closeButton: {
    marginTop: 20,
    backgroundColor: '#eee',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 24,
  },
  closeButtonText: {
    color: '#333',
    fontSize: 16,
    fontFamily: 'Inter_700Bold',
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
    padding: 20,
  },
});