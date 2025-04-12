import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity, Modal } from 'react-native';
import { MapPin, Star, Phone, Heart } from 'lucide-react-native';
import { useState } from 'react';
import { Stack } from 'expo-router';
import RefugioDetalle from '@/components/RefugioDetalle';

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

const refugios: Refugio[] = [
  {
    id: '1',
    name: 'Refugio Patitas Felices',
    image: 'https://images.unsplash.com/photo-1548199973-03cce0bbc87b',
    rating: 4.9,
    address: 'Av. Libertador 1234',
    phone: '+54 11 1234 5678',
    description: 'Refugio dedicado a perros y gatos abandonados. Ofrecemos adopción responsable.',
    pets: [
      {
        id: 'p1',
        name: 'Luna',
        image: 'https://images.unsplash.com/photo-1543466835-00a7907e9de1',
        description: 'Perrita dulce y juguetona',
        age: '2 años',
        size: 'Mediano'
      },
      {
        id: 'p2',
        name: 'Simba',
        image: 'https://images.unsplash.com/photo-1573865526739-10659fec78a5',
        description: 'Gatito muy cariñoso',
        age: '6 meses',
        size: 'Pequeño'
      }
    ],
    urgentCauses: [
      {
        id: 'c1',
        title: 'Alimentos para el invierno',
        description: 'Necesitamos juntar alimentos para nuestros peludos',
        goal: 50000,
        current: 25000
      }
    ]
  },
  {
    id: '2',
    name: 'Hogar de Mascotas',
    image: 'https://images.unsplash.com/photo-1601758124510-52d02ddb7cbd',
    rating: 4.7,
    address: 'Calle San Martín 567',
    phone: '+54 11 8765 4321',
    description: 'Rescatamos animales en situación de calle y les buscamos un hogar amoroso.',
    pets: [
      {
        id: 'p3',
        name: 'Rocky',
        image: 'https://images.unsplash.com/photo-1587300003388-59208cc962cb',
        description: 'Perro adulto muy tranquilo',
        age: '5 años',
        size: 'Grande'
      }
    ],
    urgentCauses: [
      {
        id: 'c2',
        title: 'Campaña de vacunación',
        description: 'Ayudanos a vacunar a todos nuestros rescatados',
        goal: 30000,
        current: 15000
      }
    ]
  },
  {
    id: '3',
    name: 'Refugio Huellitas',
    image: 'https://images.unsplash.com/photo-1541781774459-bb2af2f05b55',
    rating: 4.8,
    address: 'Av. Rivadavia 890',
    phone: '+54 11 2468 1357',
    description: 'Más de 10 años rescatando y rehabilitando animales para darlos en adopción.',
    pets: [
      {
        id: 'p4',
        name: 'Milo',
        image: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba',
        description: 'Gatito juguetón',
        age: '1 año',
        size: 'Pequeño'
      }
    ],
    urgentCauses: [
      {
        id: 'c3',
        title: 'Reparación del refugio',
        description: 'Necesitamos arreglar techos y paredes',
        goal: 100000,
        current: 45000
      }
    ]
  },
];

export default function Refugios() {
  const [selectedRefugio, setSelectedRefugio] = useState<Refugio | null>(null);

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
              <View style={styles.petInfo}>
                <Text style={styles.petCount}>{item.pets.length} mascotas en adopción</Text>
              </View>
              <TouchableOpacity style={styles.donateButton}>
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