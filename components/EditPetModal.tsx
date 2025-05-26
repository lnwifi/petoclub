import React, { useState, useEffect } from 'react';
import { 
  Modal, 
  View, 
  Text, 
  StyleSheet, 
  TextInput, 
  TouchableOpacity, 
  ScrollView,
  Image,
  ActivityIndicator,
  Alert,
  Platform
} from 'react-native';
import { X, Camera, Upload, Check, Trash2 } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '@/lib/supabase';
import { uploadImage, deleteImageByPublicUrl } from '@/utils/imageUpload';
import DestacarPetModal from '../app/components/DestacarPetModal';
import { useMembership } from '../hooks/useMembership';

// Definir el tipo para las mascotas
type Pet = {
  id: string;
  name: string;
  species: string;
  breed: string | null;
  age: string | null;
  description: string | null;
  image_url: string | null;
  owner_id: string;
  images: string[] | null;
  interest?: string[];
};

interface EditPetModalProps {
  visible: boolean;
  onClose: () => void;
  onEditPet: (pet: Pet) => void;
  pet: Pet | null;
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

export default function EditPetModal({ visible, onClose, onEditPet, pet }: EditPetModalProps) {
  const [name, setName] = useState('');
  const [species, setSpecies] = useState('');
  const [breed, setBreed] = useState('');
  const [age, setAge] = useState('');
  const [description, setDescription] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDestacarPet, setShowDestacarPet] = useState(false);
const [interest, setIntereses] = useState<string[]>([]);
  const { membership } = useMembership();
  const maxImages = membership?.max_photos_per_pet || 1; // Default to 1 if no membership

  // Cargar los datos de la mascota cuando cambia el prop pet
  useEffect(() => {
    if (pet) {
      setName(pet.name || '');
      setSpecies(pet.species || '');
      setBreed(pet.breed || '');
      setAge(pet.age || '');
      setDescription(pet.description || '');
      // Preferir la galería si existe, sino usar principal
      if (pet.images && Array.isArray(pet.images) && pet.images.length > 0) {
        setImages(pet.images);
      } else if (pet.image_url) {
        setImages([pet.image_url]);
      } else {
        setImages([]);
      }
      setIntereses(pet.interest || []);
    }
  }, [pet]);

