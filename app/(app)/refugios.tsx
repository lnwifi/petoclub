import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity, Modal } from 'react-native';
import { MapPin, Star, Phone, Heart } from 'lucide-react-native';
import { useState, useEffect } from 'react';
import { Stack } from 'expo-router';
import RefugioDetalle from '@/components/RefugioDetalle';
import { supabase } from '../lib/supabase';

// Tipos
type Pet = {
  id: string;
  name: string;
  image: string;
  description: string;
  age: string;
  size: string;
};

type UrgentCause = {
  id: string;
  title: string;
  description: string;
  goal: number;
  current: number;
};

type Refugio = {
  id: string;
  name: string;
  image: string;
  rating: number;
  address: string;
  phone: string;
  description: string;
  pets: Pet[];
  urgentCauses: UrgentCause[];
  bankAccount?: string;
  email?: string;
};

export default function Refugios() {
  const [refugios, setRefugios] = useState<Refugio[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRefugio, setSelectedRefugio] = useState<Refugio | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [currentRefugio, setCurrentRefugio] = useState<Refugio | null>(null);

  useEffect(() => {
    const fetchRefugios = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('refugios')
        .select('*')
        .order('name');
      // Asegura que pets siempre sea igual a mascotas de Supabase
      const refugios = (data || []).map(r => ({
        ...r,
        pets: Array.isArray(r.mascotas) ? r.mascotas : [],
        urgentCauses: Array.isArray(r.causas_urgentes) ? r.causas_urgentes : [],
      }));
      setRefugios(refugios);
      setLoading(false);
    };
    fetchRefugios();
  }, []);

  if (loading) return <Text style={{textAlign:'center',marginTop:40}}>Cargando refugios...</Text>;
  if (!refugios.length) return <Text style={{textAlign:'center',marginTop:40}}>No hay refugios registrados.</Text>;

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Refugios',
          headerTitleStyle: {
            fontFamily: 'Inter_600SemiBold',
          },
        }}
      />
      
      <Text style={styles.title}>Refugios Asociados</Text>
      <FlatList
        data={refugios}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity 
            style={styles.card}
            onPress={() => setSelectedRefugio(item)}
          >
            <Image source={{ uri: item.image }} style={styles.image} />
            <View style={styles.content}>
              <Text style={styles.name}>{item.name}</Text>
              <View style={styles.ratingContainer}>
                <Star size={16} color="#FFD700" fill="#FFD700" />
                <Text style={styles.rating}>{item.rating}</Text>
              </View>
              <Text style={styles.description}>{item.description}</Text>
              <View style={styles.infoRow}>
                <MapPin size={16} color="#666" />
                <Text style={styles.info}>{item.address}</Text>
              </View>
              <View style={styles.infoRow}>
                <Phone size={16} color="#666" />
                <Text style={styles.info}>{item.phone}</Text>
              </View>
              {item.email && (
                <View style={styles.infoRow}>
                  <Text style={styles.info}>{item.email}</Text>
                </View>
              )}
              {item.bankAccount && (
                <View style={styles.infoRow}>
                  <Text style={styles.info}>{item.bankAccount}</Text>
                </View>
              )}
              <View style={styles.petInfo}>
                <Text style={styles.petCount}>{(Array.isArray(item.pets) ? item.pets.length : 0)} mascotas en adopción</Text>
              </View>
              <TouchableOpacity 
                style={styles.donateButton}
                onPress={() => {
                  setCurrentRefugio(item);
                  setShowDetails(true);
                }}
              >
                <Heart size={16} color="#fff" />
                <Text style={styles.donateButtonText}>Apoyar</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        )}
        contentContainerStyle={styles.list}
      />

      <Modal
        visible={selectedRefugio !== null}
        animationType="slide"
        onRequestClose={() => setSelectedRefugio(null)}
      >
        {selectedRefugio && (
          <RefugioDetalle
            refugio={{
              ...selectedRefugio,
              location: selectedRefugio.address,
              bankAccount: selectedRefugio.bankAccount || 'Cuenta Bancaria: XXX-XXXXX-X',
              email: selectedRefugio.email || 'contacto@refugio.com'
            }}
            onClose={() => setSelectedRefugio(null)}
          />
        )}
      </Modal>

      <Modal
        visible={showDetails}
        animationType="slide"
        onRequestClose={() => setShowDetails(false)}
      >
        {currentRefugio && (
          <RefugioDetalle
            refugio={{
              ...currentRefugio,
              location: currentRefugio.address,
              bankAccount: currentRefugio.bankAccount || 'Cuenta Bancaria: XXX-XXXXX-X',
              email: currentRefugio.email || 'contacto@refugio.com'
            }}
            onClose={() => setShowDetails(false)}
          />
        )}
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontFamily: 'Inter_700Bold',
    padding: 20,
  },
  list: {
    padding: 20,
    gap: 20,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  image: {
    width: '100%',
    height: 150,
  },
  content: {
    padding: 15,
  },
  name: {
    fontSize: 18,
    fontFamily: 'Inter_600SemiBold',
    marginBottom: 8,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  rating: {
    marginLeft: 4,
    fontFamily: 'Inter_600SemiBold',
  },
  description: {
    color: '#666',
    fontFamily: 'Inter_400Regular',
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  info: {
    marginLeft: 8,
    color: '#666',
    fontFamily: 'Inter_400Regular',
  },
  petInfo: {
    marginTop: 12,
  },
  petCount: {
    color: '#ffbc4c',
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
  },
  donateButton: {
    backgroundColor: '#ffbc4c',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
    borderRadius: 8,
    marginTop: 15,
  },
  donateButtonText: {
    color: '#fff',
    fontFamily: 'Inter_600SemiBold',
    marginLeft: 8,
  },
});