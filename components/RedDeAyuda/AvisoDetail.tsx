import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet, ScrollView, ActivityIndicator, Alert, Dimensions, Share } from 'react-native';
import { updateAviso, deleteAviso, changeAvisoStatus, renewAviso, getAvisoById } from '../../utils/redDeAyudaApi';
import { supabase } from '../../app/lib/supabase';
import DestacarAvisoModal from './DestacarAvisoModal';

const SCREEN_WIDTH = Dimensions.get('window').width;

interface Aviso {
  id: string;
  tipo_aviso: string;
  nombre: string;
  especie: string;
  descripcion: string;
  ubicacion: string;
  fecha: string;
  imagenes_urls?: string[];
  contacto: string;
  user_id?: string;
  estado?: string;
  destacado?: boolean;
}

interface AvisoDetailProps {
  aviso?: Aviso;
  avisoId?: string;
  onClose?: () => void;
  onUpdate?: (aviso: Aviso) => void;
  onDelete?: (id: string) => void;
  onEdit?: (aviso: Aviso) => void;
}

const tipoColor = {
  perdido: '#ff6b6b',
  encontrado: '#4ecdc4',
  adopcion: '#ffbc4c',
  default: '#2c3e50',
};

export default function AvisoDetail({ aviso: initialAviso, avisoId, onClose, onUpdate, onDelete, onEdit }: AvisoDetailProps) {
  // TODOS LOS HOOKS VAN AL PRINCIPIO
  const [aviso, setAviso] = useState<Aviso | null>(initialAviso || null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(!initialAviso);
  const [imgIndex, setImgIndex] = useState(0);
  const [showDestacarModal, setShowDestacarModal] = useState(false);
  const [isOwner, setIsOwner] = useState(false);

  useEffect(() => {
    const loadAviso = async () => {
      if (avisoId && !initialAviso) {
        try {
          setLoading(true);
          const data = await getAvisoById(avisoId);
          setAviso(data);
        } catch (error) {
          console.error('Error loading aviso:', error);
          Alert.alert('Error', 'No se pudo cargar el aviso');
        } finally {
          setLoading(false);
        }
      }
    };

    loadAviso();
  }, [avisoId, initialAviso]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setCurrentUserId(data?.user?.id || null));
  }, []);

  useEffect(() => {
    if (aviso) {
      setIsOwner(!!(currentUserId && aviso.user_id && currentUserId === aviso.user_id));
    }
  }, [currentUserId, aviso]);

  if (!aviso) return null;

  const color = tipoColor[aviso.tipo_aviso as keyof typeof tipoColor] || tipoColor.default;

  const handleDelete = async () => {
    if (!aviso) return;
    
    setLoading(true);
    try {
      await deleteAviso(aviso.id, aviso.imagenes_urls || []);
      if (onDelete) {
        onDelete(aviso.id);
      } else if (onClose) {
        onClose();
      }
      Alert.alert('Éxito', 'El aviso ha sido eliminado correctamente');
    } catch (error) {
      console.error('Error deleting aviso:', error);
      Alert.alert('Error', 'No se pudo eliminar el aviso');
    } finally {
      setLoading(false);
    }
  };

  const handleRenew = async () => {
    if (!aviso) return;
    
    setLoading(true);
    try {
      await renewAviso(aviso.id);
      const updatedAviso = await getAvisoById(aviso.id);
      setAviso(updatedAviso);
      if (onUpdate) {
        onUpdate(updatedAviso);
      }
      Alert.alert('Éxito', 'El aviso ha sido renovado por 30 días más');
    } catch (error) {
      console.error('Error renewing aviso:', error);
      Alert.alert('Error', 'No se pudo renovar el aviso');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async () => {
    if (!aviso) return;
    
    setLoading(true);
    try {
      let newStatus = aviso.estado;
      if (aviso.tipo_aviso === 'perdido') newStatus = 'en_casa';
      if (aviso.tipo_aviso === 'adopcion') newStatus = 'adoptado';
      
      await changeAvisoStatus(aviso.id, newStatus);
      const updatedAviso = await getAvisoById(aviso.id);
      setAviso(updatedAviso);
      
      if (onUpdate) {
        onUpdate(updatedAviso);
      }
      
      if (onClose) {
        onClose();
      }
      
      Alert.alert('Éxito', `El aviso ha sido actualizado correctamente`);
    } catch (error) {
      console.error('Error updating status:', error);
      Alert.alert('Error', 'No se pudo actualizar el estado del aviso');
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    try {
      const shareOptions = {
        message: `Mira este aviso en PetoClub: ${aviso.tipo_aviso} - ${aviso.nombre}\n\n${aviso.descripcion}\n\nUbicación: ${aviso.ubicacion}\nContacto: ${aviso.contacto}`,
        url: `https://app.petoclub.com.ar/red-de-ayuda/${aviso.id}`,
        title: `Aviso de ${aviso.tipo_aviso} en PetoClub`
      };
      
      await Share.share(shareOptions);
    } catch (error) {
      Alert.alert('Error', 'No se pudo compartir el aviso');
    }
  };

  // Carousel controls
  const hasImages = aviso.imagenes_urls && aviso.imagenes_urls.length > 0;
  const nextImg = () => setImgIndex((idx) => (hasImages ? (idx + 1) % aviso.imagenes_urls!.length : 0));
  const prevImg = () => setImgIndex((idx) => (hasImages ? (idx - 1 + aviso.imagenes_urls!.length) % aviso.imagenes_urls!.length : 0));

  return (
    <View style={styles.modalOverlay}>
      <View style={styles.modalContent}>
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <Text style={styles.closeButtonText}>✕</Text>
        </TouchableOpacity>
        <View style={[styles.headerRow, { borderBottomColor: color }]}> 
          <Text style={[styles.modalTitle, { color }]}>{aviso.tipo_aviso.toUpperCase()}</Text>
          {aviso.destacado && (
            <View style={styles.badgeDestacado}>
              <Text style={styles.badgeDestacadoText}>Destacado</Text>
            </View>
          )}
          {aviso.estado && aviso.estado !== 'activo' && (
            <View style={[styles.statusBadge, aviso.estado === 'en_casa' || aviso.estado === 'adoptado' ? styles.statusSuccess : styles.statusDefault]}>
              <Text style={styles.statusBadgeText}>
                {aviso.estado === 'en_casa' && '¡En casa!'}
                {aviso.estado === 'adoptado' && '¡Adoptado!'}
                {aviso.estado !== 'en_casa' && aviso.estado !== 'adoptado' && aviso.estado}
              </Text>
            </View>
          )}
        </View>
        {hasImages && (
          <View style={styles.carouselWrapper}>
            <Image source={{ uri: aviso.imagenes_urls![imgIndex] }} style={styles.carouselImage} />
            {aviso.imagenes_urls!.length > 1 && (
              <View style={styles.carouselControls}>
                <TouchableOpacity onPress={prevImg} style={styles.carouselBtn}><Text style={styles.carouselBtnText}>{'‹'}</Text></TouchableOpacity>
                <Text style={styles.carouselIndicator}>{imgIndex + 1}/{aviso.imagenes_urls!.length}</Text>
                <TouchableOpacity onPress={nextImg} style={styles.carouselBtn}><Text style={styles.carouselBtnText}>{'›'}</Text></TouchableOpacity>
              </View>
            )}
          </View>
        )}
        <View style={styles.detailRow}><Text style={styles.detailLabel}>Nombre:</Text><Text style={styles.detailValue}>{aviso.nombre || '-'}</Text></View>
        <View style={styles.detailRow}><Text style={styles.detailLabel}>Especie:</Text><Text style={styles.detailValue}>{aviso.especie || '-'}</Text></View>
        <View style={styles.detailRow}><Text style={styles.detailLabel}>Descripción:</Text></View>
        <View style={styles.descriptionBox}><Text style={styles.descriptionText}>{aviso.descripcion || '-'}</Text></View>
        <View style={styles.detailRow}><Text style={styles.detailLabel}>Ubicación:</Text><Text style={styles.detailValue}>{aviso.ubicacion || '-'}</Text></View>
        <View style={styles.detailRow}><Text style={styles.detailLabel}>Fecha:</Text><Text style={styles.detailValue}>{aviso.fecha || '-'}</Text></View>
        <View style={styles.detailRow}><Text style={styles.detailLabel}>Contacto:</Text><Text style={[styles.detailValue, styles.contact]}>{aviso.contacto || '-'}</Text></View>
        <View style={{ flexDirection: 'row', marginTop: 18, justifyContent: 'center', flexWrap: 'wrap', gap: 10 }}>
          {isOwner && !aviso.destacado && (
            <TouchableOpacity style={[styles.actionBtn, styles.destacarBtn]} onPress={() => setShowDestacarModal(true)}>
              <Text style={[styles.actionBtnText, styles.destacarBtnText]}>Destacar aviso</Text>
            </TouchableOpacity>
          )}
          {isOwner && (
            <TouchableOpacity style={[styles.actionBtn, styles.editarBtn]} onPress={onEdit ? () => onEdit(aviso) : undefined}>
              <Text style={[styles.actionBtnText, styles.editarBtnText]}>Editar</Text>
            </TouchableOpacity>
          )}
          {isOwner && (
            <TouchableOpacity
              style={[styles.actionBtn, styles.eliminarBtn]}
              onPress={handleDelete}
              disabled={loading}
            >
              <Text style={[styles.actionBtnText, styles.eliminarBtnText]}>Eliminar</Text>
            </TouchableOpacity>
          )}
          {(aviso.tipo_aviso === 'perdido' && aviso.estado !== 'en_casa') && (
            <TouchableOpacity style={[styles.actionBtn, styles.estadoBtn]} onPress={handleStatusChange} disabled={loading}>
              <Text style={[styles.actionBtnText, styles.estadoBtnText]}>¡En Casa!</Text>
            </TouchableOpacity>
          )}
          {(aviso.tipo_aviso === 'adopcion' && aviso.estado !== 'adoptado') && (
            <TouchableOpacity style={[styles.actionBtn, styles.estadoBtn]} onPress={handleStatusChange} disabled={loading}>
              <Text style={[styles.actionBtnText, styles.estadoBtnText]}>¡Encontró familia!</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity 
            style={[styles.actionBtn, styles.compartirBtn]}
            onPress={handleShare}
          >
            <Text style={[styles.actionBtnText, styles.compartirBtnText]}>Compartir</Text>
          </TouchableOpacity>
          {loading && <ActivityIndicator style={{ marginLeft: 12 }} />}
        </View>
        <DestacarAvisoModal
          visible={showDestacarModal}
          avisoId={aviso.id}
          onClose={async () => {
            setShowDestacarModal(false);
            if (aviso) {
              try {
                const updatedAviso = await getAvisoById(aviso.id);
                setAviso(updatedAviso);
                if (onUpdate) {
                  onUpdate(updatedAviso);
                }
              } catch (error) {
                console.error('Error updating aviso after highlight:', error);
              }
            }
          }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    width: '100%',
    maxWidth: 430,
    maxHeight: '92%',
    shadowColor: '#000',
    shadowOpacity: 0.13,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 10,
  },
  closeButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 10,
    padding: 8,
  },
  closeButtonText: {
    fontSize: 22,
    color: '#888',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: '#ffbc4c',
    paddingBottom: 10,
    marginBottom: 12,
    justifyContent: 'space-between',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    fontFamily: 'Inter_700Bold',
    letterSpacing: 1.5,
  },
  statusBadge: {
    backgroundColor: '#e6f7e6',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginLeft: 10,
  },
  statusSuccess: {
    backgroundColor: '#c2f7d6',
  },
  statusDefault: {
    backgroundColor: '#f3e2b3',
  },
  statusBadgeText: {
    color: '#0a7d3a',
    fontWeight: 'bold',
    fontSize: 13,
  },
  badgeDestacado: {
    marginLeft: 10,
    backgroundColor: '#ffbc4c',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 3,
    alignSelf: 'center',
    shadowColor: '#ffbc4c',
    shadowOpacity: 0.15,
    elevation: 3,
  },
  badgeDestacadoText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 13,
    letterSpacing: 0.5,
  },
  carouselWrapper: {
    alignItems: 'center',
    marginBottom: 18,
    marginTop: 2,
  },
  carouselImage: {
    width: SCREEN_WIDTH > 500 ? 340 : SCREEN_WIDTH - 70,
    height: 220,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
    marginBottom: 6,
    resizeMode: 'cover',
  },
  carouselControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  carouselBtn: {
    backgroundColor: '#fffbe9',
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: '#ffbc4c',
    marginHorizontal: 5,
  },
  carouselBtnText: {
    fontSize: 24,
    color: '#ffbc4c',
    fontWeight: 'bold',
  },
  carouselIndicator: {
    fontSize: 14,
    color: '#b68f2e',
    fontWeight: 'bold',
    marginHorizontal: 4,
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: 8,
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  detailLabel: {
    width: 100,
    color: '#666',
    fontFamily: 'Inter_500Medium',
    fontSize: 15,
  },
  detailValue: {
    flex: 1,
    color: '#2c3e50',
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
  },
  descriptionBox: {
    backgroundColor: '#f8f8f8',
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
    marginHorizontal: 2,
  },
  descriptionText: {
    color: '#444',
    fontSize: 15,
    lineHeight: 20,
    fontFamily: 'Inter_400Regular',
  },
  contact: {
    color: '#ff6b6b',
    fontWeight: '500',
  },
  actionBtn: {
    backgroundColor: '#ffe7b5',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#ffbc4c',
  },
  actionBtnText: {
    color: '#b68f2e',
    fontWeight: 'bold',
    fontSize: 15,
  },
  destacarBtn: {
    backgroundColor: '#fffbe6',
    borderColor: '#ffbc4c',
    marginBottom: 6,
  },
  destacarBtnText: {
    color: '#b68f2e',
  },
  editarBtn: {
    backgroundColor: '#e3f2fd',
    borderColor: '#1976d2',
    marginBottom: 6,
  },
  editarBtnText: {
    color: '#1976d2',
  },
  eliminarBtn: {
    backgroundColor: '#ffebee',
    borderColor: '#e53935',
    marginBottom: 6,
  },
  eliminarBtnText: {
    color: '#e53935',
    fontWeight: 'bold',
  },
  estadoBtn: {
    backgroundColor: '#e8f5e9',
    borderColor: '#43a047',
    marginBottom: 6,
  },
  estadoBtnText: {
    color: '#43a047',
    fontWeight: 'bold',
  },
  compartirBtn: {
    backgroundColor: '#e1f5fe',
    borderColor: '#03a9f4',
    marginBottom: 6,
  },
  compartirBtnText: {
    color: '#03a9f4',
  },
});