  // Resetear el formulario cuando se cierra el modal
  const resetForm = () => {
    setName('');
    setSpecies('');
    setBreed('');
    setAge('');
    setDescription('');
    setImages([]);
    setIsUploading(false);
    setUploadProgress(0);
    setIsSubmitting(false);
    setIntereses([]);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  // Función para seleccionar una imagen de la galería
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
      Alert.alert('Error', 'No se pudo seleccionar la imagen. Inténtalo de nuevo.');
    }
  };

  // Función para tomar una foto con la cámara
  const takePhoto = async () => {
    if (images.length >= maxImages) {
      Alert.alert('Límite de imágenes', `Solo puedes subir hasta ${maxImages} imágenes para tu mascota.`);
      return;
    }
    try {
      const cameraPermission = await ImagePicker.requestCameraPermissionsAsync();
      
      if (cameraPermission.status !== 'granted') {
        Alert.alert('Permiso denegado', 'Necesitamos permiso para acceder a tu cámara.');
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
    } catch (error) {
      console.error('Error al tomar foto:', error);
      Alert.alert('Error', 'No se pudo tomar la foto. Inténtalo de nuevo.');
    }
  };

  // Función para eliminar una imagen
  const removeImage = async (idx: number) => {
    const imageToRemove = images[idx];
    setImages(images.filter((img, index) => index !== idx));
    // Eliminar del bucket si es una URL pública (no local)
    if (imageToRemove && imageToRemove.startsWith('http')) {
      try {
        await deleteImageByPublicUrl(imageToRemove);
      } catch (err) {
        console.error('Error al eliminar la imagen del bucket:', err);
      }
    }
  };

  // Función para actualizar la mascota
  const updatePet = async () => {
    if (!name.trim() || !species.trim()) {
      Alert.alert('Campos requeridos', 'Por favor, completa al menos el nombre y la especie de tu mascota.');
      return;
    }

    if (!pet?.id) {
      Alert.alert('Error', 'No se pudo identificar la mascota a editar.');
      return;
    }

    try {
      setIsSubmitting(true);
      
      // Subir imágenes y obtener URLs
      let imageUrls: string[] = [];
      if (images.length > 0) {
        setIsUploading(true);
        try {
          imageUrls = await Promise.all(images.map(async (image) => {
            return await uploadImage(image);
          }));
        } catch (err) {
          throw new Error('Error al subir imágenes');
        }
        setIsUploading(false);
      }
      
      // Actualizar los datos de la mascota
      const { error } = await supabase
        .from('pets')
        .update({
          name: name.trim(),
          species: species.trim(),
          breed: breed ? breed.trim() : null,
          age: age ? age.trim() : null,
          description: description ? description.trim() : null,
          image_url: imageUrls[0] || null,
          images: imageUrls.length > 0 ? imageUrls : null,
          interest: interest,
        })
        .eq('id', pet.id);
      
      if (error) {
        throw new Error(error.message);
      }
      // Obtener el registro actualizado desde Supabase
      const { data: updatedPets, error: fetchError } = await supabase
        .from('pets')
        .select('*')
        .eq('id', pet.id)
        .single();
      if (fetchError) {
        throw new Error(fetchError.message);
      }
      Alert.alert('Éxito', 'Mascota actualizada correctamente');
      onEditPet(updatedPets);
      handleClose();
      
    } catch (error: any) {
      console.error('Error al actualizar mascota:', error);
      Alert.alert('Error', `No se pudo actualizar la mascota: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Función para eliminar la mascota
  const deletePet = async () => {
    if (!pet?.id) {
      Alert.alert('Error', 'No se pudo identificar la mascota a eliminar.');
      return;
    }

    console.log('Intentando eliminar mascota con ID:', pet.id);

    // Mostrar confirmación antes de eliminar
    Alert.alert(
      'Confirmar eliminación',
      `¿Estás seguro que deseas eliminar a ${pet.name}? Esta acción no se puede deshacer.`,
      [
        {
          text: 'Cancelar',
          style: 'cancel',
          onPress: () => console.log('Eliminación cancelada')
        },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              console.log('Iniciando proceso de eliminación...');
              setIsSubmitting(true);
              // Verificar que el usuario esté autenticado
              const { data: { session } } = await supabase.auth.getSession();
              if (!session) {
                throw new Error('No hay sesión activa. Por favor, inicia sesión nuevamente.');
              }
              // Verificar que la mascota pertenezca al usuario actual
              const { data: petData, error: petError } = await supabase
                .from('pets')
                .select('*')
                .eq('id', pet.id)
                .single();
              if (petError) {
                throw new Error(`Error al verificar la mascota: ${petError.message}`);
              }
              if (!petData) {
                throw new Error('No se encontró la mascota');
              }
              if (petData.owner_id !== session.user.id) {
                throw new Error('No tienes permiso para eliminar esta mascota');
              }
              // Eliminar imágenes del bucket
              if (petData.images && Array.isArray(petData.images)) {
                for (const url of petData.images) {
                  if (url && url.startsWith('http')) {
                    try {
                      await deleteImageByPublicUrl(url);
                    } catch (err) {
                      console.error('Error al eliminar imagen del bucket:', err);
                    }
                  }
                }
              } else if (petData.image_url && petData.image_url.startsWith('http')) {
                // Eliminar la imagen principal si existe
                try {
                  await deleteImageByPublicUrl(petData.image_url);
                } catch (err) {
                  console.error('Error al eliminar imagen principal del bucket:', err);
                }
              }
              // Eliminar la mascota de Supabase
              console.log('Enviando solicitud a Supabase para eliminar mascota...');
              const { data, error } = await supabase
                .from('pets')
                .delete()
                .eq('id', pet.id)
                .select();
              console.log('Respuesta de Supabase:', { data, error });
              if (error) {
                throw new Error(error.message);
              }
              console.log('Mascota eliminada con éxito');
              Alert.alert('Éxito', 'Mascota eliminada correctamente');
              onClose();
              handleClose();
            } catch (error: any) {
              console.error('Error al eliminar mascota:', error);
              Alert.alert('Error', `No se pudo eliminar la mascota: ${error.message}`);
            } finally {
              setIsSubmitting(false);
            }
          }
        }
      ]
    );
  };

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={handleClose}
    >
      <View style={styles.centeredView}>
        <View style={styles.modalView}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Editar Mascota</Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <X size={24} color="#333" />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.formContainer}>
            {/* Galería de imágenes con reordenamiento y principal */}
            <Text style={styles.label}>Fotos</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
              {images.map((img, idx) => (
                <View key={idx} style={{ marginRight: 10, position: 'relative' }}>
                  <Image
                    source={{ uri: img }}
                    style={{ width: 80, height: 80, borderRadius: 8, borderWidth: 2, borderColor: idx === 0 ? '#ffbc4c' : '#eee' }}
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
                      <Text style={{ color: '#222', fontWeight: 'bold', fontSize: 10 }}>Hacer principal</Text>
                    </TouchableOpacity>
                  )}
                  {/* Indicador de principal */}
                  {idx === 0 && (
                    <View style={{ position: 'absolute', bottom: 2, right: 2, backgroundColor: '#ffbc4c', borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 }}>
                      <Text style={{ color: '#222', fontWeight: 'bold', fontSize: 10 }}>Principal</Text>
                    </View>
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
                    disabled={isSubmitting}
                  >
                    <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 14 }}>×</Text>
                  </TouchableOpacity>
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
                  disabled={images.length >= maxImages || isSubmitting}
                >
                  <Text style={{ color: '#bbb', fontSize: 32 }}>+</Text>
                </TouchableOpacity>
              )}
            </ScrollView>

            {/* Botón Destacar Mascota */}
            <TouchableOpacity
              style={[
                styles.destacarButton,
                isSubmitting && styles.saveButtonDisabled
              ]}
              onPress={() => setShowDestacarPet(true)}
              disabled={isSubmitting || isUploading}
            >
              <Text style={styles.destacarButtonText}>Destacar Mascota</Text>
            </TouchableOpacity>

            {/* Espacio */}
            <View style={{ height: 20 }} />

            {/* Formulario */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Nombre *</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="Nombre de tu mascota"
                placeholderTextColor="#aaa"
              />
            </View>
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Especie *</Text>
              <View style={styles.speciesContainer}>
                {['Perro', 'Gato', 'Otros'].map(option => (
                  <TouchableOpacity
                    key={option}
                    style={[
                      styles.speciesButton,
                      species === option && styles.speciesButtonSelected,
                      isSubmitting && styles.disabledButton
                    ]}
                    onPress={() => setSpecies(option)}
                    disabled={isSubmitting}
                  >
                    <Text style={[
                      styles.speciesButtonText,
                      species === option && styles.speciesButtonTextSelected
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
                value={breed}
                onChangeText={setBreed}
                placeholder="Raza de tu mascota"
                placeholderTextColor="#aaa"
              />
            </View>
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Edad</Text>
              <TextInput
                style={styles.input}
                value={age}
                onChangeText={setAge}
                placeholder="Edad de tu mascota"
                placeholderTextColor="#aaa"
              />
            </View>
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Descripción</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={description}
                onChangeText={setDescription}
                placeholder="Cuéntanos sobre tu mascota"
                placeholderTextColor="#aaa"
                multiline
                numberOfLines={4}
                textAlignVertical="top"
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

            {/* Botón de guardar */}
            <TouchableOpacity
/* ... */
              style={[
                styles.saveButton,
                (isSubmitting || isUploading) && styles.saveButtonDisabled
              ]}
              onPress={updatePet}
              disabled={isSubmitting || isUploading}
            >
              {isSubmitting || isUploading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color="#fff" />
                  <Text style={styles.saveButtonText}>
                    {isUploading 
                      ? `Subiendo imagen (${uploadProgress}%)` 
                      : 'Guardando...'}
                  </Text>
                </View>
              ) : (
                <>
                  <Check size={20} color="#fff" />
                  <Text style={styles.saveButtonText}>Guardar Cambios</Text>
                </>
              )}
            </TouchableOpacity>
            
            {/* Botón de eliminar */}
            <TouchableOpacity
              style={[
                styles.deleteButton,
                isSubmitting && styles.saveButtonDisabled
              ]}
              onPress={deletePet}
              disabled={isSubmitting || isUploading}
            >
              {isSubmitting ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color="#fff" />
                  <Text style={styles.deleteButtonText}>Eliminando...</Text>
                </View>
              ) : (
                <Text style={styles.deleteButtonText}>Eliminar Mascota</Text>
              )}
            </TouchableOpacity>

            
            {/* Modal real para destacar mascota */}
            {showDestacarPet && pet && (
              <DestacarPetModal
                visible={showDestacarPet}
                petId={pet.id}
                onClose={() => setShowDestacarPet(false)}
              />
            )}
          </ScrollView>
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
    maxHeight: '90%',
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
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 5,
  },
  formContainer: {
    padding: 20,
  },
  inputGroup: {
    marginBottom: 15,
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#333',
  },
  input: {
    backgroundColor: '#f9f9f9',
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#333',
  },
  textArea: {
    minHeight: 100,
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
    borderRadius: 25,
    padding: 15,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: '#ffbc4c99',
  },
  saveButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
    marginLeft: 8,
  },
  deleteButton: {
    backgroundColor: '#ff4c4c',
    borderRadius: 25,
    padding: 15,
    alignItems: 'center',
    marginTop: 15,
    marginBottom: 30,
    flexDirection: 'row',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#ff3b3b',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
      web: {
        boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.3)',
      },
    }),
  },
  deleteButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
    marginLeft: 8,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  destacarButton: {
    backgroundColor: '#fbaa30',
    borderRadius: 22,
    paddingVertical: 15,
    paddingHorizontal: 30,
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 5,
    flexDirection: 'row',
    justifyContent: 'center',
    shadowColor: '#fbaa30',
    shadowOpacity: 0.18,
    shadowRadius: 9,
    elevation: 3,
    borderWidth: 0,
  },
  destacarButtonDisabled: {
    opacity: 0.6,
  },
  destacarButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 19,
    letterSpacing: 0.5,
    textAlign: 'center',
    textShadowColor: '#ffedbc',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
});
