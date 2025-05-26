import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, FlatList, TextInput, Platform, Modal } from 'react-native';
import { MapPin, Star, Phone, PawPrint, Scissors, Search, LucideIcon } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';

// Tipo para un negocio/Place
export type Place = {
  id: string | number;
  name: string;
  address: string;
  phone: string;
  category: string;
  latitude: number;
  longitude: number;
  photo_url?: string;
  featured?: boolean;
  rating?: number;
  hours?: any; // Mejorar si tienes la estructura
  [key: string]: any;
};

const CATEGORY_ICONS: { [key: string]: LucideIcon } = {
  Veterinary: PawPrint,
  Grooming: Scissors,
  // Puedes agregar más categorías aquí
};

function groupByCategory(places: Place[]): Record<string, Place[]> {
  return places.reduce((acc: Record<string, Place[]>, place: Place) => {
    if (!acc[place.category]) acc[place.category] = [];
    acc[place.category].push(place);
    return acc;
  }, {});
}

// Utilidad para saber si el negocio está abierto
function isOpen(hours: any): boolean | null {
  if (!hours) return null;
  const now = new Date();
  const day = now.getDay(); // 0=Dom, 1=Lun...
  const today = hours[day];
  if (!today || !today.open || !today.close) return null;
  const [openH, openM] = today.open.split(":").map(Number);
  const [closeH, closeM] = today.close.split(":").map(Number);
  const openTime = new Date(now);
  openTime.setHours(openH, openM, 0, 0);
  const closeTime = new Date(now);
  closeTime.setHours(closeH, closeM, 0, 0);
  return now >= openTime && now < closeTime;
}

