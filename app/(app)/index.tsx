import { View, Text, StyleSheet, Image, ScrollView, TouchableOpacity, Dimensions, useWindowDimensions, ActivityIndicator, RefreshControl, Alert } from 'react-native';
import { MapPin, Star, Tag, ArrowRight, AlertCircle } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import AddPetModal from '@/components/AddPetModal';
import EditPetModal from '@/components/EditPetModal';

// Definir el tipo para las mascotas
type Pet = {
  id: string;
  name: string;
  species: string;
  breed: string | null;
  age: string | null;
  description: string | null;
  image_url: string | null;
  owner_id: string;
};

export default function Home() {
  const { width } = useWindowDimensions();
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);
  const scrollViewRef = useRef(null);
  const [isAddPetModalVisible, setIsAddPetModalVisible] = useState(false);
  const [isEditPetModalVisible, setIsEditPetModalVisible] = useState(false);
  const [selectedPet, setSelectedPet] = useState<Pet | null>(null);
  const [pets, setPets] = useState<Pet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  
  const banners = [
    {
      id: '1',
      image: 'https://images.unsplash.com/photo-1450778869180-41d0601e046e',
      title: 'Semana de Adopción de Mascotas',
      subtitle: '50% de descuento en tarifas de adopción',
      buttonText: 'Más información'
    },
    {
      id: '2',
      image: 'https://images.unsplash.com/photo-1583511655857-d19b40a7a54e',
      title: 'Adopta un Amigo Fiel',
      subtitle: 'Encuentra tu compañero perfecto',
      buttonText: 'Ver mascotas'
    },
    {
      id: '3',
      image: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba',
      title: 'Gatos en Adopción',
      subtitle: 'Adopta un felino y cambia su vida',
      buttonText: 'Conocer más'
    }
  ];
  
  useEffect(() => {
    const timer = setInterval(() => {
      const nextIndex = (currentBannerIndex + 1) % banners.length;
      setCurrentBannerIndex(nextIndex);
      // Corregir el error de tipo para scrollViewRef.current
      if (scrollViewRef.current) {
        (scrollViewRef.current as any).scrollTo({
          x: nextIndex * (width - 32 + 16),
          animated: true
        });
      }
    }, 5000); // Cambiar banner cada 5 segundos
    
    return () => clearInterval(timer);
  }, [currentBannerIndex, width, banners.length]);
  
  const handleScroll = (event: { nativeEvent: { contentOffset: { x: number } } }) => {
    const contentOffsetX = event.nativeEvent.contentOffset.x;
    const newIndex = Math.round(contentOffsetX / (width - 32 + 16)); // Ajustamos el cálculo para incluir el margen
    if (newIndex !== currentBannerIndex && newIndex >= 0 && newIndex < banners.length) {
      setCurrentBannerIndex(newIndex);
    }
  };
  
  // Función para cargar las mascotas del usuario
  const loadPets = useCallback(async () => {
    try {
      setError(null);
      
      // Verificar si el usuario está autenticado
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        throw new Error('Error al verificar la sesión: ' + sessionError.message);
      }
      
      if (!session) {
        // Si no hay sesión, mostrar mensaje pero no error
        setPets([]);
        setLoading(false);
        return;
      }
      
      console.log('Cargando mascotas para el usuario:', session.user.email);
      
      // Obtener las mascotas del usuario desde Supabase
      const { data, error: petsError } = await supabase
        .from('pets')
        .select('*')
        .eq('owner_id', session.user.id)
        .order('name', { ascending: true });
      
      if (petsError) {
        throw new Error('Error al cargar mascotas: ' + petsError.message);
      }
      
      console.log('Mascotas cargadas:', data?.length || 0);
      setPets(data || []);
      
    } catch (err: any) {
      console.error('Error al cargar mascotas:', err);
      setError(err.message || 'Error al cargar las mascotas');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);
  
  // Cargar mascotas al iniciar y cuando se cierre el modal de agregar mascota
  useEffect(() => {
    loadPets();
  }, [loadPets]);
  
  // Función para refrescar la lista de mascotas
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadPets();
  }, [loadPets]);
  
  // Función para manejar cuando se agrega o edita una mascota exitosamente
  const handlePetUpdated = () => {
    loadPets();
  };

  // Función para abrir el modal de edición de mascota
  const handleEditPet = (pet: Pet) => {
    setSelectedPet(pet);
    setIsEditPetModalVisible(true);
  };

  return (
    <View style={{ flex: 1 }}>
      <ScrollView 
        style={styles.container}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Featured Banner Carousel */}
        <View style={styles.bannerContainer}>
          <ScrollView
            ref={scrollViewRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            style={styles.bannerCarousel}
            onScroll={handleScroll}
            scrollEventThrottle={16}
            decelerationRate="fast"
            snapToInterval={width - 32}
            snapToAlignment="center"
            contentContainerStyle={styles.bannerCarouselContent}
          >
            {banners.map((banner) => (
              <View key={banner.id} style={[styles.banner, { width: width - 32, marginRight: 16 }]}>
                <Image
                  source={{ uri: banner.image }}
                  style={styles.bannerImage}
                />
                <LinearGradient
                  colors={['transparent', 'rgba(0,0,0,0.8)']}
                  style={styles.bannerContent}>
                  <Text style={styles.bannerTitle}>{banner.title}</Text>
                  <Text style={styles.bannerSubtitle}>{banner.subtitle}</Text>
                  <TouchableOpacity style={styles.bannerButton}>
                    <Text style={styles.bannerButtonText}>{banner.buttonText}</Text>
                  </TouchableOpacity>
                </LinearGradient>
              </View>
            ))}
          </ScrollView>
          
          {/* Pagination Indicators */}
          <View style={styles.paginationContainer}>
            {banners.map((banner) => (
              <View 
                key={banner.id} 
                style={[styles.paginationDot, 
                  currentBannerIndex === banners.findIndex(b => b.id === banner.id) ? styles.paginationDotActive : null
                ]} 
              />
            ))}
          </View>
        </View>

        {/* My Pets Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Mis Mascotas</Text>
            <TouchableOpacity style={styles.seeAllButton}>
              <Text style={styles.seeAllText}>Ver todas</Text>
              <ArrowRight size={16} color="#ffbc4c" />
            </TouchableOpacity>
          </View>
          
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#ffbc4c" />
              <Text style={styles.loadingText}>Cargando mascotas...</Text>
            </View>
          ) : error ? (
            <View style={styles.errorContainer}>
              <AlertCircle size={24} color="#ff4c4c" />
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity style={styles.retryButton} onPress={loadPets}>
                <Text style={styles.retryButtonText}>Reintentar</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.petsScroll}>
              <TouchableOpacity 
                style={styles.addPetCard} 
                onPress={() => setIsAddPetModalVisible(true)}
              >
                <View style={styles.addPetButton}>
                  <Text style={styles.addPetIcon}>+</Text>
                </View>
                <Text style={styles.addPetText}>Agregar Mascota</Text>
              </TouchableOpacity>
              
              {pets.length === 0 ? (
                <View style={styles.noPetsContainer}>
                  <Text style={styles.noPetsText}>No tienes mascotas registradas</Text>
                </View>
              ) : (
                pets.map(pet => (
                  <TouchableOpacity 
                    key={pet.id} 
                    style={styles.petCard}
                    onPress={() => handleEditPet(pet)}
                  >
                    <Image
                      source={{ 
                        uri: pet.image_url || 'https://images.unsplash.com/photo-1517849845537-4d257902454a' 
                      }}
                      style={styles.petCardImage}
                    />
                    <View style={styles.petCardInfo}>
                      <Text style={styles.petCardName}>{pet.name}</Text>
                      <Text style={styles.petCardBreed}>
                        {pet.species} {pet.breed ? `• ${pet.breed}` : ''} {pet.age ? `• ${pet.age}` : ''}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          )}
        </View>

        {/* Anuncios */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Anuncios</Text>
            <TouchableOpacity style={styles.seeAllButton}>
              <Text style={styles.seeAllText}>Ver todos</Text>
              <ArrowRight size={16} color="#ffbc4c" />
            </TouchableOpacity>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.petsScroll}>
            <TouchableOpacity style={styles.petCard}>
              <Image
                source={{ uri: 'https://images.unsplash.com/photo-1517849845537-4d257902454a' }}
                style={styles.petCardImage}
              />
              <View style={styles.petCardInfo}>
                <Text style={styles.petCardName}>Descuento Especial</Text>
                <Text style={styles.petCardBreed}>Alimentos Premium</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity style={styles.petCard}>
              <Image
                source={{ uri: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba' }}
                style={styles.petCardImage}
              />
              <View style={styles.petCardInfo}>
                <Text style={styles.petCardName}>Oferta Exclusiva</Text>
                <Text style={styles.petCardBreed}>Accesorios para Mascotas</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity style={styles.petCard}>
              <Image
                source={{ uri: 'https://images.unsplash.com/photo-1583511655857-d19b40a7a54e' }}
                style={styles.petCardImage}
              />
              <View style={styles.petCardInfo}>
                <Text style={styles.petCardName}>Promoción Especial</Text>
                <Text style={styles.petCardBreed}>Servicios Veterinarios</Text>
              </View>
            </TouchableOpacity>
          </ScrollView>
        </View>

        {/* Featured Deals */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Ofertas Especiales</Text>
            <TouchableOpacity style={styles.seeAllButton}>
              <Text style={styles.seeAllText}>Ver todas</Text>
              <ArrowRight size={16} color="#ffbc4c" />
            </TouchableOpacity>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dealsScroll}>
            <TouchableOpacity style={styles.dealCard}>
              <View style={styles.discountBadge}>
                <Tag size={14} color="#fff" />
                <Text style={styles.discountText}>30% DCTO</Text>
              </View>
              <Image
                source={{ uri: 'https://images.unsplash.com/photo-1589924691995-400dc9ecc119' }}
                style={styles.dealImage}
              />
              <View style={styles.dealInfo}>
                <Text style={styles.dealTitle}>Alimento Premium</Text>
                <View style={styles.dealPricing}>
                  <Text style={styles.dealOriginalPrice}>$49.99</Text>
                  <Text style={styles.dealPrice}>$34.99</Text>
                </View>
              </View>
            </TouchableOpacity>
            <TouchableOpacity style={styles.dealCard}>
              <View style={styles.discountBadge}>
                <Tag size={14} color="#fff" />
                <Text style={styles.discountText}>20% DCTO</Text>
              </View>
              <Image
                source={{ uri: 'https://images.unsplash.com/photo-1545249390-6bdfa286564f' }}
                style={styles.dealImage}
              />
              <View style={styles.dealInfo}>
                <Text style={styles.dealTitle}>Casa para Gatos</Text>
                <View style={styles.dealPricing}>
                  <Text style={styles.dealOriginalPrice}>$89.99</Text>
                  <Text style={styles.dealPrice}>$71.99</Text>
                </View>
              </View>
            </TouchableOpacity>
          </ScrollView>
        </View>

        {/* Featured Events */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Próximos Eventos</Text>
            <TouchableOpacity style={styles.seeAllButton}>
              <Text style={styles.seeAllText}>Ver todos</Text>
              <ArrowRight size={16} color="#ffbc4c" />
            </TouchableOpacity>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.eventsScroll}>
            <TouchableOpacity style={styles.eventCard}>
              <Image
                source={{ uri: 'https://images.unsplash.com/photo-1576201836106-db1758fd1c97' }}
                style={styles.eventImage}
              />
              <View style={styles.eventInfo}>
                <Text style={styles.eventDate}>15 de junio</Text>
                <Text style={styles.eventTitle}>Día de Vacunación de Mascotas</Text>
                <View style={styles.eventLocation}>
                  <MapPin size={14} color="#666" />
                  <Text style={styles.eventLocationText}>Parque Central</Text>
                </View>
              </View>
            </TouchableOpacity>
            <TouchableOpacity style={styles.eventCard}>
              <Image
                source={{ uri: 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec' }}
                style={styles.eventImage}
              />
              <View style={styles.eventInfo}>
                <Text style={styles.eventDate}>20 de junio</Text>
                <Text style={styles.eventTitle}>Taller de Entrenamiento Canino</Text>
                <View style={styles.eventLocation}>
                  <MapPin size={14} color="#666" />
                  <Text style={styles.eventLocationText}>Sede Pet Club</Text>
                </View>
              </View>
            </TouchableOpacity>
          </ScrollView>
        </View>

        {/* Featured Deals */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Ofertas Especiales</Text>
            <TouchableOpacity style={styles.seeAllButton}>
              <Text style={styles.seeAllText}>Ver todas</Text>
              <ArrowRight size={16} color="#ffbc4c" />
            </TouchableOpacity>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dealsScroll}>
            <TouchableOpacity style={styles.dealCard}>
              <View style={styles.discountBadge}>
                <Tag size={14} color="#fff" />
                <Text style={styles.discountText}>30% DCTO</Text>
              </View>
              <Image
                source={{ uri: 'https://images.unsplash.com/photo-1589924691995-400dc9ecc119' }}
                style={styles.dealImage}
              />
              <View style={styles.dealInfo}>
                <Text style={styles.dealTitle}>Alimento Premium</Text>
                <View style={styles.dealPricing}>
                  <Text style={styles.dealOriginalPrice}>$49.99</Text>
                  <Text style={styles.dealPrice}>$34.99</Text>
                </View>
              </View>
            </TouchableOpacity>
            <TouchableOpacity style={styles.dealCard}>
              <View style={styles.discountBadge}>
                <Tag size={14} color="#fff" />
                <Text style={styles.discountText}>20% DCTO</Text>
              </View>
              <Image
                source={{ uri: 'https://images.unsplash.com/photo-1545249390-6bdfa286564f' }}
                style={styles.dealImage}
              />
              <View style={styles.dealInfo}>
                <Text style={styles.dealTitle}>Casa para Gatos</Text>
                <View style={styles.dealPricing}>
                  <Text style={styles.dealOriginalPrice}>$89.99</Text>
                  <Text style={styles.dealPrice}>$71.99</Text>
                </View>
              </View>
            </TouchableOpacity>
          </ScrollView>

          {/* Featured Services */}
          <View style={[styles.section, styles.lastSection]}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Servicios Mejor Valorados</Text>
              <TouchableOpacity style={styles.seeAllButton}>
                <Text style={styles.seeAllText}>Ver todos</Text>
                <ArrowRight size={16} color="#ffbc4c" />
              </TouchableOpacity>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.servicesScroll}>
              <TouchableOpacity style={styles.serviceCard}>
                <Image
                  source={{ uri: 'https://images.unsplash.com/photo-1516734212186-65266f683123' }}
                  style={styles.serviceImage}
                />
                <View style={styles.serviceInfo}>
                  <Text style={styles.serviceTitle}>Peluquería Patitas</Text>
                  <View style={styles.serviceRating}>
                    <Star size={14} color="#FFD700" fill="#FFD700" />
                    <Text style={styles.serviceRatingText}>4.8</Text>
                  </View>
                  <Text style={styles.serviceDistance}>a 1.5 km</Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity style={styles.serviceCard}>
                <Image
                  source={{ uri: 'https://images.unsplash.com/photo-1532938911079-1b06ac7ceec7' }}
                  style={styles.serviceImage}
                />
                <View style={styles.serviceInfo}>
                  <Text style={styles.serviceTitle}>VetCare Plus</Text>
                  <View style={styles.serviceRating}>
                    <Star size={14} color="#FFD700" fill="#FFD700" />
                    <Text style={styles.serviceRatingText}>4.9</Text>
                  </View>
                  <Text style={styles.serviceDistance}>a 2.3 km</Text>
                </View>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </ScrollView>
      
      <AddPetModal 
        visible={isAddPetModalVisible} 
        onClose={() => setIsAddPetModalVisible(false)}
        onSuccess={handlePetUpdated}
      />

      <EditPetModal
        visible={isEditPetModalVisible}
        onClose={() => setIsEditPetModalVisible(false)}
        onSuccess={handlePetUpdated}
        pet={selectedPet}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  addPetCard: {
    width: 160,
    height: 220,
    backgroundColor: '#fff',
    borderRadius: 12,
    marginRight: 16,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addPetButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#ffbc4c',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  addPetIcon: {
    fontSize: 32,
    color: '#fff',
    fontWeight: 'bold',
  },
  addPetText: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: '#666',
    textAlign: 'center',
  },
  bannerContainer: {
    marginVertical: 20,
    position: 'relative',
  },
  bannerCarousel: {
    overflow: 'visible',
  },
  bannerCarouselContent: {
    paddingHorizontal: 16,
    flexDirection: 'row',
  },
  banner: {
    height: 200,
    position: 'relative',
    borderRadius: 16,
    overflow: 'hidden',
    marginHorizontal: 8,
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 10,
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ccc',
    marginHorizontal: 4,
  },
  paginationDotActive: {
    backgroundColor: '#ffbc4c',
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  bannerImage: {
    width: '100%',
    height: '100%',
    borderRadius: 16,
  },
  bannerContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
  },
  bannerTitle: {
    color: '#fff',
    fontSize: 24,
    fontFamily: 'Inter_700Bold',
    marginBottom: 4,
  },
  bannerSubtitle: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    marginBottom: 12,
  },
  bannerButton: {
    backgroundColor: '#ffbc4c',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  bannerButtonText: {
    color: '#fff',
    fontFamily: 'Inter_600SemiBold',
  },
  section: {
    padding: 20,
  },
  lastSection: {
    paddingBottom: 40,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: 'Inter_700Bold',
  },
  seeAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  seeAllText: {
    color: '#ffbc4c',
    marginRight: 4,
    fontFamily: 'Inter_600SemiBold',
  },
  eventsScroll: {
    marginLeft: -20,
    paddingLeft: 20,
  },
  eventCard: {
    width: 280,
    backgroundColor: '#fff',
    borderRadius: 12,
    marginRight: 16,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  eventImage: {
    width: '100%',
    height: 150,
  },
  eventInfo: {
    padding: 12,
  },
  eventDate: {
    color: '#ffbc4c',
    fontFamily: 'Inter_600SemiBold',
    marginBottom: 4,
  },
  eventTitle: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    marginBottom: 8,
  },
  eventLocation: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  eventLocationText: {
    marginLeft: 4,
    color: '#666',
    fontFamily: 'Inter_400Regular',
  },
  petsScroll: {
    marginLeft: -20,
    paddingLeft: 20,
  },
  petCard: {
    width: 160,
    backgroundColor: '#fff',
    borderRadius: 12,
    marginRight: 16,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  petCardImage: {
    width: '100%',
    height: 160,
  },
  petCardInfo: {
    padding: 12,
  },
  petCardName: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    marginBottom: 4,
  },
  petCardBreed: {
    color: '#666',
    fontFamily: 'Inter_400Regular',
  },
  dealsScroll: {
    marginLeft: -20,
    paddingLeft: 20,
  },
  dealCard: {
    width: 200,
    backgroundColor: '#fff',
    borderRadius: 12,
    marginRight: 16,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  discountBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: '#ffbc4c',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 1,
  },
  discountText: {
    color: '#fff',
    marginLeft: 4,
    fontFamily: 'Inter_600SemiBold',
  },
  dealImage: {
    width: '100%',
    height: 150,
  },
  dealInfo: {
    padding: 12,
  },
  dealTitle: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    marginBottom: 8,
  },
  dealPricing: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dealOriginalPrice: {
    color: '#666',
    textDecorationLine: 'line-through',
    marginRight: 8,
    fontFamily: 'Inter_400Regular',
  },
  dealPrice: {
    color: '#ffbc4c',
    fontSize: 16,
    fontFamily: 'Inter_700Bold',
  },
  servicesScroll: {
    marginLeft: -20,
    paddingLeft: 20,
  },
  serviceCard: {
    width: 240,
    backgroundColor: '#fff',
    borderRadius: 12,
    marginRight: 16,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  serviceImage: {
    width: '100%',
    height: 140,
  },
  serviceInfo: {
    padding: 12,
  },
  serviceTitle: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    marginBottom: 8,
  },
  serviceRating: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  serviceRatingText: {
    marginLeft: 4,
    fontFamily: 'Inter_600SemiBold',
  },
  serviceDistance: {
    color: '#666',
    fontFamily: 'Inter_400Regular',
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
    fontSize: 14,
  },
  errorContainer: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff8f8',
    borderRadius: 8,
    marginHorizontal: 16,
  },
  errorText: {
    marginTop: 10,
    color: '#ff4c4c',
    fontSize: 14,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 15,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#ffbc4c',
    borderRadius: 20,
  },
  retryButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  noPetsContainer: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    marginHorizontal: 16,
    minWidth: 200,
  },
  noPetsText: {
    color: '#666',
    fontSize: 14,
    textAlign: 'center',
  },
});