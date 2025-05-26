import { View, Text, StyleSheet, Image, ScrollView, TouchableOpacity, Dimensions, useWindowDimensions, ActivityIndicator, RefreshControl, Alert } from 'react-native';
import { MapPin, Star, Tag, ArrowRight, AlertCircle } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import AddPetModal from '@/components/AddPetModal';
import EditPetModal from '@/components/EditPetModal';
import UpgradeMembershipModal from '../components/UpgradeMembershipModal';
import { router } from 'expo-router';

// Definir el tipo para las mascotas
type Pet = {
  id: string;
  name: string;
  species: string;
  breed: string | null;
  age: string | null;
  description: string | null;
  images: string[];
  owner_id: string;
  is_active: boolean;
  featured?: boolean; // Agregar propiedad para destacar mascotas
};

// Definir el tipo para las membresías de usuario
interface UserMembership {
  membership_id: string;
  membership_name: string;
  max_pets: number;
  max_photos_per_pet: number;
  max_interests_per_pet: number;
  has_ads: boolean;
  has_coupons: boolean;
  has_store_discounts: boolean;
}

// Definir el tipo para los banners
interface Banner {
  id: string;
  title: string;
  description?: string;
  image_url: string;
  link_url?: string;
  target_section?: string;
  start_date?: string;
  end_date?: string;
  is_active?: boolean;
  priority?: number;
  created_at?: string;
  updated_at?: string;
  buttonText?: string; // Para compatibilidad visual
}

// Definir el tipo para los anuncios
interface Anuncio {
  id: string;
  titulo: string;
  categoria: string;
  tipo_aviso: string;
  especie: string;
  nombre: string;
  ubicacion: string;
  descripcion: string;
  imagen_url: string;
  imagenes_urls: string[];
  destacado: boolean;
  fecha_creacion: string;
  usuario: {
    nombre?: string;
    telefono?: string;
    email?: string;
  };
}

// Tipo para negocios/places
interface Place {
  id: string;
  name: string;
  photo_url: string | null;
  rating: number | null;
  address?: string | null;
  // ...otros campos relevantes
}

