import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image, ScrollView, ActivityIndicator, TouchableOpacity, Dimensions, TextInput, Modal, Pressable } from 'react-native';
import { supabase } from '@/lib/supabase';
import { MapPin, ArrowLeft, Search, Filter } from 'lucide-react-native';
import { useRouter } from 'expo-router';

const { width } = Dimensions.get('window');

function formatEventDate(dateString: string) {
  const date = new Date(dateString);
  return date.toLocaleDateString('es-AR', { day: 'numeric', month: 'long' });
}

const EVENT_TYPES = [
  { value: '', label: 'Todos' },
  { value: 'adopcion', label: 'Adopción' },
  { value: 'salud', label: 'Salud' },
  { value: 'educacion', label: 'Educación' },
  { value: 'otro', label: 'Otro' },
];

export default function Eventos() {
  const [eventos, setEventos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [tipo, setTipo] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [eventoDetalle, setEventoDetalle] = useState<any | null>(null);
  const router = useRouter();

  useEffect(() => {
    fetchEventos();
  }, []);

  async function fetchEventos() {
    setLoading(true);
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('is_active', true)
      .gte('event_date', new Date().toISOString().split('T')[0])
      .order('event_date', { ascending: true });
    if (!error && data) setEventos(data);
    setLoading(false);
  }

  // Filtros y búsqueda
  const eventosFiltrados = eventos.filter(ev => {
    const matchSearch =
      ev.title?.toLowerCase().includes(search.toLowerCase()) ||
      ev.description?.toLowerCase().includes(search.toLowerCase()) ||
      ev.location?.toLowerCase().includes(search.toLowerCase()) ||
      ev.organizer_name?.toLowerCase().includes(search.toLowerCase());
    const matchTipo = tipo ? ev.event_type === tipo : true;
    return matchSearch && matchTipo;
  });

  return (
    <View style={styles.container}>
      {/* Header con botón volver mejorado */}
      <View style={styles.headerRow}>
        <TouchableOpacity style={styles.headerBackBtn} onPress={() => router.back()}>
          <ArrowLeft size={24} color="#ffbc4c" />
        </TouchableOpacity>
        <Text style={styles.header}>Todos los Eventos</Text>
      </View>
      {/* Buscador y filtros */}
      <View style={styles.filterRow}>
        <View style={styles.searchBox}>
          <Search size={18} color="#aaa" style={{ marginRight: 6 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar evento, lugar, organizador..."
            value={search}
            onChangeText={setSearch}
            placeholderTextColor="#aaa"
          />
        </View>
        <View style={styles.typeFilterBox}>
          <Filter size={16} color="#ffbc4c" />
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {EVENT_TYPES.map(opt => (
              <TouchableOpacity
                key={opt.value}
                style={[styles.typeFilterBtn, tipo === opt.value && styles.typeFilterBtnActive]}
                onPress={() => setTipo(opt.value)}
              >
                <Text style={[styles.typeFilterText, tipo === opt.value && styles.typeFilterTextActive]}>{opt.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>
      {/* Lista de eventos filtrados */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#ffbc4c" />
          <Text style={styles.loadingText}>Cargando eventos...</Text>
        </View>
      ) : eventosFiltrados.length === 0 ? (
        <Text style={styles.noEventsText}>No hay eventos que coincidan</Text>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          {eventosFiltrados.map(evento => (
            <Pressable
              style={styles.eventCard}
              key={evento.id}
              onPress={() => { setEventoDetalle(evento); setModalVisible(true); }}
            >
              <Image
                source={{ uri: evento.image_url || 'https://images.unsplash.com/photo-1517849845537-4d257902454a' }}
                style={styles.eventImage}
              />
              <View style={styles.eventInfo}>
                <Text style={styles.eventDate}>{formatEventDate(evento.event_date)}</Text>
                <Text style={styles.eventTitle}>{evento.title}</Text>
                <View style={styles.eventLocation}>
                  <MapPin size={14} color="#666" />
                  <Text style={styles.eventLocationText}>{evento.location}</Text>
                </View>
                {evento.description && (
                  <Text style={styles.eventDescription} numberOfLines={2}>{evento.description}</Text>
                )}
              </View>
            </Pressable>
          ))}
        </ScrollView>
      )}
      {/* Modal de detalle de evento */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {eventoDetalle && (
              <>
                <Image
                  source={{ uri: eventoDetalle.image_url || 'https://images.unsplash.com/photo-1517849845537-4d257902454a' }}
                  style={styles.modalImage}
                />
                <Text style={styles.modalTitle}>{eventoDetalle.title}</Text>
                <Text style={styles.modalDate}>{formatEventDate(eventoDetalle.event_date)}</Text>
                <Text style={styles.modalLocation}><MapPin size={14} color="#ffbc4c" /> {eventoDetalle.location}</Text>
                <Text style={styles.modalDescription}>{eventoDetalle.description}</Text>
                {eventoDetalle.organizer_name && (
                  <Text style={styles.modalOrganizer}>Organiza: {eventoDetalle.organizer_name}</Text>
                )}
                <TouchableOpacity style={styles.closeModalBtn} onPress={() => setModalVisible(false)}>
                  <Text style={styles.closeModalBtnText}>Cerrar</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: 16,
    paddingHorizontal: 0,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    paddingHorizontal: 8,
  },
  headerBackBtn: {
    padding: 8,
    marginRight: 2,
  },
  header: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#222',
    flex: 1,
    textAlign: 'center',
    marginRight: 32,
  },
  filterRow: {
    flexDirection: 'column',
    gap: 8,
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f3f3',
    borderRadius: 8,
    paddingHorizontal: 8,
    marginBottom: 6,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#222',
    paddingVertical: 8,
  },
  typeFilterBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  typeFilterBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: '#f3f3f3',
    marginRight: 6,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  typeFilterBtnActive: {
    backgroundColor: '#fff8e1',
    borderColor: '#ffbc4c',
  },
  typeFilterText: {
    fontSize: 14,
    color: '#888',
  },
  typeFilterTextActive: {
    color: '#ffbc4c',
    fontWeight: 'bold',
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
  noEventsText: {
    color: '#888',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 40,
  },
  scrollContainer: {
    paddingBottom: 32,
    paddingHorizontal: 12,
  },
  eventCard: {
    backgroundColor: '#fafafa',
    borderRadius: 12,
    marginBottom: 18,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  eventImage: {
    width: width - 36,
    height: 170,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  eventInfo: {
    padding: 14,
  },
  eventDate: {
    color: '#ffbc4c',
    fontWeight: 'bold',
    marginBottom: 2,
  },
  eventTitle: {
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 7,
    color: '#222',
  },
  eventLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  eventLocationText: {
    marginLeft: 4,
    color: '#666',
    fontSize: 13,
  },
  eventDescription: {
    color: '#444',
    fontSize: 13,
    marginTop: 2,
  },
  // --- Modal detalle ---
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 18,
    width: width - 32,
    alignItems: 'center',
    elevation: 5,
  },
  modalImage: {
    width: width - 64,
    height: 180,
    borderRadius: 12,
    marginBottom: 10,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#222',
    marginBottom: 4,
    textAlign: 'center',
  },
  modalDate: {
    color: '#ffbc4c',
    fontWeight: 'bold',
    marginBottom: 4,
  },
  modalLocation: {
    color: '#666',
    marginBottom: 8,
    textAlign: 'center',
  },
  modalDescription: {
    color: '#444',
    fontSize: 15,
    marginBottom: 8,
    textAlign: 'center',
  },
  modalOrganizer: {
    color: '#888',
    fontSize: 13,
    marginBottom: 8,
    textAlign: 'center',
  },
  closeModalBtn: {
    marginTop: 8,
    backgroundColor: '#ffbc4c',
    borderRadius: 18,
    paddingVertical: 8,
    paddingHorizontal: 28,
  },
  closeModalBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
