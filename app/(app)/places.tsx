import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity } from 'react-native';
import { MapPin, Star, Phone } from 'lucide-react-native';

const places = [
  {
    id: '1',
    name: 'Happy Paws Vet Clinic',
    image: 'https://images.unsplash.com/photo-1532938911079-1b06ac7ceec7',
    rating: 4.8,
    type: 'Veterinary',
    address: '123 Pet Street',
    phone: '+1 234 567 890',
  },
  {
    id: '2',
    name: 'Pawsome Grooming',
    image: 'https://images.unsplash.com/photo-1516734212186-65266f683123',
    rating: 4.6,
    type: 'Grooming',
    address: '456 Dog Avenue',
    phone: '+1 234 567 891',
  },
];

export default function Places() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Pet Services Near You</Text>
      <FlatList
        data={places}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card}>
            <Image source={{ uri: item.image }} style={styles.image} />
            <View style={styles.content}>
              <Text style={styles.name}>{item.name}</Text>
              <View style={styles.ratingContainer}>
                <Star size={16} color="#FFD700" fill="#FFD700" />
                <Text style={styles.rating}>{item.rating}</Text>
                <Text style={styles.type}>• {item.type}</Text>
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
        )}
        contentContainerStyle={styles.list}
      />
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
    marginRight: 4,
    fontFamily: 'Inter_600SemiBold',
  },
  type: {
    color: '#666',
    fontFamily: 'Inter_400Regular',
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
});