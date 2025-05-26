import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Modal, ScrollView, Alert, Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { decode } from 'base64-arraybuffer';
import { supabase } from '@/lib/supabase';

interface AddAnuncioModalProps {
  visible: boolean;
  onClose: () => void;
  onAnuncioAdded: () => void;
}

const categorias = ['Perdido', 'Encontrado', 'Adopción'];

const AddAnuncioModal: React.FC<AddAnuncioModalProps> = ({ visible, onClose, onAnuncioAdded }) => {
  // Nuevo: paso actual (1 = elegir tipo, 2 = formulario)
  const [step, setStep] = useState(1);
  const [tipo, setTipo] = useState<string | null>(null);
  // Campos generales
  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [categoria, setCategoria] = useState('Perdido');
  const [imagen, setImagen] = useState<string | null>(null);
  const [fotos, setFotos] = useState<string[]>([]); // Para múltiples fotos
  const [telefono, setTelefono] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [ubicacion, setUbicacion] = useState('');
  const [hora, setHora] = useState('');
  const [nombreMascota, setNombreMascota] = useState('');
  const [vacunado, setVacunado] = useState<'si' | 'no' | null>(null);
  const [loading, setLoading] = useState(false);

  // Nuevo: función para reiniciar el modal al cerrar
  const handleClose = () => {
    setStep(1);
    setTipo(null);
    setTitulo('');
    setDescripcion('');
    setCategoria('Perdido');
    setImagen(null);
    setFotos([]);
    setTelefono('');
    setWhatsapp('');
    setUbicacion('');
    setHora('');
    setNombreMascota('');
    setVacunado(null);
    setLoading(false);
    onClose();
  };

  // Nuevo: selección de tipo de anuncio
  const renderTipoStep = () => (
    <View>
      <Text style={styles.modalTitle}>¿Qué tipo de anuncio deseas crear?</Text>
      <View style={styles.categoriaContainer}>
        {categorias.map((cat) => (
          <TouchableOpacity
            key={cat}
            style={[styles.categoriaButton, tipo === cat && styles.categoriaSelected]}
            onPress={() => setTipo(cat)}
          >
            <Text style={[styles.categoriaText, tipo === cat && styles.categoriaTextSelected]}>{cat}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <TouchableOpacity
        style={[styles.button, styles.submitButton, { marginTop: 24, opacity: tipo ? 1 : 0.5 }]}
        onPress={() => tipo && setStep(2)}
        disabled={!tipo}
      >
        <Text style={styles.buttonText}>Continuar</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[styles.button, styles.cancelButton, { marginTop: 8 }]} onPress={handleClose}>
        <Text style={[styles.buttonText, styles.cancelButtonText]}>Cancelar</Text>
      </TouchableOpacity>
    </View>
  );

  // Nuevo: formulario dinámico según tipo
  const renderFormularioStep = () => {
    if (tipo === 'Perdido') {
      return (
        <ScrollView style={styles.scrollView}>
          <Text style={styles.modalTitle}>Anuncio de Mascota Perdida</Text>
          <Text style={styles.label}>Nombre de la mascota</Text>
          <TextInput style={styles.input} value={nombreMascota} onChangeText={setNombreMascota} placeholder="Nombre" maxLength={40} />
          <Text style={styles.label}>Fotos</Text>
          {/* Botón para agregar foto principal */}
          <TouchableOpacity style={styles.imageButton} onPress={pickImage}>
            <Text style={styles.imageButtonText}>{imagen ? 'Cambiar foto principal' : 'Agregar foto principal'}</Text>
          </TouchableOpacity>
          {imagen && (
            <Image source={{ uri: `data:image/jpeg;base64,${imagen}` }} style={styles.previewImage} contentFit="cover" />
          )}
          <Text style={styles.label}>¿Dónde se perdió o vio por última vez?</Text>
          <TextInput style={styles.input} value={ubicacion} onChangeText={setUbicacion} placeholder="Ej: Plaza San Martín, Barrio Centro, etc." maxLength={100} />
          <Text style={styles.label}>Hora (si la sabes)</Text>
          <TextInput style={styles.input} value={hora} onChangeText={setHora} placeholder="Ej: 18:30" maxLength={20} />
          <Text style={styles.label}>Teléfono o WhatsApp del dueño</Text>
          <TextInput style={styles.input} value={telefono} onChangeText={setTelefono} placeholder="Teléfono" keyboardType="phone-pad" maxLength={20} />
          <TextInput style={styles.input} value={whatsapp} onChangeText={setWhatsapp} placeholder="WhatsApp" keyboardType="phone-pad" maxLength={20} />
          <Text style={styles.label}>Observaciones</Text>
          <TextInput style={[styles.input, styles.textArea]} value={descripcion} onChangeText={setDescripcion} placeholder="Observaciones" multiline maxLength={300} />
          <View style={styles.buttonContainer}>
            <TouchableOpacity style={[styles.button, styles.cancelButton]} onPress={handleClose} disabled={loading}>
              <Text style={[styles.buttonText, styles.cancelButtonText]}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.button, styles.submitButton]} onPress={handleSubmit} disabled={loading}>
              <Text style={styles.buttonText}>{loading ? 'Publicando...' : 'Publicar'}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      );
    }
    if (tipo === 'Encontrado') {
      return (
        <ScrollView style={styles.scrollView}>
          <Text style={styles.modalTitle}>Anuncio de Mascota Encontrada</Text>
          <Text style={styles.label}>Título</Text>
          <TextInput style={styles.input} value={titulo} onChangeText={setTitulo} placeholder="Ej: Encontré un perro en..." maxLength={60} />
          <Text style={styles.label}>Fotos</Text>
          <TouchableOpacity style={styles.imageButton} onPress={pickImage}>
            <Text style={styles.imageButtonText}>{imagen ? 'Cambiar foto principal' : 'Agregar foto principal'}</Text>
          </TouchableOpacity>
          {imagen && (
            <Image source={{ uri: `data:image/jpeg;base64,${imagen}` }} style={styles.previewImage} contentFit="cover" />
          )}
          <Text style={styles.label}>Observaciones</Text>
          <TextInput style={[styles.input, styles.textArea]} value={descripcion} onChangeText={setDescripcion} placeholder="Observaciones" multiline maxLength={300} />
          <Text style={styles.label}>Teléfono o contacto</Text>
          <TextInput style={styles.input} value={telefono} onChangeText={setTelefono} placeholder="Teléfono" keyboardType="phone-pad" maxLength={20} />
          <TextInput style={styles.input} value={whatsapp} onChangeText={setWhatsapp} placeholder="WhatsApp" keyboardType="phone-pad" maxLength={20} />
          <View style={styles.buttonContainer}>
            <TouchableOpacity style={[styles.button, styles.cancelButton]} onPress={handleClose} disabled={loading}>
              <Text style={[styles.buttonText, styles.cancelButtonText]}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.button, styles.submitButton]} onPress={handleSubmit} disabled={loading}>
              <Text style={styles.buttonText}>{loading ? 'Publicando...' : 'Publicar'}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      );
    }
    if (tipo === 'Adopción') {
      return (
        <ScrollView style={styles.scrollView}>
          <Text style={styles.modalTitle}>Anuncio de Adopción</Text>
          <Text style={styles.label}>Título</Text>
          <TextInput style={styles.input} value={titulo} onChangeText={setTitulo} placeholder="Ej: Cachorrito busca hogar" maxLength={60} />
          <Text style={styles.label}>Fotos</Text>
          <TouchableOpacity style={styles.imageButton} onPress={pickImage}>
            <Text style={styles.imageButtonText}>{imagen ? 'Cambiar foto principal' : 'Agregar foto principal'}</Text>
          </TouchableOpacity>
          {imagen && (
            <Image source={{ uri: `data:image/jpeg;base64,${imagen}` }} style={styles.previewImage} contentFit="cover" />
          )}
          <Text style={styles.label}>¿Está vacunado?</Text>
          <View style={{ flexDirection: 'row', marginBottom: 16 }}>
            <TouchableOpacity onPress={() => setVacunado('si')} style={[styles.categoriaButton, vacunado === 'si' && styles.categoriaSelected]}>
              <Text style={[styles.categoriaText, vacunado === 'si' && styles.categoriaTextSelected]}>Sí</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setVacunado('no')} style={[styles.categoriaButton, vacunado === 'no' && styles.categoriaSelected]}>
              <Text style={[styles.categoriaText, vacunado === 'no' && styles.categoriaTextSelected]}>No</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.label}>Observaciones</Text>
          <TextInput style={[styles.input, styles.textArea]} value={descripcion} onChangeText={setDescripcion} placeholder="Observaciones" multiline maxLength={300} />
          <Text style={styles.label}>Teléfono o contacto</Text>
          <TextInput style={styles.input} value={telefono} onChangeText={setTelefono} placeholder="Teléfono" keyboardType="phone-pad" maxLength={20} />
          <TextInput style={styles.input} value={whatsapp} onChangeText={setWhatsapp} placeholder="WhatsApp" keyboardType="phone-pad" maxLength={20} />
          <View style={styles.buttonContainer}>
            <TouchableOpacity style={[styles.button, styles.cancelButton]} onPress={handleClose} disabled={loading}>
              <Text style={[styles.buttonText, styles.cancelButtonText]}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.button, styles.submitButton]} onPress={handleSubmit} disabled={loading}>
              <Text style={styles.buttonText}>{loading ? 'Publicando...' : 'Publicar'}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      );
    }
    return null;
  };

  // pickImage adaptada
  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
      base64: true,
    });
    if (!result.canceled && result.assets[0].base64) {
      setImagen(result.assets[0].base64);
    }
  };

  // base64ToBlob util
  function base64ToBlob(base64: string, contentType = '', sliceSize = 512): Blob {
    const byteCharacters = atob(base64);
    const byteArrays = [];
    for (let offset = 0; offset < byteCharacters.length; offset += sliceSize) {
      const slice = byteCharacters.slice(offset, offset + sliceSize);
      const byteNumbers = new Array(slice.length);
      for (let i = 0; i < slice.length; i++) {
        byteNumbers[i] = slice.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      byteArrays.push(byteArray);
    }
    return new Blob(byteArrays, { type: contentType });
  }

  // handleSubmit adaptado
  const handleSubmit = async () => {
    // Validaciones por tipo
    if (tipo === 'Perdido') {
      if (!nombreMascota.trim() || !ubicacion.trim() || (!telefono.trim() && !whatsapp.trim())) {
        Alert.alert('Error', 'Completa todos los campos obligatorios');
        return;
      }
    }
    if (tipo === 'Encontrado') {
      if (!titulo.trim() || (!telefono.trim() && !whatsapp.trim())) {
        Alert.alert('Error', 'Completa todos los campos obligatorios');
        return;
      }
    }
    if (tipo === 'Adopción') {
      if (!titulo.trim() || vacunado === null) {
        Alert.alert('Error', 'Completa todos los campos obligatorios');
        return;
      }
    }
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No hay sesión activa');
      let imagen_url = null;
      if (imagen) {
        const fileName = `${session.user.id}/${Date.now()}.jpg`;
        let uploadData;
        if (Platform.OS === 'web') {
          uploadData = base64ToBlob(imagen, 'image/jpeg');
        } else {
          uploadData = decode(imagen);
        }
        const { error: uploadError } = await supabase.storage
          .from('anuncios-images')
          .upload(fileName, uploadData, {
            contentType: 'image/jpeg',
            upsert: true
          });
        if (uploadError) throw uploadError;
        const { data: publicUrlData } = supabase.storage
          .from('anuncios-images')
          .getPublicUrl(fileName);
        imagen_url = publicUrlData?.publicUrl || null;
      }
      // Construir objeto según tipo
      let anuncioData: any = {
        usuario_id: session.user.id,
        categoria: tipo,
        imagen_url,
        fecha_creacion: new Date().toISOString(),
        telefono: telefono.trim() || null,
        whatsapp: whatsapp.trim() || null,
        ubicacion: ubicacion.trim() || null,
        descripcion: descripcion.trim() || null,
        estado: 'activo', // Para futuros cambios de estado
      };
      if (tipo === 'Perdido') {
        anuncioData = {
          ...anuncioData,
          nombre_mascota: nombreMascota.trim(),
          hora: hora.trim() || null,
        };
      }
      if (tipo === 'Encontrado') {
        anuncioData = {
          ...anuncioData,
          titulo: titulo.trim(),
        };
      }
      if (tipo === 'Adopción') {
        anuncioData = {
          ...anuncioData,
          titulo: titulo.trim(),
          vacunado: vacunado,
        };
      }
      const { error: insertError } = await supabase
        .from('anuncios')
        .insert(anuncioData);
      if (insertError) throw insertError;
      Alert.alert('Éxito', 'Anuncio publicado correctamente');
      onAnuncioAdded();
      handleClose();
    } catch (error) {
      console.error('[DEBUG] Error al publicar anuncio:', error);
      Alert.alert('Error', 'No se pudo publicar el anuncio');
    } finally {
      setLoading(false);
    }
  };

  // Render principal
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <View style={styles.centeredView}>
        <View style={styles.modalView}>
          {step === 1 ? renderTipoStep() : renderFormularioStep()}
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
    backgroundColor: 'rgba(0, 0, 0, 0.5)'
  },
  modalView: {
    backgroundColor: '#fffaf4',
    borderRadius: 20,
    width: '90%',
    maxHeight: '80%',
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5
  },
  scrollView: {
    width: '100%'
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: '#ffbc4c'
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#ffbc4c'
  },
  input: {
    borderWidth: 1,
    borderColor: '#ffe3a3',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    fontSize: 16,
    backgroundColor: '#fff6e0',
    color: '#333'
  },
  textArea: {
    height: 120,
    textAlignVertical: 'top'
  },
  categoriaContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16
  },
  categoriaButton: {
    flex: 1,
    padding: 10,
    borderRadius: 8,
    marginHorizontal: 4,
    backgroundColor: '#fff6e0',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ffe3a3'
  },
  categoriaSelected: {
    backgroundColor: '#ffbc4c',
    borderColor: '#ffbc4c'
  },
  categoriaText: {
    fontSize: 14,
    color: '#ffbc4c'
  },
  categoriaTextSelected: {
    color: '#fff'
  },
  imageButton: {
    backgroundColor: '#ffbc4c',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 16
  },
  imageButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600'
  },
  previewImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginBottom: 16
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20
  },
  button: {
    flex: 1,
    padding: 15,
    borderRadius: 8,
    marginHorizontal: 5
  },
  cancelButton: {
    backgroundColor: '#eee'
  },
  submitButton: {
    backgroundColor: '#ffbc4c'
  },
  buttonText: {
    color: '#fff',
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600'
  },
  cancelButtonText: {
    color: '#000',
  }
});

export default AddAnuncioModal;
