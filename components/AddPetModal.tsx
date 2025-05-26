import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Image,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { X, Camera, Upload, Plus } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import * as ImagePicker from 'expo-image-picker';
import { uploadImage, deleteImageByPublicUrl } from '@/utils/imageUpload';
import { useMembership } from '../hooks/useMembership';

type AddPetModalProps = {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  onAddPet?: (petData: any) => Promise<void>;
  maxImages?: number;
};

type PetData = {
  name: string;
  species: string;
  breed: string;
  age: string;
  description: string;
  image_url?: string;
  interest?: string[];
};

const BASE_INTERESES = [
  'Jugar',
  'Pasear',
  'Dormir',
  'Comer',
  'Correr',
  'Socializar',
  'Aprender trucos',
  'Nadar',
];

export default function AddPetModal({ visible, onClose, onSuccess }: AddPetModalProps) {
  const [petData, setPetData] = useState<PetData>({
    name: '',
    species: '',
    breed: '',
    age: '',
    description: '',
  });
  const [images, setImages] = useState<string[]>([]);
const [interest, setIntereses] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const { membership } = useMembership();
  const maxImages = membership?.max_photos_per_pet || 1; // Default to 1 if no membership

  const handleChange = (field: keyof PetData, value: string) => {
    setPetData({ ...petData, [field]: value });
  };

  const pickImage = async () => {
    if (images.length >= maxImages) {
      Alert.alert('Límite de imágenes', `Solo puedes subir hasta ${maxImages} imágenes para tu mascota.`);
      return;
    }
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setImages([...images, result.assets[0].uri]);
      }
    } catch (error) {
      console.error('Error al seleccionar imagen:', error);
      Alert.alert('Error', 'No se pudo seleccionar la imagen');
    }
  };

  const takePhoto = async () => {
    if (images.length >= maxImages) {
      Alert.alert('Límite de imágenes', `Solo puedes subir hasta ${maxImages} imágenes para tu mascota.`);
      return;
    }
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert('Permiso denegado', 'Necesitamos permisos de cámara para tomar fotos');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setImages([...images, result.assets[0].uri]);
    }
  };

  const removeImage = async (idx: number) => {
    const imageToRemove = images[idx];
    setImages(images.filter((_, index) => index !== idx));
    // Eliminar del bucket si es una URL pública (no local)
    if (imageToRemove && imageToRemove.startsWith('http')) {
      try {
        await deleteImageByPublicUrl(imageToRemove);
      } catch (err) {
        console.error('Error al eliminar la imagen del bucket:', err);
      }
    }
  };

  const savePet = async () => {
    // Validación básica
    if (!petData.name || !petData.species) {
      Alert.alert('Error', 'Por favor completa al menos el nombre y la especie de tu mascota');
      return;
    }

    // Sanitizar los campos para evitar problemas con la base de datos
    const sanitizeField = (field: string | undefined | null): string | null => {
      if (!field) return null;
      return field.trim().substring(0, 500); // Limitar a 500 caracteres
    };

    setLoading(true);
    
    try {
      // Verificar explícitamente la autenticación
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        throw new Error('Error al verificar tu sesión. Por favor, inicia sesión nuevamente.');
      }
      
      if (!session || !session.user) {
        throw new Error('No has iniciado sesión. Por favor, inicia sesión para agregar mascotas.');
      }
      
      console.log('Usuario autenticado:', session.user.email);
      
      // Subir imágenes y obtener URLs
      let imageUrls: string[] = [];
      if (images.length > 0) {
        try {
          imageUrls = await Promise.all(images.map(async (image) => {
            return await uploadImage(image);
          }));
        } catch (err) {
          throw new Error('Error al subir imágenes');
        }
      }

      // Preparar datos para inserción
      const petRecord = {
        owner_id: session.user.id,
        name: petData.name.trim(),
        species: petData.species.trim(),
        breed: sanitizeField(petData.breed),
        age: sanitizeField(petData.age),
        description: sanitizeField(petData.description),
        image_url: imageUrls[0] || null, // Principal image
        images: imageUrls.length > 0 ? imageUrls : null, // All images
        interest: interest,
      };

      // Guardar los datos de la mascota en la base de datos
      const { error: insertError } = await supabase
        .from('pets')
        .insert([petRecord]);

      if (insertError) {
        console.error('Error al insertar en la base de datos:', insertError);
        throw new Error('Error al guardar en la base de datos: ' + insertError.message);
      }

      console.log('Mascota guardada exitosamente');
      
      // Limpiar el formulario
      setPetData({
        name: '',
        species: '',
        breed: '',
        age: '',
        description: '',
      });
      setImages([]);
    setIntereses([]);
      if (onSuccess) onSuccess();
      onClose();
    } catch (error: any) {
      if (error.message.includes('autenticación') || error.message.includes('sesión') || error.message.includes('iniciar sesión')) {
        Alert.alert('Error de autenticación', error.message);
      } else if (error.message.includes('base de datos')) {
        Alert.alert('Error en la base de datos', error.message);
      } else if (error.message.includes('imagen')) {
        Alert.alert('Error con la imagen', error.message);
      } else {
        Alert.alert('Error', error.message || 'No se pudo guardar la mascota. Por favor, intenta de nuevo.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.centeredView}>
        <View style={styles.modalView}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Agregar Mascota</Text>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <X size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.formContainer}>
            {/* Galería de imágenes con reordenamiento y principal */}
            <Text style={styles.label}>Fotos</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
              {images.map((img, idx) => (
                <View key={idx} style={{ position: 'relative', marginRight: 8 }}>
                  <Image
                    source={{ uri: img }}
                    style={{ width: 80, height: 80, borderRadius: 8, borderWidth: 1, borderColor: idx === 0 ? '#ffbc4c' : '#ddd' }}
                  />
                  {/* Botón para marcar como principal */}
                  {idx !== 0 && (
                    <TouchableOpacity
                      style={{
                        position: 'absolute',
                        bottom: 2,
                        left: 2,
                        backgroundColor: '#ffbc4c',
                        borderRadius: 10,
                        paddingHorizontal: 4,
                        paddingVertical: 2,
                        zIndex: 2,
                      }}
                      onPress={() => {
                        const newImages = [...images];
                        const [selected] = newImages.splice(idx, 1);
                        setImages([selected, ...newImages]);
                      }}
                    >
                      <Text style={{ color: '#222', fontWeight: 'bold', fontSize: 10 }}>Principal</Text>
                    </TouchableOpacity>
                  )}
                  {/* Botón para mover a la izquierda */}
                  {idx > 0 && (
                    <TouchableOpacity
                      style={{
                        position: 'absolute',
                        top: 2,
                        left: 2,
                        backgroundColor: '#eee',
                        borderRadius: 10,
                        width: 20,
                        height: 20,
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 2,
                      }}
                      onPress={() => {
                        const newImages = [...images];
                        [newImages[idx - 1], newImages[idx]] = [newImages[idx], newImages[idx - 1]];
                        setImages(newImages);
                      }}
                    >
                      <Text style={{ color: '#666', fontWeight: 'bold', fontSize: 14 }}>{'<'}</Text>
                    </TouchableOpacity>
                  )}
                  {/* Botón para mover a la derecha */}
                  {idx < images.length - 1 && (
                    <TouchableOpacity
                      style={{
                        position: 'absolute',
                        top: 2,
                        right: 24,
                        backgroundColor: '#eee',
                        borderRadius: 10,
                        width: 20,
                        height: 20,
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 2,
                      }}
                      onPress={() => {
                        const newImages = [...images];
                        [newImages[idx + 1], newImages[idx]] = [newImages[idx], newImages[idx + 1]];
                        setImages(newImages);
                      }}
                    >
                      <Text style={{ color: '#666', fontWeight: 'bold', fontSize: 14 }}>{'>'}</Text>
                    </TouchableOpacity>
                  )}
                  {/* Botón para eliminar imagen */}
                  <TouchableOpacity
                    style={{
                      position: 'absolute',
                      top: 2,
                      right: 2,
                      backgroundColor: 'rgba(0,0,0,0.6)',
                      borderRadius: 10,
                      width: 20,
                      height: 20,
                      alignItems: 'center',
                      justifyContent: 'center',
                      zIndex: 2,
                    }}
                    onPress={() => removeImage(idx)}
                    disabled={loading}
                  >
                    <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 14 }}>×</Text>
                  </TouchableOpacity>
                  {/* Indicador de principal */}
                  {idx === 0 && (
                    <View style={{ position: 'absolute', bottom: 2, right: 2, backgroundColor: '#ffbc4c', borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 }}>
                      <Text style={{ color: '#222', fontWeight: 'bold', fontSize: 10 }}>Principal</Text>
                    </View>
                  )}
                </View>
              ))}
              {images.length < maxImages && (
                <TouchableOpacity
                  style={{
                    width: 80,
                    height: 80,
                    borderRadius: 8,
                    backgroundColor: '#f3f3f3',
                    justifyContent: 'center',
                    alignItems: 'center',
                    borderWidth: 1,
                    borderColor: '#ddd',
                  }}
                  onPress={pickImage}
                  disabled={images.length >= maxImages || loading}
                >
                  <Text style={{ color: '#bbb', fontSize: 32 }}>+</Text>
                </TouchableOpacity>
              )}
            </ScrollView>

            {/* Formulario */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Nombre*</Text>
              <TextInput
                style={styles.input}
                placeholder="Nombre de tu mascota"
                value={petData.name}
                onChangeText={(text) => handleChange('name', text)}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Especie*</Text>
              <View style={styles.speciesContainer}>
                {['Perro', 'Gato', 'Otros'].map(option => (
                  <TouchableOpacity
                    key={option}
                    style={[
                      styles.speciesButton,
                      petData.species === option && styles.speciesButtonSelected,
                      loading && styles.disabledButton
                    ]}
                    onPress={() => handleChange('species', option)}
                    disabled={loading}
                  >
                    <Text style={[
                      styles.speciesButtonText,
                      petData.species === option && styles.speciesButtonTextSelected
                    ]}>
                      {option}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Raza</Text>
              <TextInput
                style={styles.input}
                placeholder="Raza de tu mascota"
                value={petData.breed}
                onChangeText={(text) => handleChange('breed', text)}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Edad</Text>
              <TextInput
                style={styles.input}
                placeholder="Edad de tu mascota"
                value={petData.age}
                onChangeText={(text) => handleChange('age', text)}
                keyboardType="numeric"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Descripción</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Cuéntanos sobre tu mascota"
                value={petData.description}
                onChangeText={(text) => handleChange('description', text)}
                multiline
                numberOfLines={4}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Intereses</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                {BASE_INTERESES.map((interes) => {
                  const isSelected = interest.includes(interes);
                  const limite = maxImages > 3 ? 5 : 3;
                  return (
                    <TouchableOpacity
                      key={interes}
                      style={{
                        backgroundColor: isSelected ? '#ffbc4c' : '#f5f5f5',
                        borderRadius: 16,
                        paddingHorizontal: 12,
                        paddingVertical: 6,
                        margin: 4,
                        borderWidth: 1,
                        borderColor: isSelected ? '#ffbc4c' : '#ccc',
                      }}
                      onPress={() => {
                        if (!isSelected && interest.length >= limite) {
                          Alert.alert('Límite de intereses', `Solo puedes seleccionar hasta ${limite} intereses con tu membresía.`);
                          return;
                        }
                        setIntereses((prev) =>
                          isSelected
                            ? prev.filter((i) => i !== interes)
                            : [...prev, interes]
                        );
                      }}
                    >
                      <Text style={{ color: isSelected ? '#fff' : '#333' }}>{interes}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </ScrollView>

          <TouchableOpacity 
            style={styles.saveButton} 
            onPress={savePet}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.saveButtonText}>Guardar Mascota</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalView: {
    width: '90%',
    maxHeight: '80%',
    backgroundColor: 'white',
    borderRadius: 20,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: {
          width: 0,
          height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 4,
      },
      android: {
        elevation: 5,
      },
      web: {
        boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.25)',
      },
    }),
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: 'Inter_700Bold',
  },
  closeButton: {
    padding: 4,
  },
  formContainer: {
    padding: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  speciesContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  speciesButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    marginHorizontal: 4,
    alignItems: 'center',
  },
  speciesButtonSelected: {
    backgroundColor: '#ffbc4c',
    borderColor: '#ffbc4c',
  },
  speciesButtonText: {
    color: '#666',
    fontWeight: '600',
  },
  speciesButtonTextSelected: {
    color: '#222',
  },
  disabledButton: {
    opacity: 0.6,
  },
  saveButton: {
    backgroundColor: '#ffbc4c',
    padding: 16,
    alignItems: 'center',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
  },
});