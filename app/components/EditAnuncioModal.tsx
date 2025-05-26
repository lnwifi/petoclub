import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Modal, ScrollView, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { decode } from 'base64-arraybuffer';
import { supabase } from '@/lib/supabase';

interface EditAnuncioModalProps {
  visible: boolean;
  onClose: () => void;
  anuncio: any | null;
  onAnuncioUpdated: () => void;
  onAnuncioDeleted: () => void;
}

const categorias = ['Perdido', 'Encontrado', 'Adopción'];

const EditAnuncioModal: React.FC<EditAnuncioModalProps> = ({ visible, onClose, anuncio, onAnuncioUpdated, onAnuncioDeleted }) => {
  // Campos generales
  const [titulo, setTitulo] = useState(anuncio?.titulo || '');
  const [descripcion, setDescripcion] = useState(anuncio?.descripcion || '');
  const [categoria, setCategoria] = useState(anuncio?.categoria || 'Perdido');
  const [imagen, setImagen] = useState<string | null>(null);
  const [telefono, setTelefono] = useState(anuncio?.telefono || '');
  const [whatsapp, setWhatsapp] = useState(anuncio?.whatsapp || '');
  const [ubicacion, setUbicacion] = useState(anuncio?.ubicacion || '');
  const [hora, setHora] = useState(anuncio?.hora || '');
  const [nombreMascota, setNombreMascota] = useState(anuncio?.nombre_mascota || '');
  const [vacunado, setVacunado] = useState(anuncio?.vacunado ?? null);
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    if (anuncio) {
      setTitulo(anuncio.titulo || '');
      setDescripcion(anuncio.descripcion || '');
      setCategoria(anuncio.categoria || 'Perdido');
      setImagen(null);
      setTelefono(anuncio.telefono || '');
      setWhatsapp(anuncio.whatsapp || '');
      setUbicacion(anuncio.ubicacion || '');
      setHora(anuncio.hora || '');
      setNombreMascota(anuncio.nombre_mascota || '');
      setVacunado(anuncio.vacunado ?? null);
    }
  }, [anuncio]);

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

  const handleUpdate = async () => {
    if (!anuncio) return;
    // Validaciones por tipo
    if (categoria === 'Perdido') {
      if (!nombreMascota.trim() || !ubicacion.trim() || (!telefono.trim() && !whatsapp.trim())) {
        Alert.alert('Error', 'Completa todos los campos obligatorios');
        return;
      }
    }
    if (categoria === 'Encontrado') {
      if (!titulo.trim() || (!telefono.trim() && !whatsapp.trim())) {
        Alert.alert('Error', 'Completa todos los campos obligatorios');
        return;
      }
    }
    if (categoria === 'Adopción') {
      if (!titulo.trim() || vacunado === null) {
        Alert.alert('Error', 'Completa todos los campos obligatorios');
        return;
      }
    }
    setLoading(true);
    try {
      let imagen_url = anuncio.imagen_url;
      if (imagen) {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error('No hay sesión activa');
        const fileName = `${session.user.id}/${Date.now()}.jpg`;
        const { error: uploadError } = await supabase.storage
          .from('anuncios-images')
          .upload(fileName, decode(imagen), {
            contentType: 'image/jpeg',
            upsert: true
          });
        if (uploadError) throw uploadError;
        const { data: { publicUrl } } = supabase.storage
          .from('anuncios-images')
          .getPublicUrl(fileName);
        imagen_url = publicUrl;
      }
      // Construir objeto según tipo
      let updateData: any = {
        categoria,
        imagen_url,
        descripcion: descripcion.trim() || null,
        telefono: telefono.trim() || null,
        whatsapp: whatsapp.trim() || null,
        ubicacion: ubicacion.trim() || null,
      };
      if (categoria === 'Perdido') {
        updateData = {
          ...updateData,
          nombre_mascota: nombreMascota.trim(),
          hora: hora.trim() || null,
        };
      }
      if (categoria === 'Encontrado') {
        updateData = {
          ...updateData,
          titulo: titulo.trim(),
        };
      }
      if (categoria === 'Adopción') {
        updateData = {
          ...updateData,
          titulo: titulo.trim(),
          vacunado: vacunado,
        };
      }
      const { error: updateError } = await supabase
        .from('anuncios')
        .update(updateData)
        .eq('id', anuncio.id);
      if (updateError) throw updateError;
      Alert.alert('Éxito', 'Anuncio actualizado correctamente');
      onAnuncioUpdated();
      onClose();
    } catch (error) {
      console.error('Error al actualizar anuncio:', error);
      Alert.alert('Error', 'No se pudo actualizar el anuncio');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!anuncio) return;
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (anuncio.imagen_url) {
        const match = anuncio.imagen_url.match(/anuncios-images\/(.+)$/);
        const path = match ? match[1] : null;
        if (path) {
          await supabase.storage.from('anuncios-images').remove([path]);
        }
      }
      await supabase.from('anuncios').delete().eq('id', anuncio.id);
      Alert.alert('Eliminado', 'El anuncio fue eliminado');
      onAnuncioDeleted();
      onClose();
    } catch (error) {
      Alert.alert('Error', 'No se pudo eliminar el anuncio');
    } finally {
      setLoading(false);
    }
  };

  // Render dinámico según tipo
  const renderFormulario = () => {
    if (categoria === 'Perdido') {
      return (
        <ScrollView style={styles.scrollView}>
          <Text style={styles.modalTitle}>Editar Mascota Perdida</Text>
          <Text style={styles.label}>Nombre de la mascota</Text>
          <TextInput style={styles.input} value={nombreMascota} onChangeText={setNombreMascota} placeholder="Nombre" maxLength={40} />
          <Text style={styles.label}>Fotos</Text>
          <TouchableOpacity style={styles.imageButton} onPress={pickImage}>
            <Text style={styles.imageButtonText}>{imagen ? 'Cambiar foto principal' : 'Agregar foto principal'}</Text>
          </TouchableOpacity>
          {imagen ? (
            <Image source={{ uri: `data:image/jpeg;base64,${imagen}` }} style={styles.previewImage} contentFit="cover" />
          ) : anuncio?.imagen_url ? (
            <Image source={{ uri: anuncio.imagen_url }} style={styles.previewImage} contentFit="cover" />
          ) : null}
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
            <TouchableOpacity style={[styles.button, styles.cancelButton]} onPress={onClose} disabled={loading}>
              <Text style={styles.buttonText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.button, styles.submitButton]} onPress={handleUpdate} disabled={loading}>
              <Text style={styles.buttonText}>{loading ? 'Guardando...' : 'Guardar'}</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.deleteButton} onPress={handleDelete} disabled={loading}>
            <Text style={styles.deleteButtonText}>Eliminar Anuncio</Text>
          </TouchableOpacity>
        </ScrollView>
      );
    }
    if (categoria === 'Encontrado') {
      return (
        <ScrollView style={styles.scrollView}>
          <Text style={styles.modalTitle}>Editar Mascota Encontrada</Text>
          <Text style={styles.label}>Título</Text>
          <TextInput style={styles.input} value={titulo} onChangeText={setTitulo} placeholder="Ej: Encontré un perro en..." maxLength={60} />
          <Text style={styles.label}>Fotos</Text>
          <TouchableOpacity style={styles.imageButton} onPress={pickImage}>
            <Text style={styles.imageButtonText}>{imagen ? 'Cambiar foto principal' : 'Agregar foto principal'}</Text>
          </TouchableOpacity>
          {imagen ? (
            <Image source={{ uri: `data:image/jpeg;base64,${imagen}` }} style={styles.previewImage} contentFit="cover" />
          ) : anuncio?.imagen_url ? (
            <Image source={{ uri: anuncio.imagen_url }} style={styles.previewImage} contentFit="cover" />
          ) : null}
          <Text style={styles.label}>Observaciones</Text>
          <TextInput style={[styles.input, styles.textArea]} value={descripcion} onChangeText={setDescripcion} placeholder="Observaciones" multiline maxLength={300} />
          <Text style={styles.label}>Teléfono o contacto</Text>
          <TextInput style={styles.input} value={telefono} onChangeText={setTelefono} placeholder="Teléfono" keyboardType="phone-pad" maxLength={20} />
          <TextInput style={styles.input} value={whatsapp} onChangeText={setWhatsapp} placeholder="WhatsApp" keyboardType="phone-pad" maxLength={20} />
          <View style={styles.buttonContainer}>
            <TouchableOpacity style={[styles.button, styles.cancelButton]} onPress={onClose} disabled={loading}>
              <Text style={styles.buttonText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.button, styles.submitButton]} onPress={handleUpdate} disabled={loading}>
              <Text style={styles.buttonText}>{loading ? 'Guardando...' : 'Guardar'}</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.deleteButton} onPress={handleDelete} disabled={loading}>
            <Text style={styles.deleteButtonText}>Eliminar Anuncio</Text>
          </TouchableOpacity>
        </ScrollView>
      );
    }
    if (categoria === 'Adopción') {
      return (
        <ScrollView style={styles.scrollView}>
          <Text style={styles.modalTitle}>Editar Anuncio de Adopción</Text>
          <Text style={styles.label}>Título</Text>
          <TextInput style={styles.input} value={titulo} onChangeText={setTitulo} placeholder="Ej: Cachorrito busca hogar" maxLength={60} />
          <Text style={styles.label}>Fotos</Text>
          <TouchableOpacity style={styles.imageButton} onPress={pickImage}>
            <Text style={styles.imageButtonText}>{imagen ? 'Cambiar foto principal' : 'Agregar foto principal'}</Text>
          </TouchableOpacity>
          {imagen ? (
            <Image source={{ uri: `data:image/jpeg;base64,${imagen}` }} style={styles.previewImage} contentFit="cover" />
          ) : anuncio?.imagen_url ? (
            <Image source={{ uri: anuncio.imagen_url }} style={styles.previewImage} contentFit="cover" />
          ) : null}
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
            <TouchableOpacity style={[styles.button, styles.cancelButton]} onPress={onClose} disabled={loading}>
              <Text style={styles.buttonText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.button, styles.submitButton]} onPress={handleUpdate} disabled={loading}>
              <Text style={styles.buttonText}>{loading ? 'Guardando...' : 'Guardar'}</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.deleteButton} onPress={handleDelete} disabled={loading}>
            <Text style={styles.deleteButtonText}>Eliminar Anuncio</Text>
          </TouchableOpacity>
        </ScrollView>
      );
    }
    return null;
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.centeredView}>
        <View style={styles.modalView}>{renderFormulario()}</View>
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
  deleteButton: {
    marginTop: 24,
    backgroundColor: '#ffe3a3',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  deleteButtonText: {
    color: '#ff3b30',
    fontWeight: 'bold',
    fontSize: 16,
  }
});

export default EditAnuncioModal;