export default function Home() {
  const { width } = useWindowDimensions();
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);
  const scrollViewRef = useRef(null);
  const [isAddPetModalVisible, setIsAddPetModalVisible] = useState(false);
  const [isEditPetModalVisible, setIsEditPetModalVisible] = useState(false);
  const [isUpgradeModalVisible, setIsUpgradeModalVisible] = useState(false);
  const [selectedPet, setSelectedPet] = useState<Pet | null>(null);
  const [pets, setPets] = useState<Pet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [userMembership, setUserMembership] = useState<UserMembership | null>(null);
  const [checkingMembership, setCheckingMembership] = useState(false);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loadingBanners, setLoadingBanners] = useState(true);
  const [anuncios, setAnuncios] = useState<Anuncio[]>([]);
  const [loadingAnuncios, setLoadingAnuncios] = useState(true);
  const [topPlaces, setTopPlaces] = useState<Place[]>([]);
  const [loadingTopPlaces, setLoadingTopPlaces] = useState(true);
  const [eventos, setEventos] = useState<any[]>([]);
  const [loadingEventos, setLoadingEventos] = useState(true);

  useEffect(() => {
    const fetchBanners = async () => {
      setLoadingBanners(true);
      const { data, error } = await supabase.from('banners').select('*');
      if (!error && data) setBanners(data);
      setLoadingBanners(false);
    };
    fetchBanners();
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      const nextIndex = (currentBannerIndex + 1) % banners.length;
      setCurrentBannerIndex(nextIndex);
      // Corregir el error de tipo para scrollViewRef.current
      if (scrollViewRef.current) {
        (scrollViewRef.current as any).scrollTo({
          x: nextIndex * (width - 40),
          animated: true
        });
      }
    }, 5000); // Cambiar banner cada 5 segundos
    
    return () => clearInterval(timer);
  }, [currentBannerIndex, width, banners.length]);

  const handleScroll = (event: { nativeEvent: { contentOffset: { x: number } } }) => {
    const contentOffsetX = event.nativeEvent.contentOffset.x;
    const newIndex = Math.round(contentOffsetX / (width - 40)); // Ajustamos el cálculo para incluir el margen
    if (newIndex !== currentBannerIndex && newIndex >= 0 && newIndex < banners.length) {
      setCurrentBannerIndex(newIndex);
    }
  };

  // Función para cargar las mascotas del usuario
  const loadPets = useCallback(async () => {
    setLoading(true);
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
      .eq('owner_id', session.user.id);
    
    if (petsError) {
      throw new Error('Error al cargar mascotas: ' + petsError.message);
    }
    
    // Asegurar que cada mascota tenga is_active definido como booleano
    const petsWithActive = (data || []).map(pet => ({ ...pet, is_active: !!pet.is_active }));
    console.log('Mascotas cargadas:', petsWithActive);
    setPets(petsWithActive);
    setLoading(false);
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

  // Función para manejar el error de límite de mascotas
  const handlePetLimitError = () => {
    setIsUpgradeModalVisible(true);
  };

  // Modifica la función de agregar mascota para mostrar el modal si hay error de límite
  const handleAddPet = async (petData: Omit<Pet, 'id'>) => {
    try {
      setLoading(true);
      setError(null);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Debes iniciar sesión');
      const { data, error } = await supabase
        .from('pets')
        .insert([{ ...petData, owner_id: session.user.id }]);
      if (error) {
        const msg = error.message || error.details || JSON.stringify(error);
        if (
          msg.toLowerCase().includes('límite') ||
          msg.toLowerCase().includes('limit') ||
          msg.toLowerCase().includes('has alcanzado el límite')
        ) {
          setIsAddPetModalVisible(false);
          setTimeout(() => {
            handlePetLimitError();
          }, 350); // Espera a que se desmonte el modal antes de mostrar el de upgrade
        } else {
          setError(msg);
        }
        return;
      }
      setIsAddPetModalVisible(false);
      loadPets();
    } catch (err: any) {
      setError(err.message || 'Error al agregar mascota');
    } finally {
      setLoading(false);
    }
  };

  // Cambiar el guardado y edición para soportar images[]
  const handlePetEdited = async (petData: any) => {
    try {
      setLoading(true);
      setError(null);
      // Actualizar mascota con intereses y nuevas imágenes
      const { data, error } = await supabase
        .from('pets')
        .update({
          name: petData.name,
          species: petData.species,
          breed: petData.breed || null,
          age: petData.age || null,
          description: petData.description || null,
          images: petData.images || [],
          interests: petData.interests || [],
        })
        .eq('id', petData.id);
      if (error) {
        setError(error.message || 'No se pudo actualizar la mascota');
        return;
      }
      setIsEditPetModalVisible(false);
      setSelectedPet(null);
      loadPets();
    } catch (err: any) {
      setError(err.message || 'Error al editar mascota');
    } finally {
      setLoading(false);
    }
  };

  // Hook para membresía y máximo de mascotas
  const loadUserMembership = async () => {
    setCheckingMembership(true);
    try {
      const sessionResult = await supabase.auth.getSession();
      const userId = sessionResult.data.session?.user?.id;
      if (!userId) throw new Error('No hay sesión de usuario');
      const { data, error } = await supabase.rpc('get_user_membership', { user_id: userId });
      if (error) throw error;
      if (data && data.length > 0) {
        setUserMembership(data[0]);
      } else {
        setUserMembership(null);
      }
    } catch (e) {
      setUserMembership(null);
    } finally {
      setCheckingMembership(false);
    }
  };

  // Cargar membresía al montar
  useEffect(() => {
    loadUserMembership();
  }, []);

  // Nueva función para manejar click en Agregar Mascota
  const handleClickAddPet = async () => {
    setCheckingMembership(true);
    await loadUserMembership();
    if (!userMembership) {
      Alert.alert('Error', 'No se pudo obtener la información de tu membresía');
      setCheckingMembership(false);
      return;
    }
    if (userMembership && pets.length >= userMembership.max_pets) {
      setIsUpgradeModalVisible(true);
      setCheckingMembership(false);
      return;
    }
    setIsAddPetModalVisible(true);
    setCheckingMembership(false);
  };

  useEffect(() => {
    const fetchAnuncios = async () => {
      setLoadingAnuncios(true);
      try {
        // Obtener avisos de la tabla red_de_ayuda con los campos necesarios
        const { data: avisosData, error } = await supabase
          .from('red_de_ayuda')
          .select(`
            id,
            tipo_aviso,
            especie,
            nombre,
            descripcion,
            ubicacion,
            imagen_url,
            imagenes_urls,
            contacto,
            estado,
            created_at,
            user_id
          `)
          .eq('estado', 'activo')  // Solo traer avisos activos
          .order('created_at', { ascending: false })
          .limit(10);
        
        if (error) throw error;
        if (!avisosData) return;

        // Obtener información de usuarios para los avisos
        const userIds = [...new Set(avisosData.map(aviso => aviso.user_id))];
        const { data: usuariosData } = await supabase
          .from('profiles')
          .select('id, nombre, telefono, email')
          .in('id', userIds);

        // Crear mapa de usuarios por ID
        const usuariosMap = new Map(
          (usuariosData || []).map(user => [user.id, user])
        );
        
        // Mapear los datos al formato de Anuncio
        const avisosMapeados = avisosData.map(aviso => {
          const usuario = usuariosMap.get(aviso.user_id) || {} as any;
          
          return {
            id: aviso.id,
            titulo: aviso.tipo_aviso === 'adopcion' ? 'En adopción' : 
                   aviso.tipo_aviso === 'perdido' ? 'Se perdió' : 'Se encontró',
            categoria: aviso.tipo_aviso,
            tipo_aviso: aviso.tipo_aviso,
            especie: aviso.especie || 'No especificada',
            nombre: aviso.nombre || 'Sin nombre',
            ubicacion: aviso.ubicacion || 'Ubicación no especificada',
            descripcion: aviso.descripcion || 'Sin descripción',
            imagen_url: (aviso.imagenes_urls && aviso.imagenes_urls[0]) || 
                       aviso.imagen_url || 
                       'https://images.unsplash.com/photo-1517849845537-4d257902454a',
            imagenes_urls: aviso.imagenes_urls || (aviso.imagen_url ? [aviso.imagen_url] : []),
            destacado: false, // No existe este campo en la tabla
            fecha_creacion: aviso.created_at || new Date().toISOString(),
            usuario: {
              nombre: usuario?.nombre || 'Usuario anónimo',
              telefono: usuario?.telefono || aviso.contacto || 'Sin contacto',
              email: usuario?.email || ''
            }
          };
        });
        
        setAnuncios(avisosMapeados);
      } catch (error) {
        console.error('Error al cargar los anuncios:', error);
      } finally {
        setLoadingAnuncios(false);
      }
    };

    fetchAnuncios();
  }, []);

  // Distintivo visual para las tarjetas de anuncio
  const renderBadge = (anuncio: Anuncio) => {
    let label = '';
    let color = '#ffbc4c';
    const categoria = anuncio.categoria?.toLowerCase() || '';
    if (categoria === 'perdido') {
      label = 'Perdido/a';
      color = '#ff4c4c';
    } else if (categoria === 'encontrado') {
      label = '¡En Casa!';
      color = '#4caf50';
    } else if (categoria === 'adopción' || categoria === 'adopcion') {
      label = '¡Adóptame!';
      color = '#2196f3';
    }
    if (!label) return null;
    return (
      <View style={{
        position: 'absolute',
        top: 12,
        left: 12,
        backgroundColor: color,
        borderRadius: 6,
        paddingHorizontal: 10,
        paddingVertical: 4,
        zIndex: 2,
      }}>
        <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 13 }}>{label}</Text>
      </View>
    );
  };

  useEffect(() => {
    const fetchTopPlaces = async () => {
      setLoadingTopPlaces(true);
      // Traer rating actualizado de la base de datos
      const { data, error } = await supabase
        .from('places')
        .select('id, name, photo_url, rating, address')
        .order('rating', { ascending: false })
        .limit(5);
      if (!error && data) setTopPlaces(data);
      setLoadingTopPlaces(false);
    };
    fetchTopPlaces();
  }, []);

  useEffect(() => {
    const focusHandler = () => {
      // Si viene de un rating, fuerza recarga
      if (router?.params?.refreshTop === '1') {
        fetchTopPlaces();
        // Limpia el parámetro para evitar recargas infinitas
        router.setParams({ refreshTop: undefined });
      }
    };
    // Suscribirse al evento de focus
    const unsubscribe = router.addListener?.('focus', focusHandler);
    return () => unsubscribe?.();
  }, [router]);

  useEffect(() => {
    const unsubscribe = router.events?.addListener?.('focus', () => {
      // Recargar negocios top al volver a la pantalla principal
      (async () => {
        setLoadingTopPlaces(true);
        const { data, error } = await supabase
          .from('places')
          .select('id, name, photo_url, rating, address')
          .order('rating', { ascending: false })
          .limit(5);
        if (!error && data) setTopPlaces(data);
        setLoadingTopPlaces(false);
      })();
    });
    return () => unsubscribe?.();
  }, [router]);

  useEffect(() => {
    const fetchEventos = async () => {
      setLoadingEventos(true);
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('is_active', true)
        .gte('event_date', new Date().toISOString().split('T')[0])
        .order('event_date', { ascending: true })
        .limit(5);
      if (!error && data) setEventos(data);
      setLoadingEventos(false);
    };
    fetchEventos();
  }, []);

  function formatEventDate(dateString: string) {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-AR', { day: 'numeric', month: 'long' });
  }

  // Añadir el distintivo de mascota destacada en la tarjeta de mascota
  const FeaturedPetBadge = () => (
    <View style={{
      position: 'absolute',
      top: 12,
      right: 12,
      backgroundColor: '#FFD700',
      borderRadius: 6,
      paddingHorizontal: 10,
      paddingVertical: 4,
      zIndex: 2,
      borderWidth: 2,
      borderColor: '#fff',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.13,
      shadowRadius: 2,
      elevation: 2,
      flexDirection: 'row',
      alignItems: 'center',
    }}>
      <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 13 }}>★ DESTACADA</Text>
    </View>
  );

  return (
    <View style={{ flex: 1 }}>
      <ScrollView 
        style={styles.container}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Sección de banners con datos reales y diseño mejorado */}
        <View style={{ marginTop: 24 }}>
          {loadingBanners ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#ffbc4c" />
              <Text style={styles.loadingText}>Cargando banners...</Text>
            </View>
          ) : banners.length === 0 ? (
            <Text style={{ color: '#888', textAlign: 'center' }}>No hay banners disponibles</Text>
          ) : (
            <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center' }}>
              {/* Flecha izquierda */}
              {banners.length > 1 && (
                <TouchableOpacity
                  onPress={() => setCurrentBannerIndex((prev) => prev === 0 ? banners.length - 1 : prev - 1)}
                  style={{ padding: 8 }}
                >
                  <ArrowRight size={24} color="#ffbc4c" style={{ transform: [{ rotate: '180deg' }] }} />
                </TouchableOpacity>
              )}
              <View style={{ width: width - 40, borderRadius: 16, overflow: 'hidden', backgroundColor: '#fff', elevation: 2 }}>
                <Image
                  source={{ uri: banners[currentBannerIndex].image_url || 'https://images.unsplash.com/photo-1517849845537-4d257902454a' }}
                  style={{ width: '100%', height: 180, borderTopLeftRadius: 16, borderTopRightRadius: 16 }}
                  resizeMode="cover"
                  onError={e => {}}
                />
                <LinearGradient
                  colors={[ 'transparent', 'rgba(0,0,0,0.8)' ]}
                  style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 90, borderBottomLeftRadius: 16, borderBottomRightRadius: 16 }}
                >
                  <View style={{ padding: 16, justifyContent: 'flex-end', flex: 1 }}>
                    <Text style={{ color: '#fff', fontSize: 18, fontWeight: 'bold', marginBottom: 4 }}>{banners[currentBannerIndex].title}</Text>
                    <Text style={{ color: '#fff', fontSize: 14, marginBottom: 8 }}>{banners[currentBannerIndex].description}</Text>
                    {banners[currentBannerIndex].buttonText && (
                      <TouchableOpacity style={{ backgroundColor: '#ffbc4c', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 6, alignSelf: 'flex-start' }}>
                        <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 14 }}>{banners[currentBannerIndex].buttonText}</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </LinearGradient>
              </View>
              {/* Flecha derecha */}
              {banners.length > 1 && (
                <TouchableOpacity
                  onPress={() => setCurrentBannerIndex((prev) => prev === banners.length - 1 ? 0 : prev + 1)}
                  style={{ padding: 8 }}
                >
                  <ArrowRight size={24} color="#ffbc4c" />
                </TouchableOpacity>
              )}
            </View>
          )}
          {/* Indicadores de paginación */}
          <View style={styles.paginationContainer}>
            {banners.map((banner, i) => (
              <View
                key={banner.id}
                style={[styles.paginationDot, currentBannerIndex === i && styles.paginationDotActive]}
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
                onPress={handleClickAddPet}
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
                    style={[
                      styles.petCard, 
                      pet.is_active === false && { opacity: 0.5, backgroundColor: '#eee' },
                      pet.featured && { borderColor: '#FFD700', borderWidth: 2, shadowColor: '#FFD700', shadowOpacity: 0.25, elevation: 4 }
                    ]}
                    onPress={() => handleEditPet(pet)}
                  >
                    {/* Badge de destacada */}
                    {pet.featured && <FeaturedPetBadge />}
                    <Image
                      source={{
                        uri: pet.image_url
                          ? pet.image_url
                          : (Array.isArray(pet.images) && pet.images.length > 0 && pet.images[0])
                            ? pet.images[0]
                            : 'https://images.unsplash.com/photo-1517849845537-4d257902454a'
                      }}
                      style={styles.petCardImage}
                    />
                    <View style={styles.petCardInfo}>
                      <Text style={styles.petCardName}>{pet.name}</Text>
                      <Text style={styles.petCardBreed}>
                        {pet.species} {pet.breed ? `• ${pet.breed}` : ''} {pet.age ? `• ${pet.age}` : ''}
                      </Text>
                      {pet.is_active === false && (
                        <Text style={{ color: '#888', fontSize: 12, marginTop: 2 }}>
                          Mascota inactiva
                        </Text>
                      )}
                    </View>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          )}
        </View>

        {/* Red de Ayuda */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Red de Ayuda</Text>
            <TouchableOpacity style={styles.seeAllButton} onPress={() => router.push('/red-de-ayuda')}>
              <Text style={styles.seeAllText}>Ver todos</Text>
              <ArrowRight size={16} color="#ffbc4c" />
            </TouchableOpacity>
          </View>
          {loadingAnuncios ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#ffbc4c" />
              <Text style={styles.loadingText}>Cargando anuncios...</Text>
            </View>
          ) : anuncios.length === 0 ? (
            <View style={styles.noPetsContainer}>
              <Text style={styles.noPetsText}>No hay avisos disponibles</Text>
            </View>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.petsScroll}>
              {anuncios.map(anuncio => (
                <TouchableOpacity 
                  style={styles.petCard} 
                  key={anuncio.id}
                  onPress={() => router.push(`/red-de-ayuda?avisoId=${anuncio.id}`)}
                >
                  {renderBadge(anuncio)}
                  <Image
                    source={{ uri: anuncio.imagen_url }}
                    style={styles.petCardImage}
                  />
                  <View style={styles.petCardInfo}>
                    <Text style={styles.petCardName} numberOfLines={1}>
                      {anuncio.nombre || 'Sin nombre'}
                    </Text>
                    <Text style={styles.petCardBreed} numberOfLines={1}>
                      {anuncio.tipo_aviso} • {anuncio.especie}
                    </Text>
                    <Text style={styles.petCardLocation} numberOfLines={1}>
                      {anuncio.ubicacion || 'Ubicación no especificada'}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>

        {/* Featured Deals */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Ofertas Especiales</Text>
            <TouchableOpacity style={styles.seeAllButton}>
              <Text style={styles.seeAllText}>Ver todos</Text>
              <ArrowRight size={16} color="#ffbc4c" />
            </TouchableOpacity>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dealsScroll}>
            <TouchableOpacity style={styles.dealCard}>
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
            <TouchableOpacity style={styles.seeAllButton} onPress={() => router.push('/eventos')}>
              <Text style={styles.seeAllText}>Ver todos</Text>
              <ArrowRight size={16} color="#ffbc4c" />
            </TouchableOpacity>
          </View>
          {loadingEventos ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#ffbc4c" />
              <Text style={styles.loadingText}>Cargando eventos...</Text>
            </View>
          ) : eventos.length === 0 ? (
            <View style={styles.noPetsContainer}>
              <Text style={styles.noPetsText}>No hay eventos próximos</Text>
            </View>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.eventsScroll}>
              {eventos.map(evento => (
                <TouchableOpacity style={styles.eventCard} key={evento.id}>
                  <Image
                    source={{ uri: evento.image_url || 'https://images.unsplash.com/photo-1517849845537-4d257902454a' }}
                    style={styles.eventImage}
                  />
                  <View style={styles.eventInfo}>
                    <Text style={styles.eventDate}>{formatEventDate(evento.event_date)}</Text>
                    <Text style={styles.eventTitle} numberOfLines={2}>{evento.title}</Text>
                    <View style={styles.eventLocation}>
                      <MapPin size={14} color="#666" />
                      <Text style={styles.eventLocationText} numberOfLines={1}>{evento.location}</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>

        {/* Featured Services */}
        <View style={[styles.section, styles.lastSection]}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Servicios Mejor Valorados</Text>
            <TouchableOpacity style={styles.seeAllButton} onPress={() => router.push('/places')}>
              <Text style={styles.seeAllText}>Ver todos</Text>
              <ArrowRight size={16} color="#ffbc4c" />
            </TouchableOpacity>
          </View>
          {loadingTopPlaces ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#ffbc4c" />
              <Text style={styles.loadingText}>Cargando negocios...</Text>
            </View>
          ) : topPlaces.length === 0 ? (
            <View style={styles.noPetsContainer}>
              <Text style={styles.noPetsText}>No hay negocios disponibles</Text>
            </View>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.servicesScroll}>
              {topPlaces.map(place => (
                <TouchableOpacity
                  style={styles.serviceCard}
                  key={place.id}
                  onPress={() => router.push(`/places/${place.id}`)}
                >
                  <Image
                    source={{ uri: place.photo_url || 'https://images.unsplash.com/photo-1516734212186-65266f683123' }}
                    style={styles.serviceImage}
                  />
                  <View style={styles.serviceInfo}>
                    <Text style={styles.serviceTitle}>{place.name}</Text>
                    <View style={styles.serviceRating}>
                      <Star size={14} color="#FFD700" fill="#FFD700" />
                      <Text style={styles.serviceRatingText}>
                        {place.rating !== null ? place.rating.toFixed(1) : '—'}
                      </Text>
                    </View>
                    {/* Puedes mostrar dirección o más info aquí si quieres */}
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>
      </ScrollView>
      
      <AddPetModal 
        visible={isAddPetModalVisible} 
        onClose={() => setIsAddPetModalVisible(false)}
        onAddPet={handleAddPet}
        maxImages={userMembership?.max_photos_per_pet || 1}
      />

      <EditPetModal
        visible={isEditPetModalVisible}
        pet={selectedPet ?? {}}
        onClose={() => {
          setIsEditPetModalVisible(false);
          setSelectedPet(null);
        }}
        onEditPet={handlePetEdited}
        maxImages={userMembership?.max_photos_per_pet || 1}
      />

      <UpgradeMembershipModal
        visible={isUpgradeModalVisible}
        onClose={() => setIsUpgradeModalVisible(false)}
        onUpgrade={() => {
          setIsUpgradeModalVisible(false);
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
  banner: {
    height: 200,
    position: 'relative',
    borderRadius: 16,
    overflow: 'hidden',
    marginHorizontal: 8,
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
    marginBottom: 2,
  },
  petCardLocation: {
    color: '#888',
    fontSize: 12,
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