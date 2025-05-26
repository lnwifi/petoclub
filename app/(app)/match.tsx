import React, { useState, useEffect } from 'react';
import PetDetailModal from '@/components/PetDetailModal';
import { View, Text, StyleSheet, Image, TouchableOpacity, ActivityIndicator, Alert, ScrollView, Platform } from 'react-native';
import { Heart, X, MessageCircle } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { router } from 'expo-router';

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
  featured?: boolean;
  interest?: string[];
  images?: string[]; // para carrusel
};

// Definir el tipo para los matches
type Match = {
  id: string;
  pet_id_1: string;
  pet_id_2: string;
  status_1: 'pending' | 'accepted' | 'rejected';
  status_2: 'pending' | 'accepted' | 'rejected';
  match_status: 'pending' | 'matched' | 'rejected';
  created_at: string;
  updated_at: string;
  pet_1?: Pet;
  pet_2?: Pet;
  isInitiator?: boolean;
  displayStatus?: 'pending' | 'accepted' | 'rejected';
};


export default function PetMatch() {
  const [userPets, setUserPets] = useState<Pet[]>([]);
  const [selectedPet, setSelectedPet] = useState<Pet | null>(null);
  const [potentialMatches, setPotentialMatches] = useState<Pet[]>([]);
  const [currentPetIndex, setCurrentPetIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMatches, setLoadingMatches] = useState(false);
  const [pendingMatches, setPendingMatches] = useState<Match[]>([]);
  const [completedMatches, setCompletedMatches] = useState<Match[]>([]);
  const [activeTab, setActiveTab] = useState<'discover' | 'pending' | 'matched'>('discover');
  const [userMembership, setUserMembership] = useState<any>(null);
  const [ownerName, setOwnerName] = useState<string>('Usuario');
  const [modalVisible, setModalVisible] = useState(false);

  // Buscar el nombre del dueño cada vez que cambia el match actual
  useEffect(() => {
    const fetchOwnerName = async () => {
      const currentPet = potentialMatches[currentPetIndex];
      if (!currentPet?.owner_id) {
        setOwnerName('Usuario');
        return;
      }
      try {
        // Buscar el nombre en la tabla profiles
        const { data, error } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', currentPet.owner_id)
          .single();
        if (data && data.full_name) {
          setOwnerName(data.full_name);
        } else {
          setOwnerName('Usuario');
        }
      } catch {
        setOwnerName('Usuario');
      }
    };
    if (potentialMatches.length > 0 && currentPetIndex >= 0 && currentPetIndex < potentialMatches.length) {
      fetchOwnerName();
    }
  }, [potentialMatches, currentPetIndex]);

  // Cargar las mascotas del usuario al iniciar
  useEffect(() => {
    loadUserPets();
  }, []);

  // Cargar las mascotas potenciales cuando se selecciona una mascota
  useEffect(() => {
    if (selectedPet) {
      loadPotentialMatches();
      loadPendingMatches();
      loadCompletedMatches();
    }
  }, [selectedPet]);

  // Cargar las mascotas del usuario
  const loadUserPets = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        Alert.alert('Error', 'Debes iniciar sesión para usar esta función');
        return;
      }
      // Obtener membresía del usuario
      const { data: membershipData, error: membershipError } = await supabase.rpc('get_user_membership', { user_id: session.user.id });
      if (membershipError) {
        throw membershipError;
      }
      const membership = membershipData && membershipData.length > 0 ? membershipData[0] : null;
      let petsQuery = supabase.from('pets').select('*').eq('owner_id', session.user.id);
      if (membership && membership.membership_name.toLowerCase().includes('grat')) {
        petsQuery = petsQuery.eq('is_active', true);
      } else if (membership && membership.membership_name.toLowerCase().includes('premium')) {
        // No hacer nada, mostrar todas las mascotas
      }
      const { data: pets, error } = await petsQuery;
      if (error) throw error;
      if (pets && pets.length > 0) {
        setUserPets(pets);
        setSelectedPet(pets[0]);
      } else {
        setUserPets([]);
        setSelectedPet(null);
        Alert.alert(
          'No tienes mascotas',
          'Debes registrar al menos una mascota para usar la función de match',
          [
            { text: 'Ir a registrar mascota', onPress: () => router.push("/(app)") }
          ]
        );
      }
    } catch (error: any) {
      console.error('Error al cargar mascotas:', error);
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  // Cargar los matches potenciales para la mascota seleccionada
  const loadPotentialMatches = async () => {
    if (!selectedPet) return;
    
    try {
      setLoadingMatches(true);
      
      // Validar que el ID es un UUID válido
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!selectedPet.id || typeof selectedPet.id !== 'string' || !uuidRegex.test(selectedPet.id)) {
        console.error('El ID de la mascota seleccionada no es un UUID válido:', selectedPet.id);
        setPotentialMatches([]);
        setCurrentPetIndex(-1);
        setLoadingMatches(false);
        return;
      }

      console.log('Cargando matches para la mascota:', selectedPet.id, typeof selectedPet.id);
      console.log('Especie de la mascota:', selectedPet.species);
      console.log('Dueño de la mascota:', selectedPet.owner_id);
      
      // Obtener matches potenciales
      const { data, error } = await supabase
        .rpc('get_potential_matches', { user_pet_id: selectedPet.id });

      if (error) {
        console.error('Error al cargar matches potenciales:', error);
        setPotentialMatches([]);
        setCurrentPetIndex(-1);
        setLoadingMatches(false);
        return;
      }

      console.log('Datos recibidos de Supabase:', JSON.stringify(data, null, 2));
      
      if (data && Array.isArray(data) && data.length > 0) {
        console.log('Matches potenciales encontrados:', data.length);
        console.log('Primera mascota:', data[0]);
           // FILTRADO POR INTERESES: Si la mascota seleccionada tiene intereses, filtrar por coincidencia
           // Asegurarse de que los intereses sean arrays reales
            let cleanedData = data.map((pet: Pet) => {
              let interest = pet.interest;
              if (typeof interest === 'string') {
                const interestStr = String(interest);
                // Si es un string tipo JSON array
                if (interestStr.trim().startsWith('[')) {
                  try {
                    interest = JSON.parse(interestStr);
                  } catch {
                    interest = [];
                  }
                } else if (interestStr.trim().startsWith('{')) {
                  // Si es formato Postgres array: {jugar,correr}
                  interest = interestStr.replace(/[{}]/g, '').split(',').map((i: string) => i.trim()).filter(Boolean);
                } else {
                  interest = [];
                }
              }
              if (!Array.isArray(interest)) interest = [];
              return { ...pet, interest };
            });
           // Debug: mostrar cantidad antes del filtro
           console.log('Mascotas potenciales recibidas:', cleanedData.length);
           let filteredMatches = cleanedData;
           if (Array.isArray(selectedPet.interest) && selectedPet.interest.length > 0) {
             filteredMatches = cleanedData.filter((pet: Pet) => {
               // Asegura que pet.interest es array
               if (!Array.isArray(pet.interest) || pet.interest.length === 0) return false;
               // Al menos un interés en común
               return pet.interest.some((intr: string) => selectedPet.interest!.includes(intr));
             });
             console.log('Mascotas después del filtro por intereses:', filteredMatches.length);
           } else {
             // Si la mascota seleccionada no tiene intereses, mostrar todas
             console.log('Mascota seleccionada sin intereses, mostrando todas.');
           }
           // Debug: Log the image URLs loaded from Supabase
         console.log('Potential matches loaded:', cleanedData.map(p => ({ name: p.name, image_url: p.image_url })));
         setPotentialMatches(filteredMatches);
         setCurrentPetIndex(0);
    } else {
        console.log('No se encontraron matches potenciales');
        setPotentialMatches([]);
        setCurrentPetIndex(-1);
      }
    } catch (e) {
      console.error('Error inesperado al cargar matches:', e);
      setPotentialMatches([]);
      setCurrentPetIndex(-1);
    } finally {
      setLoadingMatches(false);
    }
  };

  // Cargar matches pendientes
  const loadPendingMatches = async () => {
    if (!selectedPet) return;
    
    try {
      console.log('Cargando matches pendientes para mascota:', selectedPet.id);
      
      const { data, error } = await supabase
        .rpc('get_pending_matches', { user_pet_id: selectedPet.id });

      if (error) {
        console.error('Error al cargar matches pendientes:', error);
        setPendingMatches([]);
        return;
      }

      console.log('Datos recibidos de get_pending_matches:', JSON.stringify(data, null, 2));
      
      // Transformar los datos al formato esperado por la interfaz
      const formattedData = data.map((match: any) => {
        const isInitiator = match.is_initiator;
        const petMatch: Match = {
          id: match.match_id, // Usar match_id en lugar de id
          pet_id_1: match.pet_id_1,
          pet_id_2: match.pet_id_2,
          status_1: match.status_1,
          status_2: match.status_2,
          match_status: match.match_status,
          created_at: match.created_at,
          updated_at: match.updated_at,
          // Agregar un campo para indicar si es iniciador o receptor
          isInitiator: isInitiator,
          // Agregar un campo para mostrar el estado del match
          displayStatus: isInitiator ? match.status_1 : match.status_2
        };
        
        // Crear objetos de mascota
        const otherPet: Pet = {
          id: isInitiator ? match.pet_id_2 : match.pet_id_1,
          name: match.pet_name,
          species: match.pet_species,
          breed: match.pet_breed,
          age: match.pet_age,
          description: match.pet_description,
          image_url: match.pet_image_url,
          owner_id: match.pet_owner_id
        };
        
        // Asignar las mascotas según quién inició el match
        if (isInitiator) {
          petMatch.pet_2 = otherPet;
        } else {
          petMatch.pet_1 = otherPet;
        }
        
        return petMatch;
      });

      console.log('Matches pendientes formateados:', JSON.stringify(formattedData, null, 2));
      setPendingMatches(formattedData || []);
      
    } catch (error: any) {
      console.error('Error al cargar matches pendientes:', error);
      setPendingMatches([]);
    }
  };

  // Cargar matches completados
  const loadCompletedMatches = async () => {
    if (!selectedPet) return;
    
    try {
      const { data, error } = await supabase
        .rpc('get_completed_matches', { user_pet_id: selectedPet.id });

      if (error) throw error;

      // Transformar los datos al formato esperado por la interfaz
      const formattedData = data.map((match: any) => {
        const isInitiator = match.is_initiator;
        const petMatch: Match = {
          id: match.id, // Usar match.id en lugar de match.match_id
          pet_id_1: match.pet_id_1,
          pet_id_2: match.pet_id_2,
          status_1: match.status_1,
          status_2: match.status_2,
          match_status: match.match_status,
          created_at: match.created_at,
          updated_at: match.updated_at,
        };
        
        // Crear objetos de mascota
        const otherPet: Pet = {
          id: isInitiator ? match.pet_id_2 : match.pet_id_1,
          name: match.pet_name,
          species: match.pet_species,
          breed: match.pet_breed,
          age: match.pet_age,
          description: match.pet_description,
          image_url: match.pet_image_url,
          owner_id: match.pet_owner_id
        };
        
        // Asignar las mascotas según quién inició el match
        if (isInitiator) {
          petMatch.pet_2 = otherPet;
        } else {
          petMatch.pet_1 = otherPet;
        }
        
        return petMatch;
      });

      setCompletedMatches(formattedData || []);
    } catch (error: any) {
      console.error('Error al cargar matches completados:', error);
    }
  };

  // Renderizar la tarjeta de match
  