export default function Places() {
  const router = useRouter();
  const [places, setPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [search, setSearch] = useState('');
  // Hook para cargar el componente de mapa solo una vez
  const MapComponent = React.useMemo(() => require('../components/maps/Map').default, []);
  const [showMap, setShowMap] = useState(false);

  useEffect(() => {
    const fetchPlaces = async () => {
      setLoading(true);
      const { data, error } = await supabase.from('places').select('*');
      if (error) {
        setError('Error al cargar los locales');
        setPlaces([]);
      } else {
        setPlaces((data as Place[]) || []);
        // Seleccionar la primera categoría automáticamente
        if (data && data.length > 0) {
          const cats = [...new Set((data as Place[]).map((p: Place) => p.category))].filter(Boolean);
          setSelectedCategory(cats[0] || '');
        }
      }
      setLoading(false);
    };
    fetchPlaces();
  }, []);

  // Si necesitas refrescar al volver a la pantalla, usa useFocusEffect de @react-navigation/native
  // o simplemente deja este efecto vacío si no tienes navegación stack.
  // Puedes implementar lógica personalizada aquí si usas expo-router v2+


  // Agrupar por categoría
  const grouped = groupByCategory(places);
  const categories = Object.keys(grouped);

  // Filtrar negocios según búsqueda y categoría
  let filteredPlaces = grouped[selectedCategory]?.filter((item: Place) => {
    const q = search.toLowerCase();
    return (
      item.name?.toLowerCase().includes(q) ||
      item.address?.toLowerCase().includes(q) ||
      item.phone?.toLowerCase().includes(q)
    );
  }) ?? [];
  // Ordenar: destacados primero
  filteredPlaces = [
    ...filteredPlaces.filter((item: Place) => item.featured),
    ...filteredPlaces.filter((item: Place) => !item.featured)
  ];

  if (loading) {
    return <View style={{flex:1,justifyContent:'center',alignItems:'center'}}><Text>Cargando locales...</Text></View>;
  }
  if (error) {
    return <View style={{flex:1,justifyContent:'center',alignItems:'center'}}><Text>{error}</Text></View>;
  }
  if (places.length === 0) {
    return <View style={{flex:1,justifyContent:'center',alignItems:'center'}}><Text>No hay locales disponibles.</Text></View>;
  }

  return (
    <View style={styles.container}>
      {/* Barra superior con icono de mapa */}
      <View style={styles.headerRow}>
        <Text style={styles.title}>Asociados por categoría</Text>
        <TouchableOpacity onPress={() => setShowMap(true)} style={styles.mapIconButton} accessibilityLabel="Mostrar mapa">
          <MapPin size={28} color="#fbaa30" />
        </TouchableOpacity>
      </View>
      {/* Modal del mapa */}
      <Modal
        visible={showMap}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setShowMap(false)}
      >
        <View style={{ flex: 1, backgroundColor: '#fff' }}>
          {/* Botón para cerrar el modal */}
          <TouchableOpacity onPress={() => setShowMap(false)} style={styles.closeMapButton} accessibilityLabel="Cerrar mapa">
            <Text style={{ fontSize: 18, color: '#fbaa30', fontWeight: 'bold' }}>Cerrar</Text>
          </TouchableOpacity>
          <MapComponent places={places} />
        </View>
      </Modal>

      {/* Buscador */}
      <View style={styles.searchContainer}>
        <Search size={18} color="#aaa" style={{ marginRight: 6 }} />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar negocio..."
          placeholderTextColor="#aaa"
          value={search}
          onChangeText={setSearch}
          returnKeyType="search"
        />
      </View>
      {/* Scroll horizontal de categorías con íconos circulares y texto debajo */}
      <FlatList
        data={categories}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item}
        contentContainerStyle={styles.circleList}
        renderItem={({ item }: { item: string }) => {
          const Icon = CATEGORY_ICONS[item] || PawPrint;
          return (
            <TouchableOpacity
              style={[styles.circleCat, selectedCategory === item && styles.circleCatActive]}
              onPress={() => setSelectedCategory(item)}
            >
              <View style={[styles.circleIcon, selectedCategory === item && styles.circleIconActive]}>
                <Icon size={24} color={selectedCategory === item ? '#fff' : '#fbaa30'} />
              </View>
              <Text style={[styles.circleText, selectedCategory === item && styles.circleTextActive]}>{item}</Text>
            </TouchableOpacity>
          );
        }}
      />
      <ScrollView contentContainerStyle={styles.cardsRow}>
        {filteredPlaces.length === 0 ? (
          <Text style={styles.noResults}>No hay negocios en esta categoría.</Text>
        ) : (
          filteredPlaces.map((item: Place) => (
            <TouchableOpacity
              key={item.id}
              style={[styles.card, item.featured && styles.featuredCard]}
              onPress={() => router.push(`/places/${item.id}`)}
            >
              <Image
                source={{ uri: item.photo_url || 'https://via.placeholder.com/300x200?text=Sin+logo' }}
                style={styles.image}
                resizeMode="cover"
              />
              <View style={styles.content}>
                <View style={styles.cardHeaderRow}>
                  <Text style={styles.name}>{item.name}</Text>
                  {item.hours && (
                    <View style={[styles.statusBadge, isOpen(item.hours) ? styles.open : styles.closed]}>
                      <Text style={styles.statusText}>{isOpen(item.hours) ? 'Abierto' : 'Cerrado'}</Text>
                    </View>
                  )}
                  {item.featured && (
                    <View style={styles.featuredBadge}>
                      <Text style={styles.featuredBadgeText}>★ DESTACADO</Text>
                    </View>
                  )}
                </View>
                <View style={styles.ratingContainer}>
                  <Star size={16} color="#fbaa30" fill="#fbaa30" />
                  <Text style={styles.rating}>{item.rating !== null && item.rating !== undefined ? Number(item.rating).toFixed(1) : '—'}</Text>
                </View>
                <View style={styles.infoRow}>
                  <MapPin size={16} color="#666" />
                  <Text style={styles.info}>{item.address}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Phone size={16} color="#666" />
                  <Text style={styles.info}>{item.phone}</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 20,
    paddingHorizontal: 18,
    marginBottom: 0,
  },
  mapIconButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#fff',
    elevation: 2,
    shadowColor: '#fbaa30',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  closeMapButton: {
    alignSelf: 'flex-end',
    padding: 16,
    marginTop: 8,
    marginRight: 8,
    zIndex: 10,
  },
  map: {
    width: '100%',
    height: 260,
    marginBottom: 20,
    borderRadius: 16,
    overflow: 'hidden',
  },
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontFamily: 'Inter_700Bold',
    padding: 20,
    paddingBottom: 10,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    marginHorizontal: 18,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#eee',
    elevation: 1,
  },
  searchInput: {
    flex: 1,
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    color: '#222',
    paddingVertical: 4,
  },
  circleList: {
    paddingHorizontal: 16,
    paddingBottom: 24, 
    gap: 8,
    minHeight: 90,
    marginTop: 10,
    marginBottom: 32, 
  },
  circleCat: {
    alignItems: 'center',
    marginRight: 16,
    minWidth: 64,
    maxWidth: 120,
  },
  circleCatActive: {},
  circleIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#fbaa30',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
    shadowColor: '#fbaa30',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  circleIconActive: {
    backgroundColor: '#fbaa30',
    borderColor: '#fbaa30',
    shadowOpacity: 0.18,
  },
  circleText: {
    fontFamily: 'Inter_500Medium',
    color: '#888',
    fontSize: 13,
    textAlign: 'center',
  },
  circleTextActive: {
    color: '#fbaa30',
    fontWeight: '700',
  },
  cardsRow: {
    gap: 14,
    paddingHorizontal: 10,
    marginTop: 0,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    marginBottom: 18,
    marginTop: 2,
  },
  featuredCard: {
    borderWidth: 2,
    borderColor: '#FFD700', // Dorado
    shadowColor: '#FFD700',
    shadowOpacity: 0.2,
    elevation: 4,
  },
  image: {
    width: '100%',
    height: 140,
  },
  content: {
    padding: 14,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  name: {
    fontSize: 17,
    fontFamily: 'Inter_600SemiBold',
    marginBottom: 6,
  },
  statusBadge: {
    borderRadius: 8,
    paddingVertical: 2,
    paddingHorizontal: 8,
    marginLeft: 6,
  },
  statusText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    color: '#fff',
  },
  open: {
    backgroundColor: '#4BB543',
  },
  closed: {
    backgroundColor: '#D32F2F',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  rating: {
    marginLeft: 4,
    fontFamily: 'Inter_600SemiBold',
    color: '#fbaa30',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  info: {
    marginLeft: 8,
    color: '#666',
    fontFamily: 'Inter_400Regular',
  },
  featuredBadge: {
    backgroundColor: '#FFD700',
    borderRadius: 6,
    paddingVertical: 2,
    paddingHorizontal: 8,
    marginLeft: 8,
  },
  featuredBadgeText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 12,
    letterSpacing: 1,
  },
  noResults: {
    fontFamily: 'Inter_400Regular',
    color: '#999',
    fontSize: 15,
    textAlign: 'center',
    marginVertical: 32,
  },
});