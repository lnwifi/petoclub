import { View, Text, StyleSheet, Image, TouchableOpacity, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { Heart, X, MessageCircle } from 'lucide-react-native';
import { useState, useEffect } from 'react';
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

      const { data: pets, error } = await supabase
        .from('pets')
        .select('*')
        .eq('owner_id', session.user.id);

      if (error) throw error;

      if (pets && pets.length > 0) {
        setUserPets(pets);
        setSelectedPet(pets[0]); // Seleccionar la primera mascota por defecto
      } else {
        Alert.alert(
          'No tienes mascotas',
          'Debes registrar al menos una mascota para usar la función de match',
          [
            {
              text: 'Ir a registrar mascota',
              onPress: () => router.push("/(app)")
            }
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
      
      console.log('Cargando matches para la mascota:', selectedPet.id);
      console.log('Detalles de la mascota seleccionada:', JSON.stringify(selectedPet, null, 2));
      
      // Verificar si hay mascotas en la base de datos
      const { data: allPets, error: petsError } = await supabase
        .from('pets')
        .select('*');
        
      if (petsError) {
        console.error('Error al verificar mascotas en la base de datos:', petsError);
      } else {
        console.log(`Total de mascotas en la base de datos: ${allPets?.length || 0}`);
        if (allPets && allPets.length > 0) {
          console.log('Ejemplo de mascota en la base de datos:', JSON.stringify(allPets[0], null, 2));
        }
      }
      
      // Obtener matches potenciales
      console.log('Llamando a get_potential_matches con user_pet_id:', selectedPet.id);
      const { data, error } = await supabase
        .rpc('get_potential_matches', { user_pet_id: selectedPet.id });

      if (error) {
        console.error('Error al cargar matches potenciales:', error);
        console.error('Detalles del error:', JSON.stringify(error, null, 2));
        
        // Mostrar mascotas de demostración temporalmente
        console.log('Mostrando mascotas de demostración temporalmente debido al error');
        const demoMatches: Pet[] = [
          {
            id: '1',
            name: 'Luna',
            species: selectedPet.species,
            breed: 'Mestizo',
            age: '2 años',
            description: 'Luna es una mascota juguetona y cariñosa que busca un amigo para jugar.',
            image_url: 'https://images.unsplash.com/photo-1543466835-00a7907e9de1',
            owner_id: '1'
          },
          {
            id: '2',
            name: 'Rocky',
            species: selectedPet.species,
            breed: 'Labrador',
            age: '3 años',
            description: 'Rocky es muy activo y le encanta correr en el parque.',
            image_url: 'https://images.unsplash.com/photo-1517849845537-4d257902454a',
            owner_id: '2'
          },
          {
            id: '3',
            name: 'Mia',
            species: selectedPet.species,
            breed: 'Siamés',
            age: '1 año',
            description: 'Mia es tranquila y le gusta dormir en lugares cálidos.',
            image_url: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba',
            owner_id: '3'
          }
        ];
        
        setPotentialMatches(demoMatches);
        setCurrentPetIndex(0);
        setLoadingMatches(false);
        return;
      }
      
      console.log('Respuesta de get_potential_matches:', JSON.stringify(data, null, 2));
      
      if (data && Array.isArray(data) && data.length > 0) {
        console.log('Matches potenciales encontrados:', data.length);
        console.log('Datos de matches:', JSON.stringify(data, null, 2));
        setPotentialMatches(data);
        setCurrentPetIndex(0);
      } else {
        console.log('No se encontraron matches potenciales o formato incorrecto');
        console.log('Tipo de datos recibido:', typeof data);
        
        // Mostrar mascotas de demostración temporalmente
        console.log('Mostrando mascotas de demostración temporalmente debido a que no hay matches');
        const demoMatches: Pet[] = [
          {
            id: '1',
            name: 'Luna',
            species: selectedPet.species,
            breed: 'Mestizo',
            age: '2 años',
            description: 'Luna es una mascota juguetona y cariñosa que busca un amigo para jugar.',
            image_url: 'https://images.unsplash.com/photo-1543466835-00a7907e9de1',
            owner_id: '1'
          },
          {
            id: '2',
            name: 'Rocky',
            species: selectedPet.species,
            breed: 'Labrador',
            age: '3 años',
            description: 'Rocky es muy activo y le encanta correr en el parque.',
            image_url: 'https://images.unsplash.com/photo-1517849845537-4d257902454a',
            owner_id: '2'
          },
          {
            id: '3',
            name: 'Mia',
            species: selectedPet.species,
            breed: 'Siamés',
            age: '1 año',
            description: 'Mia es tranquila y le gusta dormir en lugares cálidos.',
            image_url: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba',
            owner_id: '3'
          }
        ];
        
        setPotentialMatches(demoMatches);
        setCurrentPetIndex(0);
      }
    } catch (e) {
      console.error('Error inesperado al cargar matches:', e);
      console.error('Stack de error:', e instanceof Error ? e.stack : 'No stack disponible');
      
      // Mostrar mascotas de demostración temporalmente
      console.log('Mostrando mascotas de demostración temporalmente debido a error inesperado');
      const demoMatches: Pet[] = [
        {
          id: '1',
          name: 'Luna',
          species: selectedPet ? selectedPet.species : 'Perro',
          breed: 'Mestizo',
          age: '2 años',
          description: 'Luna es una mascota juguetona y cariñosa que busca un amigo para jugar.',
          image_url: 'https://images.unsplash.com/photo-1543466835-00a7907e9de1',
          owner_id: '1'
        },
        {
          id: '2',
          name: 'Rocky',
          species: selectedPet ? selectedPet.species : 'Perro',
          breed: 'Labrador',
          age: '3 años',
          description: 'Rocky es muy activo y le encanta correr en el parque.',
          image_url: 'https://images.unsplash.com/photo-1517849845537-4d257902454a',
          owner_id: '2'
        },
        {
          id: '3',
          name: 'Mia',
          species: selectedPet ? selectedPet.species : 'Gato',
          breed: 'Siamés',
          age: '1 año',
          description: 'Mia es tranquila y le gusta dormir en lugares cálidos.',
          image_url: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba',
          owner_id: '3'
        }
      ];
      
      setPotentialMatches(demoMatches);
      setCurrentPetIndex(0);
    } finally {
      setLoadingMatches(false);
    }
  };

  // Cargar matches pendientes
  const loadPendingMatches = async () => {
    if (!selectedPet) return;
    
    try {
      const { data, error } = await supabase
        .rpc('get_pending_matches', { user_pet_id: selectedPet.id });

      if (error) throw error;

      // Transformar los datos al formato esperado por la interfaz
      const formattedData = data.map((match: any) => {
        const isInitiator = match.is_initiator;
        const petMatch: Match = {
          id: match.id,
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

      setPendingMatches(formattedData || []);
    } catch (error: any) {
      console.error('Error al cargar matches pendientes:', error);
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
          id: match.id,
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

    const currentPet = potentialMatches[currentPetIndex];
    console.log('Mascota actual:', currentPet);
    
    if (!currentPet) {
      console.error('No se encontró la mascota actual');
      return null;
    }

    return (
      <View style={styles.cardContainer}>
        <View style={styles.card}>
          <Image
            source={{ uri: currentPet.image_url || 'https://images.unsplash.com/photo-1543466835-00a7907e9de1' }}
            style={styles.petImage}
            resizeMode="cover"
          />
          <View style={styles.petInfo}>
            <Text style={styles.petName}>{currentPet.name || 'Nombre no disponible'}</Text>
            <Text style={styles.petBreed}>
              {currentPet.species || 'Especie no disponible'} 
              {currentPet.breed ? ` • ${currentPet.breed}` : ''} 
              {currentPet.age ? ` • ${currentPet.age}` : ''}
            </Text>
            <Text style={styles.petDescription} numberOfLines={2}>
              {currentPet.description || 'No hay descripción disponible.'}
            </Text>
          </View>
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

      // Actualizar los matches pendientes
      await loadPendingMatches();
      
      // Pasar a la siguiente mascota
      goToNextPet();
    } catch (error: any) {
      console.error('Error al hacer match:', error);
      Alert.alert('Error', 'No se pudo hacer match con esta mascota');
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
      
      const { error } = await supabase
        .from('pet_matches')
        .update({ 
          [statusField]: accept ? 'accepted' : 'rejected',
          updated_at: new Date().toISOString()
        })
        .eq('id', match.id);

      if (error) throw error;
      
      // Recargar los matches
      loadPendingMatches();
      loadCompletedMatches();
      
      if (accept && ((isPetOne && match.status_2 === 'accepted') || (!isPetOne && match.status_1 === 'accepted'))) {
        // ¡Es un match!
        const otherPet = isPetOne ? match.pet_2 : match.pet_1;
        Alert.alert('¡Match!', `¡Has hecho match con ${otherPet?.name}! Ahora pueden chatear.`);
      }
      
    } catch (error: any) {
      console.error('Error al responder al match:', error);
      Alert.alert('Error', error.message);
    }
  };

  // Ir a la pantalla de chat
  const goToChat = (match: Match) => {
    router.push({
      pathname: '/(app)/chat',
      params: { matchId: match.id }
    });
  };

  // Cambiar la mascota seleccionada
  const changePet = (pet: Pet) => {
    setSelectedPet(pet);
  };

  // Renderizar la lista de matches pendientes
  const renderPendingMatches = () => {
    if (pendingMatches.length === 0) {
      return (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>No tienes matches pendientes</Text>
          <Text style={styles.emptyStateSubtext}>Cuando alguien quiera hacer match con tu mascota, aparecerá aquí</Text>
        </View>
      );
    }

    return (
      <ScrollView style={styles.matchesList}>
        {pendingMatches.map(match => {
          // Determinar qué mascota es la nuestra y cuál es la otra
          const isInitiator = match.pet_id_1 === selectedPet?.id;
          const otherPet = isInitiator ? match.pet_2 : match.pet_1;
          const myStatus = isInitiator ? match.status_1 : match.status_2;
          
          // Si ya respondimos, mostrar que estamos esperando
          if (myStatus !== 'pending') {
            return (
              <View key={match.id} style={styles.matchCard}>
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
          
          // Si no hemos respondido, mostrar botones de aceptar/rechazar
          return (
            <View key={match.id} style={styles.matchCard}>
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
        })}
      </ScrollView>
    );
  };

  // Renderizar la lista de matches completados
  const renderCompletedMatches = () => {
    if (completedMatches.length === 0) {
      return (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>No tienes matches completados</Text>
          <Text style={styles.emptyStateSubtext}>Cuando tú y otro dueño acepten un match, aparecerá aquí</Text>
        </View>
      );
    }

    return (
      <ScrollView style={styles.matchesList}>
        {completedMatches.map(match => {
          // Determinar qué mascota es la nuestra y cuál es la otra
          const isInitiator = match.pet_id_1 === selectedPet?.id;
          const otherPet = isInitiator ? match.pet_2 : match.pet_1;
          
          return (
            <View key={match.id} style={styles.matchCard}>
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
        })}
      </ScrollView>
    );
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
            <>
              {activeTab === 'discover' && renderMatchCard()}
              {activeTab === 'pending' && renderPendingMatches()}
              {activeTab === 'matched' && renderCompletedMatches()}
            </>
          )}
        </View>
      </View>
    </View>
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
  petImage: {
    width: '100%',
    height: '60%',
    backgroundColor: '#f0f0f0',
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
  pendingActions: {
    flexDirection: 'row',
    marginTop: 5,
  },
  pendingAction: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
    marginRight: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  acceptButton: {
    backgroundColor: '#4CAF50',
  },
  rejectButton: {
    backgroundColor: '#ff4c4c',
  },
  pendingActionText: {
    color: '#fff',
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    marginLeft: 4,
  },
});