const renderMatchCard = () => {
  const currentPet = potentialMatches[currentPetIndex];
  const isFeatured = currentPet?.featured;
  // ownerName viene del estado global del componente

  // Declarar variables locales para imágenes
  let parsedImages: string[] = [];
  let images: string[] = [];

  // Solo mostrar la primera imagen disponible (sin slider)
  if (currentPet?.images) {
    if (Array.isArray(currentPet.images)) {
      parsedImages = currentPet.images as string[];
    } else if (typeof currentPet.images === 'string') {
      const imgStr: string = (currentPet.images as string).trim();
      if (imgStr.startsWith('[')) {
        try { parsedImages = JSON.parse(imgStr); } catch { parsedImages = []; }
      } else if (imgStr.startsWith('{')) {
        parsedImages = imgStr.replace(/[{}]/g, '').split(',').map((i: string) => i.trim()).filter(Boolean);
      } else {
        parsedImages = [imgStr];
      }
    }
  }
  // Siempre poner image_url primero si existe (y no duplicar)
  if (currentPet?.image_url) {
    images = [currentPet.image_url, ...parsedImages.filter(img => img !== currentPet.image_url)];
  } else if (parsedImages.length > 0) {
    images = parsedImages;
  } else {
    images = ['https://images.unsplash.com/photo-1543466835-00a7907e9de1'];
  }
  // Solo se usará images[0] en el render


    console.log('Estado de carga:', loadingMatches);
    console.log('Número de matches potenciales:', potentialMatches.length);
    
    if (loadingMatches) {
      return (
        <View style={styles.loadingState}>
          <ActivityIndicator size="large" color="#ffbc4c" />
          <Text style={styles.loadingText}>Buscando mascotas...</Text>
        </View>
      );
    }

    if (potentialMatches.length === 0) {
      return (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>No hay mascotas disponibles</Text>
          <Text style={styles.emptyStateSubtext}>Vuelve más tarde para encontrar nuevos amigos</Text>
          <TouchableOpacity 
            style={styles.reloadButton}
            onPress={loadPotentialMatches}
          >
            <Text style={styles.reloadButtonText}>Buscar de nuevo</Text>
          </TouchableOpacity>
        </View>
      );
    }

    console.log('Mascota actual:', currentPet);
    
    if (!currentPet) {
      console.error('No se encontró la mascota actual');
      return null;
    }

    // Bloque de UI: nombre de la mascota, dueño y descripción
    // (esto va dentro del return principal de la tarjeta, no como return prematuro)
    // Elimina este return y colócalo dentro del bloque visual principal de la tarjeta.
    // Debug: Log the image_url before rendering
    console.log('Rendering image for pet:', currentPet.name, 'URL:', currentPet.image_url);
    return (
      <View style={[styles.cardContainer, isFeatured && styles.featuredCardContainer]}>
        <View style={[styles.card, isFeatured && styles.featuredCard]}>

          {isFeatured && (
            <View style={styles.featuredBadgePet}>
              <Text style={styles.featuredBadgePetText}>★ DESTACADA</Text>
            </View>
          )}
          <PetDetailModal
            visible={modalVisible}
            onClose={() => setModalVisible(false)}
            pet={potentialMatches[currentPetIndex] || null}
          />
          {Platform.OS === 'web' ? (
            <div 
              onClick={() => setModalVisible(true)} 
              style={{ 
                cursor: 'pointer', 
                position: 'relative', 
                width: '100%', 
                height: 400, 
                borderRadius: 18, 
                overflow: 'hidden', 
                boxShadow: '0 4px 16px rgba(0,0,0,0.10)',
                backgroundColor: '#fff'
              }}
            >
              <img 
                src={images[0] || ''} 
                alt={currentPet.name} 
                style={{ 
                  width: '100%', 
                  height: '100%', 
                  objectFit: 'cover', 
                  display: 'block' 
                }} 
              />
                <div 
                  className="overlay"
                  style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    width: '100%',
                    background: 'rgba(0,0,0,0.45)',
                    color: '#fff',
                    padding: 24,
                    borderBottomLeftRadius: 18,
                    borderBottomRightRadius: 18,
                    boxSizing: 'border-box',
                  }}
                >
                  <div style={{ fontSize: 26, marginBottom: 6, fontFamily: 'Inter_700Bold, Inter, sans-serif' }}>{currentPet.name || 'Nombre no disponible'}</div>
                  <div style={{ fontSize: 15, color: '#fff', marginBottom: 4, fontFamily: 'Inter_400Regular, Inter, sans-serif' }}>Dueño/a: {ownerName}</div>
                  <div style={{ fontSize: 16, marginBottom: 6, fontFamily: 'Inter_400Regular, Inter, sans-serif' }}>
                    {currentPet.species || 'Especie no disponible'}
                    {currentPet.breed ? ` • ${currentPet.breed}` : ''}
                    {currentPet.age ? ` • ${currentPet.age}` : ''}
                  </div>
                  <div style={{ fontSize: 17, fontWeight: 600, marginBottom: 2, fontFamily: 'Inter_500Medium, Inter, sans-serif' }}>Sobre mí</div>
                  <div style={{ fontSize: 14, marginBottom: 6, fontFamily: 'Inter_400Regular, Inter, sans-serif' }}>{currentPet.description || 'No hay descripción disponible.'}</div>
                  {Array.isArray(currentPet.interest) && currentPet.interest.length > 0 ? (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {currentPet.interest.map((intr: string, idx: number) => (
                        <span key={idx} style={{ background: '#ffbc4c', borderRadius: 12, padding: '3px 10px', color: '#fff', fontSize: 12, fontFamily: 'Inter_500Medium, Inter, sans-serif' }}>{intr}</span>
                      ))}
                    </div>
                  ) : (
                    <div style={{ color: '#eee', fontSize: 12, marginTop: 4, fontFamily: 'Inter_400Regular, Inter, sans-serif' }}>Sin intereses registrados</div>
                  )}
                </div>
            </div>
          ) : (
            <View style={styles.imageCardContainer}>
                <View style={{ flex: 1, width: '100%', height: '100%' }}>
                  <Image
                    source={{ uri: images[0] }}
                    style={styles.fullCardImage}
                    resizeMode="cover"
                  />
                </View>
                <View style={styles.imageOverlay}>
                  <Text style={styles.overlayPetName}>{currentPet.name || 'Nombre no disponible'}</Text>
                  <Text style={{ fontSize: 15, color: '#eee', marginBottom: 2 }}>{`Dueño: ${ownerName}`}</Text>
                  <Text style={styles.overlayPetBreed}>
                    {currentPet.species || 'Especie no disponible'}
                    {currentPet.breed ? ` • ${currentPet.breed}` : ''}
                    {currentPet.age ? ` • ${currentPet.age}` : ''}
                  </Text>
                  <Text style={{ fontSize: 17, fontWeight: '600', color: '#fff', marginBottom: 1 }}>Sobre mí</Text>
                  <Text style={styles.overlayPetDescription} numberOfLines={2}>
                    {currentPet.description || 'No hay descripción disponible.'}
                  </Text>
                  {Array.isArray(currentPet.interest) && currentPet.interest.length > 0 ? (
                    <View style={styles.overlayInterestsContainer}>
                      {currentPet.interest.map((intr, idx) => (
                        <View key={idx} style={styles.overlayInterestTag}>
                          <Text style={styles.overlayInterestText}>{intr}</Text>
                        </View>
                      ))}
                    </View>
                  ) : (
                    <Text style={styles.overlayNoInterests}>Sin intereses registrados</Text>
                  )}
                </View>
              </View>
            )}
          <View style={styles.actions}>
            <TouchableOpacity 
              style={[styles.actionButton, styles.noButton]}
              onPress={handleDislike}
            >
              <X size={24} color="#ff4c4c" />
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.actionButton, styles.likeButton]}
              onPress={handleLike}
            >
              <Heart size={24} color="#4CAF50" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  // Pasar a la siguiente mascota
  const goToNextPet = () => {
    if (currentPetIndex < potentialMatches.length - 1) {
      setCurrentPetIndex(currentPetIndex + 1);
    } else {
      // Cuando no hay más mascotas, mostrar Alert y mantener la lista
      Alert.alert(
        '¡Fin!',
        'Has visto todas las mascotas disponibles. Vuelve más tarde para encontrar más amigos.'
      );
    }
  };

  // Manejar el like
  const handleLike = async () => {
    if (!selectedPet) return;
    
    try {
      const currentPet = potentialMatches[currentPetIndex];
      
      console.log('Haciendo match con:', currentPet.id);
      
      // Crear el match
      const { error: matchError } = await supabase
        .from('pet_matches')
        .insert({
          pet_id_1: selectedPet.id,
          pet_id_2: currentPet.id,
          status_1: 'accepted',
          status_2: 'pending',
          match_status: 'pending'
        });

      if (matchError) throw matchError;

      // Actualizar los matches pendientes para la mascota actual
      await loadPendingMatches();

      // Mostrar mensaje de confirmación
      Alert.alert(
        'Match enviado!',
        'Has enviado una solicitud de match. Espera que la otra mascota la acepte.'
      );

      // Pasar a la siguiente mascota
      if (currentPetIndex < potentialMatches.length - 1) {
        goToNextPet();
      } else {
        // Si estamos en la última mascota, mostrar Alert pero mantener el match
        Alert.alert(
          '¡Fin!',
          'Has visto todas las mascotas disponibles. Vuelve más tarde para encontrar más amigos.'
        );
      }
    } catch (error: any) {
      console.error('Error al hacer match:', error);
      Alert.alert('Error', 'No se pudo hacer match con esta mascota');
    }
  };

  // Cargar matches pendientes para la mascota del otro usuario
  const loadPendingMatchesForOtherPet = async (otherPetId: string) => {
    try {
      const { data, error } = await supabase
        .rpc('get_pending_matches_for_other', { user_pet_id: otherPetId });

      if (error) {
        console.error('Error al cargar matches pendientes para la mascota del otro usuario:', error);
        return;
      }

      // Solo registrar en consola para debug
      console.log('Matches pendientes para la mascota del otro usuario:', data);
    } catch (error) {
      console.error('Error al cargar matches pendientes para la mascota del otro usuario:', error);
    }
  };

  // Manejar el dislike
  const handleDislike = () => {
    goToNextPet();
  };

  // Responder a un match pendiente
  const respondToMatch = async (match: Match, accept: boolean) => {
    try {
      const isPetOne = match.pet_id_1 === selectedPet?.id;
      const statusField = isPetOne ? 'status_1' : 'status_2';
      const newStatus = accept ? 'accepted' : 'rejected';

      // Actualizar el status correspondiente
      const { error } = await supabase
        .from('pet_matches')
        .update({ 
          [statusField]: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', match.id);
      if (error) throw error;

      // Obtener el match actualizado para ver ambos status
      const { data: updatedMatchArr, error: fetchError } = await supabase
        .from('pet_matches')
        .select('status_1, status_2')
        .eq('id', match.id)
        .single();
      if (fetchError) throw fetchError;

      let matchStatusToSet = undefined;
      if (updatedMatchArr.status_1 === 'accepted' && updatedMatchArr.status_2 === 'accepted') {
        matchStatusToSet = 'matched';
      } else if (updatedMatchArr.status_1 === 'rejected' || updatedMatchArr.status_2 === 'rejected') {
        matchStatusToSet = 'rejected';
      }

      if (matchStatusToSet) {
        const { error: statusError } = await supabase
          .from('pet_matches')
          .update({ match_status: matchStatusToSet, updated_at: new Date().toISOString() })
          .eq('id', match.id);
        if (statusError) throw statusError;
      }

      // Recargar los matches
      await loadPendingMatches();
      await loadCompletedMatches && loadCompletedMatches();

      if (accept && matchStatusToSet === 'matched') {
        const otherPet = isPetOne ? match.pet_2 : match.pet_1;
        Alert.alert('¡Match!', `¡Has hecho match con ${otherPet?.name}! Ahora pueden chatear.`);
      }
      if (!accept) {
        Alert.alert('Rechazado', 'Has rechazado la solicitud de match.');
      }
    } catch (error: any) {
      console.error('Error al responder al match:', error);
      Alert.alert('Error', error.message);
    }
  };

  // Utilidad para obtener un key único para cada match
  const getMatchKey = (match: any, idx: number) => {
    if (match.id && typeof match.id === 'string' && match.id !== '') return match.id;
    if (match.match_id && typeof match.match_id === 'string' && match.match_id !== '') return match.match_id;
    // Fallback: serializa los ids de las mascotas para mayor unicidad
    if (match.pet_id_1 && match.pet_id_2) return `${match.pet_id_1}-${match.pet_id_2}`;
    // Último recurso: usa el índice
    return `match-idx-${idx}`;
  };

  // Ir a la pantalla de chat, con validación extra
  const goToChat = (match: Match) => {
    const matchId = match.id;
    if (!matchId || typeof matchId !== 'string' || matchId === '') {
      console.warn('No se puede navegar al chat, match inválido:', match);
      Alert.alert('Error', 'No se puede abrir el chat para este match.');
      return;
    }
    router.push({
      pathname: '/(app)/chat',
      params: { matchId }
    });
  };

  // Renderizar un match pendiente individual
  const renderPendingMatchItem = (match: Match, idx: number) => {
    const isInitiator = match.pet_id_1 === selectedPet?.id;
    const otherPet = isInitiator ? match.pet_2 : match.pet_1;
    const myStatus = isInitiator ? match.status_1 : match.status_2;
    const matchKey = getMatchKey(match, idx);
    if (myStatus !== 'pending') {
      return (
        <View key={matchKey} style={styles.matchCard}>
          <Image
            source={{ uri: otherPet?.image_url || 'https://images.unsplash.com/photo-1543466835-00a7907e9de1' }}
            style={styles.matchImage}
            resizeMode="cover"
          />
          <View style={styles.matchInfo}>
            <Text style={styles.matchName}>{otherPet?.name}</Text>
            <Text style={styles.matchStatus}>
              {myStatus === 'accepted' ? 'Esperando respuesta...' : 'Has rechazado este match'}
            </Text>
          </View>
        </View>
      );
    }
    return (
      <View key={matchKey} style={styles.matchCard}>
        <Image
          source={{ uri: otherPet?.image_url || 'https://images.unsplash.com/photo-1543466835-00a7907e9de1' }}
          style={styles.matchImage}
          resizeMode="cover"
        />
        <View style={styles.matchInfo}>
          <Text style={styles.matchName}>{otherPet?.name}</Text>
          <Text style={styles.matchBreed}>
            {otherPet?.species} {otherPet?.breed ? `• ${otherPet.breed}` : ''} {otherPet?.age ? `• ${otherPet.age}` : ''}
          </Text>
          <View style={styles.matchActions}>
            <TouchableOpacity 
              style={[styles.matchActionButton, styles.matchNoButton]}
              onPress={() => respondToMatch(match, false)}
            >
              <X size={18} color="#ff4c4c" />
              <Text style={[styles.matchActionText, {color: '#ff4c4c'}]}>Rechazar</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.matchActionButton, styles.matchLikeButton]}
              onPress={() => respondToMatch(match, true)}
            >
              <Heart size={18} color="#4CAF50" />
              <Text style={[styles.matchActionText, {color: '#4CAF50'}]}>Aceptar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  // Renderizar la lista de matches pendientes
  const renderPendingMatches = () => (
    pendingMatches.length === 0 ? (
      <View style={styles.emptyState}>
        <Text style={styles.emptyStateText}>No tienes matches pendientes</Text>
        <Text style={styles.emptyStateSubtext}>Cuando alguien quiera hacer match con tu mascota, aparecerá aquí</Text>
      </View>
    ) : (
      <ScrollView style={styles.matchesList}>
        {pendingMatches.map((match, idx) => renderPendingMatchItem(match, idx))}
      </ScrollView>
    )
  );

  // Renderizar un match completado individual
  const renderCompletedMatchItem = (match: Match, idx: number) => {
    const isInitiator = match.pet_id_1 === selectedPet?.id;
    const otherPet = isInitiator ? match.pet_2 : match.pet_1;
    const matchKey = getMatchKey(match, idx);
    return (
      <View key={matchKey} style={styles.matchCard}>
        <Image
          source={{ uri: otherPet?.image_url || 'https://images.unsplash.com/photo-1543466835-00a7907e9de1' }}
          style={styles.matchImage}
          resizeMode="cover"
        />
        <View style={styles.matchInfo}>
          <Text style={styles.matchName}>{otherPet?.name}</Text>
          <Text style={styles.matchBreed}>
            {otherPet?.species} {otherPet?.breed ? `• ${otherPet.breed}` : ''} {otherPet?.age ? `• ${otherPet.age}` : ''}
          </Text>
          <TouchableOpacity 
            style={styles.chatButton}
            onPress={() => goToChat(match)}
          >
            <MessageCircle size={16} color="#fff" />
            <Text style={styles.chatButtonText}>Chat</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // Renderizar la lista de matches completados
  const renderCompletedMatches = () => (
    completedMatches.length === 0 ? (
      <View style={styles.emptyState}>
        <Text style={styles.emptyStateText}>No tienes matches completados</Text>
        <Text style={styles.emptyStateSubtext}>Cuando tú y otro dueño acepten un match, aparecerá aquí</Text>
      </View>
    ) : (
      <ScrollView style={styles.matchesList}>
        {completedMatches.map((match, idx) => renderCompletedMatchItem(match, idx))}
      </ScrollView>
    )
  );

  // Cambiar la mascota seleccionada
  const changePet = (pet: Pet) => {
    setSelectedPet(pet);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#ffbc4c" />
        <Text style={styles.loadingText}>Cargando...</Text>
      </View>
    );
  }

  return (
    <>
      <View style={styles.container}>
        {/* Selector de mascota */}
        {userPets.length > 0 && (
          <View style={styles.petSelectorContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.petSelector}>
              {userPets.map(pet => (
                <TouchableOpacity 
                  key={pet.id} 
                  style={[
                    styles.petSelectorItem,
                    selectedPet?.id === pet.id && styles.selectedPetItem
                  ]}
                  onPress={() => changePet(pet)}
                >
                  <Image
                    source={{ uri: pet.image_url || 'https://images.unsplash.com/photo-1517849845537-4d257902454a' }}
                    style={styles.petSelectorImage}
                  />
                  <Text style={styles.petSelectorName}>{pet.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Pestañas y contenido */}
        <View style={styles.mainContent}>
          {/* Pestañas */}
          <View style={styles.tabs}>
            <TouchableOpacity 
              style={[styles.tab, activeTab === 'discover' && styles.activeTab]}
              onPress={() => setActiveTab('discover')}
            >
              <Text style={[styles.tabText, activeTab === 'discover' && styles.activeTabText]}>Descubrir</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.tab, activeTab === 'pending' && styles.activeTab]}
              onPress={() => setActiveTab('pending')}
            >
              <Text style={[styles.tabText, activeTab === 'pending' && styles.activeTabText]}>Pendientes</Text>
              {pendingMatches.length > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{pendingMatches.length}</Text>
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.tab, activeTab === 'matched' && styles.activeTab]}
              onPress={() => setActiveTab('matched')}
            >
              <Text style={[styles.tabText, activeTab === 'matched' && styles.activeTabText]}>Matches</Text>
              {completedMatches.length > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{completedMatches.length}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* Contenido según la pestaña activa */}
          <View style={styles.content}>
            {loadingMatches && activeTab === 'discover' ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#ffbc4c" />
                <Text style={styles.loadingText}>Cargando matches...</Text>
              </View>
            ) : (
              (() => {
                if (activeTab === 'discover') return renderMatchCard();
                if (activeTab === 'pending') return renderPendingMatches();
                if (activeTab === 'matched') return renderCompletedMatches();
                return null;
              })()
            )}
          </View>
        </View>
      </View>
      
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
  },
  petSelectorContainer: {
    padding: 0,
    backgroundColor: '#fff',
    borderBottomWidth: 0,
    marginBottom: 8,
  },
  petSelector: {
    padding: 8,
    backgroundColor: '#fff',
    borderBottomWidth: 0,
  },
  petSelectorItem: {
    alignItems: 'center',
    marginRight: 10,
    opacity: 0.7,
  },
  selectedPetItem: {
    opacity: 1,
  },
  petSelectorImage: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
    borderWidth: 2,
    borderColor: '#ffbc4c',
  },
  petSelectorName: {
    marginTop: 2,
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
  },
  mainContent: {
    flex: 1,
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 0,
    height: 35,
    justifyContent: 'space-around',
    zIndex: 10,
    marginBottom: 0,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#ffbc4c',
  },
  tabText: {
    color: '#666',
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
  },
  activeTabText: {
    color: '#ffbc4c',
    fontWeight: 'bold',
  },
  badge: {
    backgroundColor: '#ff4c4c',
    borderRadius: 10,
    width: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 4,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontFamily: 'Inter_700Bold',
  },
  content: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    marginTop: -1,
    paddingTop: 1,
  },
  cardContainer: {
    flex: 1,
    paddingHorizontal: 10,
    paddingTop: 0,
    paddingBottom: 10,
    marginTop: 0,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 15,
    overflow: 'hidden',
    width: '100%',
    height: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  imageCardContainer: {
    width: '100%',
    aspectRatio: 1,
    minHeight: 340,
    maxHeight: 420,
    borderRadius: 18,
    overflow: 'hidden',
    position: 'relative',
    marginBottom: 10,
    backgroundColor: '#f0f0f0',
    alignSelf: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
  },
  fullCardImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  imageOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: '100%',
    padding: 20,
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
  },
  overlayPetName: {
    color: '#fff',
    fontSize: 24,
    fontFamily: 'Inter_700Bold',
    marginBottom: 6,
  },
  overlayPetBreed: {
    color: '#fff',
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    marginBottom: 6,
  },
  overlayPetDescription: {
    color: '#fff',
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    marginBottom: 6,
  },
  overlayInterestsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 4,
  },
  overlayInterestTag: {
    backgroundColor: '#ffbc4c',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 3,
    marginRight: 6,
    marginBottom: 4,
  },
  overlayInterestText: {
    color: '#fff',
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
  },
  overlayNoInterests: {
    color: '#eee',
    fontSize: 12,
    marginTop: 4,
    fontFamily: 'Inter_400Regular',
  },

  petInfo: {
    padding: 10,
    height: '25%',
  },
  petName: {
    fontSize: 22,
    fontFamily: 'Inter_700Bold',
    marginBottom: 2,
    color: '#333',
  },
  petBreed: {
    fontSize: 14,
    color: '#666',
    fontFamily: 'Inter_400Regular',
    marginBottom: 4,
  },
  petDescription: {
    fontSize: 14,
    color: '#444',
    lineHeight: 18,
    fontFamily: 'Inter_400Regular',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    height: '15%',
  },
  actionButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  noButton: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#ff4c4c',
  },
  likeButton: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#4CAF50',
  },
  loadingState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 10,
  },
  emptyStateText: {
    fontSize: 18,
    fontFamily: 'Inter_700Bold',
    marginBottom: 5,
    textAlign: 'center',
    color: '#333',
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#666',
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
  },
  reloadButton: {
    backgroundColor: '#ffbc4c',
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    marginTop: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  reloadButtonText: {
    color: '#fff',
    fontSize: 14,
    fontFamily: 'Inter_700Bold',
    textAlign: 'center',
  },
  matchesList: {
    flex: 1,
    padding: 5,
  },
  matchCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    marginBottom: 8,
    flexDirection: 'row',
    overflow: 'hidden',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  matchImage: {
    width: 80,
    height: 80,
    backgroundColor: '#f0f0f0',
  },
  matchInfo: {
    flex: 1,
    padding: 10,
    justifyContent: 'center',
  },
  matchName: {
    fontSize: 16,
    fontFamily: 'Inter_700Bold',
    marginBottom: 2,
    color: '#333',
  },
  matchBreed: {
    fontSize: 12,
    color: '#666',
    fontFamily: 'Inter_400Regular',
    marginBottom: 5,
  },
  matchStatus: {
    fontSize: 12,
    color: '#ffbc4c',
    fontFamily: 'Inter_500Medium',
  },
  matchActions: {
    flexDirection: 'row',
    marginTop: 5,
  },
  matchActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
    marginRight: 8,
  },
  matchNoButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ff4c4c',
  },
  matchLikeButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  matchActionText: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    marginLeft: 4,
    color: '#333',
  },
  chatButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    paddingVertical: 4,
    paddingHorizontal: 8,
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
  chatButtonText: {
    color: '#fff',
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    marginLeft: 4,
  },
  featuredCardContainer: {
    borderWidth: 2,
    borderColor: '#FFD700',
    borderRadius: 16,
    shadowColor: '#FFD700',
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 6,
  },
  featuredCard: {
    borderWidth: 2,
    borderColor: '#FFD700',
  },
  featuredBadgePet: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: '#FFD700',
    borderRadius: 8,
    paddingVertical: 3,
    paddingHorizontal: 10,
    zIndex: 10,
    shadowColor: '#FFD700',
    shadowOpacity: 0.18,
    shadowRadius: 4,
    elevation: 4,
  },
  featuredBadgePetText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 13,
    letterSpacing: 1,
  },
});
