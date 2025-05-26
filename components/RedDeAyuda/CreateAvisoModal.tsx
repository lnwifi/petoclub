import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Image, Alert, Platform } from 'react-native';
import { createAviso, updateAviso } from '../../utils/redDeAyudaApi';

interface AvisoForm {
  tipo_aviso: string;
  especie: string;
  nombre: string;
  descripcion: string;
  ubicacion: string;
  fecha: string;
  contacto: string;
  id?: string;
  imagenes_urls?: string[];
  destacado?: boolean;
}

interface CreateAvisoModalProps {
  onClose: () => void;
  editAviso?: AvisoForm | null;
  refreshAvisos?: () => void;
}

const tipos = [
  { value: 'perdido', label: 'Perdido' },
  { value: 'encontrado', label: 'Encontrado' },
  { value: 'adopcion', label: 'Adopción' }
];

export default function CreateAvisoModal({ onClose, editAviso, refreshAvisos }: CreateAvisoModalProps) {
  const [data, setData] = useState<AvisoForm>({
    tipo_aviso: '',
    especie: '',
    nombre: '',
    descripcion: '',
    ubicacion: '',
    fecha: '',
    contacto: '',
    imagenes_urls: [],
  });
  const [images, setImages] = useState<(File | string)[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (editAviso) {
      setData({ ...editAviso });
      setImages(editAviso.imagenes_urls ? [...editAviso.imagenes_urls] : []);
    }
  }, [editAviso]);

  const handleChange = (field: keyof AvisoForm, value: string) => {
    setData({ ...data, [field]: value });
  };

  const pickImage = async () => {
    if (images.length >= 3) return;
    if (typeof window !== 'undefined' && window.document) {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = (e: Event) => {
        const target = e.target as HTMLInputElement;
        if (target && target.files && target.files[0] && images.length < 3) {
          setImages(prev => [...prev, target.files![0]]);
        }
      };
      input.click();
    }
  };

  const removeImage = (idx: number) => {
    setImages(images.filter((_, i) => i !== idx));
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError('');
    try {
      if (editAviso && editAviso.id) {
        await updateAviso(editAviso.id, data, images);
        Alert.alert('Aviso editado correctamente');
      } else {
        await createAviso(data, images);
        Alert.alert('Aviso creado correctamente');
      }
      refreshAvisos && refreshAvisos();
      onClose();
    } catch (err: unknown) {
      const error = err as Error;
      const msg = error?.message || 'Error al guardar el aviso.';
      setError(msg);
      console.error('Error al guardar el aviso:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.overlay}>
      <View style={styles.modal}>
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <Text style={styles.closeButtonText}>✕</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{editAviso ? 'Editar Aviso' : 'Crear Aviso'}</Text>
        <ScrollView contentContainerStyle={styles.form}>
          <Text style={styles.label}>Tipo de aviso</Text>
          <View style={styles.selectRow}>
            {tipos.map((tipo) => (
              <TouchableOpacity
                key={tipo.value}
                style={[styles.selectOption, data.tipo_aviso === tipo.value && styles.selectOptionActive]}
                onPress={() => handleChange('tipo_aviso', tipo.value)}
              >
                <Text style={[styles.selectOptionText, data.tipo_aviso === tipo.value && styles.selectOptionTextActive]}>{tipo.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.label}>Especie</Text>
          <TextInput style={styles.input} value={data.especie} onChangeText={t => handleChange('especie', t)} placeholder="Ej: perro, gato" />
          <Text style={styles.label}>Nombre</Text>
          <TextInput style={styles.input} value={data.nombre} onChangeText={t => handleChange('nombre', t)} placeholder="Nombre" />
          <Text style={styles.label}>Descripción</Text>
          <TextInput style={[styles.input, styles.textArea]} value={data.descripcion} onChangeText={t => handleChange('descripcion', t)} placeholder="Descripción" multiline numberOfLines={3} />
          <Text style={styles.label}>Ubicación</Text>
          <TextInput style={styles.input} value={data.ubicacion} onChangeText={t => handleChange('ubicacion', t)} placeholder="Ubicación" />
          <Text style={styles.label}>Fecha</Text>
          {Platform.OS === 'web' ? (
            <input 
              type="date" 
              value={data.fecha} 
              onChange={(e) => handleChange('fecha', e.target.value)} 
              style={styles.dateInput}
            />
          ) : (
            <TextInput 
              style={styles.input} 
              value={data.fecha} 
              onChangeText={t => handleChange('fecha', t)} 
              placeholder="YYYY-MM-DD" 
            />
          )}
          <Text style={styles.label}>Contacto</Text>
          <TextInput style={styles.input} value={data.contacto} onChangeText={t => handleChange('contacto', t)} placeholder="Teléfono o email" />
          <Text style={styles.label}>Imágenes (máx 3)</Text>
          <View style={{ flexDirection: 'row', gap: 12, marginBottom: 10 }}>
            {images.map((img, idx) => (
              <View key={idx} style={{ position: 'relative', marginRight: 8 }}>
                <Image source={{ uri: typeof img === 'string' ? img : URL.createObjectURL(img) }} style={{ width: 64, height: 64, borderRadius: 8 }} />
                <TouchableOpacity style={styles.removeImageBtn} onPress={() => removeImage(idx)}>
                  <Text style={styles.removeImageText}>✕</Text>
                </TouchableOpacity>
              </View>
            ))}
            {images.length < 3 && (
              <TouchableOpacity style={styles.addImageBtn} onPress={pickImage}>
                <Text style={styles.addImageText}>+</Text>
              </TouchableOpacity>
            )}
          </View>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <TouchableOpacity style={styles.submitButton} onPress={handleSubmit} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitButtonText}>{editAviso ? 'Guardar Cambios' : 'Crear'}</Text>}
          </TouchableOpacity>
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  modal: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '90%',
    maxWidth: 400,
    maxHeight: '92%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 8,
  },
  closeButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 10,
    padding: 8,
  },
  closeButtonText: {
    fontSize: 20,
    color: '#888',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 20,
    textAlign: 'center',
  },
  form: {
    paddingBottom: 32,
  },
  label: {
    fontSize: 15,
    color: '#444',
    marginBottom: 4,
    marginTop: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 10,
    fontSize: 15,
    marginBottom: 6,
    backgroundColor: '#fafafa',
  },
  textArea: {
    minHeight: 60,
    textAlignVertical: 'top',
  },
  selectRow: {
    flexDirection: 'row',
    marginBottom: 8,
    gap: 8,
  },
  selectOption: {
    borderWidth: 1,
    borderColor: '#ffbc4c',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginRight: 8,
    backgroundColor: '#fffbe9',
  },
  selectOptionActive: {
    backgroundColor: '#ffbc4c',
    borderColor: '#ffbc4c',
  },
  selectOptionText: {
    color: '#b68f2e',
    fontWeight: '500',
  },
  selectOptionTextActive: {
    color: '#fff',
  },
  addImageBtn: {
    width: 64,
    height: 64,
    borderRadius: 8,
    backgroundColor: '#ffe7b5',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#ffbc4c',
  },
  addImageText: {
    fontSize: 32,
    color: '#ffbc4c',
    fontWeight: 'bold',
    marginTop: -2,
  },
  removeImageBtn: {
    position: 'absolute',
    top: -10,
    right: -10,
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ff4f4f',
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  removeImageText: {
    color: '#ff4f4f',
    fontWeight: 'bold',
    fontSize: 13,
    marginTop: -1,
  },
  dateInput: Platform.OS === 'web' ? {
    width: '100%',
    padding: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    marginBottom: 10,
    backgroundColor: '#fafafa',
    fontSize: 15,
    color: '#000',
  } : {},

  submitButton: {
    backgroundColor: '#ffbc4c',
    borderRadius: 10,
    paddingVertical: 12,
    marginTop: 18,
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 17,
  },
  error: {
    color: '#ff4f4f',
    marginTop: 8,
    marginBottom: 8,
    textAlign: 'center',
  },
});
