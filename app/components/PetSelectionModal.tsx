import React, { useState } from 'react';
import { Modal, View, Text, TouchableOpacity, ScrollView, Image as RNImage, Alert, Platform, Linking } from 'react-native';
import { usePetSelection } from './PetSelectionContext';
import { supabase } from '@/lib/supabase';
import { useAuth } from '../../lib/auth-context';

export default function PetSelectionModal() {
  const {
    showModal,
    setShowModal,
    pets,
    setPets,
    userMembership,
    setUserMembership,
    hasConfirmed,
    setHasConfirmed
  } = usePetSelection();
  const { session } = useAuth();
  const [petToKeepId, setPetToKeepId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Confirmar selección de mascota
  const confirmDowngrade = async (petId: string) => {
    setLoading(true);
    try {
      if (!session || !session.user) throw new Error('No hay sesión');
      // Desactivar todas las mascotas menos la seleccionada
      await supabase
        .from('pets')
        .update({ is_active: false })
        .eq('owner_id', session.user.id)
        .neq('id', petId);
      // Activar la seleccionada
      await supabase
        .from('pets')
        .update({ is_active: true })
        .eq('id', petId);
      // Refrescar mascotas
      const { data: newPets } = await supabase
        .from('pets')
        .select('*')
        .eq('owner_id', session.user.id);
      if (newPets) setPets(newPets);
      // Refrescar membresía
      const { data: membershipData } = await supabase
        .rpc('get_user_membership', { user_id: session.user.id });
      if (membershipData && membershipData.length > 0) setUserMembership(membershipData[0]);
      setHasConfirmed(true);
      setShowModal(false);
      Alert.alert('¡Listo!', 'La mascota seleccionada quedó activa.');
    } catch (e) {
      Alert.alert('Error', 'No se pudo actualizar la selección de mascota.');
    }
    setLoading(false);
  };

  // Pago de membresía Premium
  const handleUpgradeToPremium = async () => {
    setLoading(true);
    try {
      if (!session || !session.user) throw new Error('No hay sesión');
      // Obtener tipo premium
      const { data: types, error } = await supabase.from('membership_types').select('*');
      if (error || !types) throw new Error('No se pudo obtener tipos de membresía');
      const premiumType = types.find((t: any) => t.name === 'Premium');
      if (!premiumType) throw new Error('No se encontró la membresía Premium');
      // Crear preferencia
      const token = session.access_token;
      const response = await fetch('https://cbrxgjksefmgtoatkbbs.supabase.co/functions/v1/create_payment_preference', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          tipo: 'membresia',
          price: premiumType.price,
          title: 'Membresía Premium por 30 Días',
          user_id: session.user.id,
          metadata: {
            membership_type_id: premiumType.id,
            membership_type: 'premium'
          }
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'No se pudo crear la preferencia de pago');
      if (!data.init_point) throw new Error('No se recibió la URL de pago de MercadoPago');
      // Abrir la URL de pago
      if (Platform.OS === 'web') {
        window.open(data.init_point, '_blank', 'noopener,noreferrer');
      } else {
        await Linking.openURL(data.init_point);
      }
      // Esperar a que el usuario pague y refrescar membresía cuando vuelva a la app
      // El modal se cerrará automáticamente cuando el contexto detecte el upgrade
    } catch (err: any) {
      Alert.alert('Error', err.message || 'No se pudo crear la preferencia de pago');
    }
    setLoading(false);
  };

  if (!showModal) return null;

  return (
    <Modal
      visible={showModal}
      transparent
      animationType="slide"
      onRequestClose={() => {}}
    >
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' }}>
        <View style={{ backgroundColor: 'white', padding: 24, borderRadius: 12, width: '90%' }}>
          <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 12, textAlign: 'center' }}>
            Selecciona la mascota que deseas mantener activa
          </Text>
          <Text style={{ color: '#c67c00', fontSize: 14, marginBottom: 18, textAlign: 'center' }}>
            Solo podrás cambiar la mascota activa si vuelves a activar la membresía Premium.
          </Text>
          <ScrollView style={{ maxHeight: 220, marginBottom: 10 }}>
            {pets.map(pet => (
              <TouchableOpacity
                key={pet.id}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  borderWidth: 2,
                  borderColor: petToKeepId === pet.id ? '#ffbc4c' : '#eee',
                  borderRadius: 10,
                  padding: 10,
                  marginBottom: 10,
                  backgroundColor: petToKeepId === pet.id ? '#fffbe6' : '#fafafa',
                }}
                onPress={() => setPetToKeepId(pet.id)}
                disabled={loading}
              >
                <RNImage
                  source={{ uri: pet.image_url || 'https://images.unsplash.com/photo-1518717758536-85ae29035b6d?auto=format&fit=facearea&w=256&h=256' }}
                  style={{ width: 56, height: 56, borderRadius: 28, marginRight: 16, borderWidth: 1, borderColor: '#eee' }}
                />
                <Text style={{ fontSize: 16, fontWeight: '600', color: '#333' }}>{pet.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <TouchableOpacity
            style={{ marginTop: 8, backgroundColor: '#ffbc4c', borderRadius: 8, padding: 14, alignItems: 'center', opacity: petToKeepId ? 1 : 0.5 }}
            disabled={!petToKeepId || loading}
            onPress={() => {
              if (petToKeepId) confirmDowngrade(petToKeepId);
            }}
          >
            <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>Confirmar selección</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={{ marginTop: 18, backgroundColor: '#4CAF50', borderRadius: 8, padding: 14, alignItems: 'center' }}
            disabled={loading}
            onPress={handleUpgradeToPremium}
          >
            <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>Seguir con la membresía Premium</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
