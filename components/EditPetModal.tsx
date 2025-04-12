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
import { uploadImage } from '@/utils/imageUpload';

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
};

type EditPetModalProps = {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  pet: Pet | null;
};

export default function EditPetModal({ visible, onClose, onSuccess, pet }: EditPetModalProps) {
  const [name, setName] = useState('');
  const [species, setSpecies] = useState('');
  const [breed, setBreed] = useState('');
  const [age, setAge] = useState('');
  const [description, setDescription] = useState('');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Cargar los datos de la mascota cuando cambia el prop pet
  useEffect(() => {
    if (pet) {
      setName(pet.name || '');
      setSpecies(pet.species || '');
      setBreed(pet.breed || '');
      setAge(pet.age || '');
      setDescription(pet.description || '');
      setImageUri(pet.image_url);
    }
  }, [pet]);

  // Resetear el formulario cuando se cierra el modal
  const resetForm = () => {
    setName('');
    setSpecies('');
    setBreed('');
    setAge('');
    setDescription('');
    setImageUri(null);
    setIsUploading(false);
    setUploadProgress(0);
    setIsSubmitting(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  // Función para seleccionar una imagen de la galería
  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setImageUri(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error al seleccionar imagen:', error);
      Alert.alert('Error', 'No se pudo seleccionar la imagen. Inténtalo de nuevo.');
    }
  };

  // Función para tomar una foto con la cámara
  const takePhoto = async () => {
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
        setImageUri(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error al tomar foto:', error);
      Alert.alert('Error', 'No se pudo tomar la foto. Inténtalo de nuevo.');
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
      
      // Si hay una nueva imagen, subirla primero
      let finalImageUrl = pet.image_url;
      
      if (imageUri && imageUri !== pet.image_url) {
        setIsUploading(true);
        try {
          finalImageUrl = await uploadImage(imageUri, setUploadProgress);
        } catch (error: any) {
          console.error('Error al subir imagen:', error);
          Alert.alert('Error', `No se pudo subir la imagen: ${error.message}`);
          setIsUploading(false);
          setIsSubmitting(false);
          return;
        }
        setIsUploading(false);
      }
      
      // Actualizar los datos de la mascota en Supabase
      const { error } = await supabase
        .from('pets')
        .update({
          name,
          species,
          breed: breed || null,
          age: age || null,
          description: description || null,
          image_url: finalImageUrl,
          updated_at: new Date().toISOString()
        })
        .eq('id', pet.id);
      
      if (error) {
        throw new Error(error.message);
      }
      
      Alert.alert('Éxito', 'Mascota actualizada correctamente');
      onSuccess();
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
              onSuccess();
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
            {/* Sección de imagen */}
            <View style={styles.imageSection}>
              {imageUri ? (
                <View style={styles.imagePreviewContainer}>
                  <Image source={{ uri: imageUri }} style={styles.imagePreview} />
                  <TouchableOpacity 
                    style={styles.changeImageButton}
                    onPress={pickImage}
                  >
                    <Text style={styles.changeImageText}>Cambiar imagen</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.imagePlaceholder}>
                  <TouchableOpacity 
                    style={styles.imageButton} 
                    onPress={pickImage}
                  >
                    <Upload size={24} color="#ffbc4c" />
                    <Text style={styles.imageButtonText}>Galería</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.imageButton}
                    onPress={takePhoto}
                  >
                    <Camera size={24} color="#ffbc4c" />
                    <Text style={styles.imageButtonText}>Cámara</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
            
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
              <TextInput
                style={styles.input}
                value={species}
                onChangeText={setSpecies}
                placeholder="Perro, gato, etc."
                placeholderTextColor="#aaa"
              />
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
            
            {/* Botón de guardar */}
            <TouchableOpacity
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
                <>
                  <Trash2 size={20} color="#fff" />
                  <Text style={styles.deleteButtonText}>Eliminar Mascota</Text>
                </>
              )}
            </TouchableOpacity>
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
  imageSection: {
    marginBottom: 20,
  },
  imagePlaceholder: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
    borderRadius: 10,
    padding: 20,
    borderWidth: 1,
    borderColor: '#eee',
    borderStyle: 'dashed',
  },
  imageButton: {
    alignItems: 'center',
    padding: 15,
  },
  imageButtonText: {
    marginTop: 8,
    color: '#666',
  },
  imagePreviewContainer: {
    alignItems: 'center',
  },
  imagePreview: {
    width: '100%',
    height: 200,
    borderRadius: 10,
    marginBottom: 10,
  },
  changeImageButton: {
    backgroundColor: '#f0f0f0',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 20,
  },
  changeImageText: {
    color: '#666',
    fontSize: 14,
  },
  inputGroup: {
    marginBottom: 15,
  },
  label: {
    fontSize: 16,
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
});
