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
import { uploadImage } from '@/utils/imageUpload';

type AddPetModalProps = {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
};

type PetData = {
  name: string;
  species: string;
  breed: string;
  age: string;
  description: string;
  image_url?: string;
};

export default function AddPetModal({ visible, onClose, onSuccess }: AddPetModalProps) {
  const [petData, setPetData] = useState<PetData>({
    name: '',
    species: '',
    breed: '',
    age: '',
    description: '',
  });
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const handleChange = (field: keyof PetData, value: string) => {
    setPetData({ ...petData, [field]: value });
  };

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error al seleccionar imagen:', error);
      Alert.alert('Error', 'No se pudo seleccionar la imagen');
    }
  };

  const takePhoto = async () => {
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
      setImage(result.assets[0].uri);
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
      
      // Preparar datos para inserción (sin imagen primero)
      const petRecord = {
        owner_id: session.user.id,
        name: petData.name.trim(),
        species: petData.species.trim(),
        breed: sanitizeField(petData.breed),
        age: sanitizeField(petData.age),
        description: sanitizeField(petData.description),
        image_url: null as string | null, // Explicitly type as string | null
      };
      
      // Si hay una imagen, intentar subirla primero antes de guardar los datos
      if (image) {
        try {
          console.log('Procesando imagen...');
          const imageUrl = await uploadImage(image, setUploadProgress);
          
          if (imageUrl) {
            console.log('Imagen subida exitosamente:', imageUrl);
            petRecord.image_url = imageUrl;
          } else {
            console.log('No se pudo subir la imagen, continuando sin imagen');
            // Mostrar advertencia pero continuar
            Alert.alert(
              'Advertencia', 
              'No se pudo subir la imagen. Los datos de tu mascota se guardarán sin imagen.',
              [{ text: 'Continuar' }]
            );
          }
        } catch (imageError: any) {
          console.error('Error al procesar imagen:', imageError);
          // Mostrar advertencia pero continuar
          Alert.alert(
            'Advertencia', 
            'No se pudo subir la imagen. Los datos de tu mascota se guardarán sin imagen.',
            [{ text: 'Continuar' }]
          );
        }
      }
      
      console.log('Guardando datos en la base de datos...');
      
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
      setImage(null);

      // Notificar éxito
      if (petRecord.image_url) {
        Alert.alert('¡Éxito!', 'Tu mascota ha sido agregada correctamente con su imagen');
      } else {
        Alert.alert('¡Éxito!', 'Tu mascota ha sido agregada correctamente, pero sin imagen');
      }
      
      // Llamar al callback de éxito si existe
      if (onSuccess) {
        onSuccess();
      }
      
      // Cerrar el modal
      onClose();
    } catch (error: any) {
      console.error('Error al guardar mascota:', error);
      
      // Mensajes específicos para errores comunes
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
            {/* Sección de imagen */}
            <View style={styles.imageSection}>
              {image ? (
                <View style={styles.imagePreviewContainer}>
                  <Image source={{ uri: image }} style={styles.imagePreview} />
                  <TouchableOpacity 
                    style={styles.changeImageButton}
                    onPress={pickImage}
                  >
                    <Text style={styles.changeImageText}>Cambiar imagen</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.imageOptions}>
                  <TouchableOpacity style={styles.imageOptionButton} onPress={takePhoto}>
                    <Camera size={24} color="#ffbc4c" />
                    <Text style={styles.imageOptionText}>Tomar foto</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.imageOptionButton} onPress={pickImage}>
                    <Upload size={24} color="#ffbc4c" />
                    <Text style={styles.imageOptionText}>Subir imagen</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

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
              <TextInput
                style={styles.input}
                placeholder="Perro, Gato, etc."
                value={petData.species}
                onChangeText={(text) => handleChange('species', text)}
              />
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
  imageSection: {
    marginBottom: 20,
  },
  imageOptions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginVertical: 20,
  },
  imageOptionButton: {
    alignItems: 'center',
    padding: 16,
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 12,
    width: '45%',
  },
  imageOptionText: {
    marginTop: 8,
    color: '#666',
    fontFamily: 'Inter_500Medium',
  },
  imagePreviewContainer: {
    alignItems: 'center',
  },
  imagePreview: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    marginBottom: 10,
  },
  changeImageButton: {
    padding: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
  },
  changeImageText: {
    color: '#666',
    fontFamily: 'Inter_500Medium',
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