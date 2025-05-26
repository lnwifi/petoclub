import React from 'react';
import { Modal, View, Text, StyleSheet, Image, TouchableOpacity, ScrollView, Dimensions } from 'react-native';

// Tipo Pet igual que en match.tsx
export type Pet = {
  id: string;
  name: string;
  species: string;
  breed: string | null;
  age: string | null;
  description: string | null;
  image_url: string | null;
  images?: string[] | null;
  interest?: string[];
};

interface PetDetailModalProps {
  visible: boolean;
  onClose: () => void;
  pet: Pet | null;
}

const { width } = Dimensions.get('window');

const PetDetailModal: React.FC<PetDetailModalProps> = ({ visible, onClose, pet }) => {
  if (!pet) return null;

  const allImages = pet.images && pet.images.length > 0
    ? pet.images
    : pet.image_url
      ? [pet.image_url]
      : [];

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.centeredView}>
        <View style={styles.modalView}>
          <ScrollView contentContainerStyle={{paddingBottom: 30}} showsVerticalScrollIndicator={false}>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Text style={{ fontSize: 26, color: '#888' }}>×</Text>
            </TouchableOpacity>
            {allImages.length > 0 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
                {allImages.map((img, idx) => (
                  <Image
                    key={idx}
                    source={{ uri: img }}
                    style={styles.petImage}
                  />
                ))}
              </ScrollView>
            )}
            <Text style={styles.petName}>{pet.name}</Text>
            <Text style={styles.petInfo}>Especie: <Text style={styles.petInfoValue}>{pet.species}</Text></Text>
            {pet.breed && <Text style={styles.petInfo}>Raza: <Text style={styles.petInfoValue}>{pet.breed}</Text></Text>}
            {pet.age && <Text style={styles.petInfo}>Edad: <Text style={styles.petInfoValue}>{pet.age}</Text></Text>}
            {pet.description && (
              <Text style={styles.petDescription}>{pet.description}</Text>
            )}
            {pet.interest && pet.interest.length > 0 && (
              <View style={styles.interestContainer}>
                <Text style={styles.sectionTitle}>Intereses</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' }}>
                  {pet.interest.map((int, idx) => (
                    <View key={idx} style={styles.interestBadge}>
                      <Text style={styles.interestText}>{int}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  modalView: {
    width: width * 0.92,
    maxHeight: '90%',
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 18,
    shadowColor: '#000',
    shadowOpacity: 0.22,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 8,
  },
  closeButton: {
    alignSelf: 'flex-end',
    padding: 4,
    marginBottom: 4,
  },
  petImage: {
    width: width * 0.7,
    height: width * 0.7,
    borderRadius: 16,
    marginRight: 10,
    backgroundColor: '#eee',
  },
  petName: {
    fontSize: 26,
    fontWeight: 'bold',
    marginVertical: 10,
    textAlign: 'center',
    color: '#ffbc4c',
    letterSpacing: 1,
  },
  petInfo: {
    fontSize: 16,
    color: '#444',
    marginBottom: 2,
    textAlign: 'center',
  },
  petInfoValue: {
    fontWeight: 'bold',
    color: '#222',
  },
  petDescription: {
    fontSize: 15,
    color: '#555',
    marginVertical: 12,
    textAlign: 'center',
    fontStyle: 'italic',
    paddingHorizontal: 10,
  },
  sectionTitle: {
    fontWeight: 'bold',
    marginTop: 10,
    marginBottom: 4,
    fontSize: 16,
    color: '#4CAF50',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  interestContainer: {
    marginTop: 8,
    alignItems: 'center',
  },
  interestBadge: {
    backgroundColor: '#ffbc4c',
    borderRadius: 14,
    paddingVertical: 5,
    paddingHorizontal: 13,
    margin: 4,
    shadowColor: '#ffbc4c',
    shadowOpacity: 0.13,
    shadowRadius: 5,
    elevation: 2,
  },
  interestText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
    letterSpacing: 0.5,
  },
});

export default PetDetailModal;
