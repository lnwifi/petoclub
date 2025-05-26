import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Image, StyleSheet, ActivityIndicator, Modal, FlatList, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { getAvisos } from '../../utils/redDeAyudaApi';
import AvisoDetail from './AvisoDetail';
import CreateAvisoModal from './CreateAvisoModal';

const tipos = [
  { value: '', label: 'Todos' },
  { value: 'perdido', label: 'Perdidos' },
  { value: 'encontrado', label: 'Encontrados' },
  { value: 'adopcion', label: 'Adopciones' }
];

function shuffleArray(arr: any[]) {
  return arr.map(v => [Math.random(), v]).sort((a, b) => a[0] - b[0]).map(([_, v]) => v);
}

const CARD_SIZE = (Dimensions.get('window').width - 48) / 2;

interface AvisosListProps {
  avisoIdToShow?: string;
}

export default function AvisosList({ avisoIdToShow }: AvisosListProps) {
  const router = useRouter();
  const [avisos, setAvisos] = useState<any[]>([]);
  const [tipo, setTipo] = useState('');
  const [selected, setSelected] = useState<any | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editAviso, setEditAviso] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);

  // Efecto para manejar la selección inicial del aviso cuando se carga la lista
  useEffect(() => {
    if (avisoIdToShow && avisos.length > 0) {
      const avisoToShow = avisos.find(aviso => aviso.id === avisoIdToShow);
      if (avisoToShow && (!selected || selected.id !== avisoIdToShow)) {
        setSelected(avisoToShow);
      }
    }
  }, [avisoIdToShow, avisos]);

  const refreshAvisos = () => {
    setLoading(true);
    getAvisos(tipo).then(data => {
      const shuffledData = shuffleArray(data);
      setAvisos(shuffledData);
      setLoading(false);
    });
  };

  useEffect(() => {
    refreshAvisos();
    // eslint-disable-next-line
  }, [tipo, showModal]);

  const destacados = avisos.filter(a => a.destacado);
  const normales = avisos.filter(a => !a.destacado);
  const avisosOrdenados = [...destacados, ...normales];

  const handleCardPress = (item: any) => {
    // Si estamos en la pantalla principal (sin avisoIdToShow), navegamos a la pantalla de detalles
    if (!avisoIdToShow) {
      router.push(`/red-de-ayuda?avisoId=${item.id}`);
    } else {
      // Si ya estamos en la pantalla de detalles, actualizamos la selección
      setSelected(item);
    }
  };

  const renderItem = ({ item }: { item: any }) => (
    <TouchableOpacity
      key={item.id}
      style={[styles.card, item.destacado && styles.cardDestacado]}
      onPress={() => handleCardPress(item)}
      activeOpacity={0.85}
    >
      {item.destacado && (
        <View style={styles.badgeDestacado}>
          <Text style={styles.badgeDestacadoText}>Destacado</Text>
        </View>
      )}
      {item.imagenes_urls && item.imagenes_urls.length > 0 ? (
        <Image source={{ uri: item.imagenes_urls[0] }} style={styles.cardImage} />
      ) : (
        <View style={[styles.cardImage, { backgroundColor: '#eee', alignItems: 'center', justifyContent: 'center' }]}> 
          <Text style={{ color: '#bbb', fontSize: 24 }}>🐾</Text>
        </View>
      )}
      <Text style={styles.cardTipo}>{item.tipo_aviso}</Text>
      <Text style={styles.cardNombre}>{item.nombre}</Text>
      <Text style={styles.cardUbicacion}>{item.ubicacion}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Red de Ayuda</Text>
        <TouchableOpacity style={styles.createBtn} onPress={() => setShowModal(true)}>
          <Text style={styles.createBtnText}>Crear Aviso</Text>
        </TouchableOpacity>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtersRow}>
        {tipos.map(t => (
          <TouchableOpacity
            key={t.value}
            style={[styles.filterBtn, tipo === t.value && styles.filterBtnActive]}
            onPress={() => setTipo(t.value)}
          >
            <Text style={[styles.filterBtnText, tipo === t.value && styles.filterBtnTextActive]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      {loading ? (
        <ActivityIndicator size="large" color="#ffbc4c" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={avisosOrdenados}
          renderItem={renderItem}
          keyExtractor={item => item.id}
          numColumns={2}
          columnWrapperStyle={{ gap: 16, marginBottom: 16 }}
          contentContainerStyle={avisos.length === 0 ? { flex: 1, justifyContent: 'center' } : {}}
          ListEmptyComponent={<Text style={styles.emptyText}>No hay avisos.</Text>}
          style={styles.list}
        />
      )}
      <Modal visible={!!selected} animationType="slide" transparent>
        {selected && (
          <AvisoDetail
            aviso={selected}
            onClose={() => setSelected(null)}
            onEdit={(av) => {
              setEditAviso(av);
              setSelected(null);
              setShowModal(true);
            }}
            refreshAvisos={refreshAvisos}
          />
        )}
      </Modal>
      <Modal visible={showModal} animationType="slide" transparent>
        {showModal && (
          <CreateAvisoModal
            onClose={() => {
              setShowModal(false);
              setEditAviso(null);
            }}
            editAviso={editAviso}
            refreshAvisos={refreshAvisos}
          />
        )}
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
    padding: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
    fontFamily: 'Inter_700Bold',
  },
  createBtn: {
    backgroundColor: '#ffbc4c',
    paddingVertical: 8,
    paddingHorizontal: 18,
    borderRadius: 24,
    elevation: 2,
  },
  createBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
  },
  filtersRow: {
    flexGrow: 0,
    marginBottom: 12,
  },
  filterBtn: {
    backgroundColor: '#eee',
    borderRadius: 16,
    paddingVertical: 6,
    paddingHorizontal: 16,
    marginRight: 8,
  },
  filterBtnActive: {
    backgroundColor: '#ffbc4c',
  },
  filterBtnText: {
    color: '#666',
    fontSize: 15,
    fontFamily: 'Inter_500Medium',
  },
  filterBtnTextActive: {
    color: '#fff',
    fontWeight: 'bold',
  },
  list: {
    flex: 1,
  },
  emptyText: {
    textAlign: 'center',
    color: '#888',
    marginTop: 32,
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 10,
    width: CARD_SIZE,
    minHeight: CARD_SIZE + 24,
    alignItems: 'center',
    justifyContent: 'flex-start',
    marginBottom: 0,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 1,
    marginHorizontal: 0,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  cardDestacado: {
    borderColor: '#ffbc4c',
    shadowColor: '#ffbc4c',
    shadowOpacity: 0.18,
    elevation: 4,
  },
  cardImage: {
    width: CARD_SIZE - 24,
    height: CARD_SIZE - 24,
    borderRadius: 14,
    marginBottom: 6,
    backgroundColor: '#eee',
  },
  badgeDestacado: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: '#ffbc4c',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    zIndex: 2,
    shadowColor: '#ffbc4c',
    shadowOpacity: 0.15,
    elevation: 3,
  },
  badgeDestacadoText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 12,
    letterSpacing: 0.5,
  },
  cardTipo: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#ffbc4c',
    textTransform: 'capitalize',
    fontFamily: 'Inter_600SemiBold',
    marginBottom: 2,
  },
  cardNombre: {
    fontSize: 15,
    color: '#2c3e50',
    fontFamily: 'Inter_500Medium',
    marginBottom: 2,
  },
  cardUbicacion: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
    fontFamily: 'Inter_400Regular',
  },
});
