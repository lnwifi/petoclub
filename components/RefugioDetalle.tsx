import React from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

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

type RefugioDetalleProps = {
  refugio: {
    id: string;
    name: string;
    description: string;
    image: string;
    location: string;
    phone: string;
    email: string;
    pets: Pet[];
    urgentCauses: UrgentCause[];
    bankAccount: string;
  };
  onClose: () => void;
};

// Utilidad para mapear los datos desde Supabase al formato esperado por la tarjeta
function mapRefugioSupabaseToCard(refugio: any) {
  return {
    ...refugio,
    pets: Array.isArray(refugio.mascotas) ? refugio.mascotas : [],
    urgentCauses: Array.isArray(refugio.causas_urgentes) ? refugio.causas_urgentes : [],
    location: refugio.address || refugio.location || '',
    bankAccount: refugio.bank_account || refugio.bankAccount || '',
  };
}

export default function RefugioDetalle({ refugio, onClose }: RefugioDetalleProps) {
  const mappedRefugio = mapRefugioSupabaseToCard(refugio);
  const handleDonate = () => {
    Linking.openURL(`https://petoclub.com.ar/donate/${mappedRefugio.id}`);
  };

  const handleContact = () => {
    Linking.openURL(`tel:${mappedRefugio.phone}`);
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.closeButton} onPress={onClose}>
        <Ionicons name="close" size={24} color="#333" />
      </TouchableOpacity>

      <ScrollView style={styles.scrollView}>
        <Image source={{ uri: mappedRefugio.image }} style={styles.refugioImage} />
        
        <View style={styles.infoContainer}>
          <Text style={styles.refugioName}>{mappedRefugio.name}</Text>
          <Text style={styles.refugioDescription}>{mappedRefugio.description}</Text>
          
          <View style={styles.contactInfo}>
            <Ionicons name="location" size={20} color="#666" />
            <Text style={styles.contactText}>{mappedRefugio.location}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Mascotas para Adoptar</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.petsScroll}>
            {mappedRefugio.pets.map((pet: any) => (
              <View key={pet.id} style={styles.petCard}>
                <Image source={{ uri: pet.image }} style={styles.petImage} />
                <Text style={styles.petName}>{pet.name}</Text>
                <Text style={styles.petDescription}>{pet.description}</Text>
                <Text style={styles.petInfo}>{`${pet.age} · ${pet.size}`}</Text>
                <TouchableOpacity
                  style={styles.adoptButton}
                  onPress={() => {
                    const phone = mappedRefugio.phone?.replace(/[^\d]/g, '');
                    const url = `https://wa.me/${phone}?text=Hola!%20Quiero%20adoptar%20a%20${encodeURIComponent(pet.name)}%20del%20refugio%20${encodeURIComponent(mappedRefugio.name)}%20%F0%9F%90%BE`;
                    Linking.openURL(url);
                  }}
                >
                  <Text style={styles.adoptButtonText}>¡Adoptame!</Text>
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Causas Urgentes</Text>
          {mappedRefugio.urgentCauses.map((cause: any) => (
            <View key={cause.id} style={styles.causeCard}>
              <Text style={styles.causeTitle}>{cause.title}</Text>
              <Text style={styles.causeDescription}>{cause.description}</Text>
              <View style={styles.progressBar}>
                <View 
                  style={[styles.progressFill, { width: `${(cause.current / cause.goal) * 100}%` }]} 
                />
              </View>
              <Text style={styles.progressText}>
                ${cause.current} de ${cause.goal}
              </Text>
            </View>
          ))}
        </View>

        <View style={styles.donationSection}>
          <Text style={styles.donationTitle}>Datos para Donaciones</Text>
          <Text style={styles.bankInfo}>{mappedRefugio.bankAccount}</Text>
          
          <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.donateButton} onPress={handleDonate}>
              <Text style={styles.buttonText}>Donar</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.contactButton} onPress={handleContact}>
              <Text style={styles.buttonText}>Contactar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 1,
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 8,
  },
  scrollView: {
    flex: 1,
  },
  refugioImage: {
    width: '100%',
    height: 200,
    resizeMode: 'cover',
  },
  infoContainer: {
    padding: 16,
  },
  refugioName: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  refugioDescription: {
    fontSize: 16,
    color: '#666',
    marginBottom: 16,
  },
  contactInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  contactText: {
    marginLeft: 8,
    color: '#666',
  },
  section: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  petsScroll: {
    marginBottom: 16,
  },
  petCard: {
    marginRight: 16,
    width: 150,
  },
  petImage: {
    width: 150,
    height: 150,
    borderRadius: 8,
    marginBottom: 8,
  },
  petName: {
    fontSize: 16,
    fontWeight: '600',
  },
  petDescription: {
    fontSize: 14,
    color: '#444',
    marginBottom: 4,
    textAlign: 'center',
  },
  petInfo: {
    fontSize: 14,
    color: '#666',
  },
  causeCard: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  causeTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  causeDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#ddd',
    borderRadius: 4,
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#ffbc4c',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'right',
  },
  donationSection: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  donationTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  bankInfo: {
    fontSize: 16,
    color: '#666',
    marginBottom: 24,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  donateButton: {
    flex: 1,
    backgroundColor: '#ffbc4c',
    padding: 16,
    borderRadius: 8,
    marginRight: 8,
  },
  contactButton: {
    flex: 1,
    backgroundColor: '#666',
    padding: 16,
    borderRadius: 8,
    marginLeft: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  adoptButton: {
    marginTop: 8,
    backgroundColor: '#25D366',
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  adoptButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 15,
  },
});