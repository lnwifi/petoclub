import { View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList, Image, KeyboardAvoidingView, Platform, ActivityIndicator, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Send, ArrowLeft } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { Animated, Easing } from 'react-native';

// Definir tipos
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

type Message = {
  id: string;
  match_id: string;
  sender_id: string;
  message: string;
  read: boolean;
  created_at: string;
};

export default function ChatScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const matchId = params.matchId as string;
  
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [match, setMatch] = useState<Match | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [userId, setUserId] = useState<string | null>(null);
  const [myPet, setMyPet] = useState<Pet | null>(null);
  const [otherPet, setOtherPet] = useState<Pet | null>(null);
  const [isOtherTyping, setIsOtherTyping] = useState(false);
  let typingTimeout: NodeJS.Timeout | null = null;
  
  const flatListRef = useRef<FlatList>(null);
  const typingAnim = useRef(new Animated.Value(0)).current;

  // Cargar datos iniciales
  useEffect(() => {
    if (!matchId) {
      Alert.alert('Error', 'No se pudo identificar la conversación');
      router.back();
      return;
    }
    
    loadInitialData();
  }, [matchId]);
  
  // Suscribirse a nuevos mensajes y eventos "typing"
  useEffect(() => {
    if (!matchId) return;

    // Usar la nueva API de canales de Supabase para realtime
    const channel = supabase
      .channel('chat-messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `match_id=eq.${matchId}`,
        },
        (payload) => {
          const newMsg = payload.new as Message;
          setMessages(prev => {
            // Evitar duplicados por id
            if (prev.some(msg => msg.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
          // Marcar como leído si no es mío
          if (newMsg.sender_id !== userId) {
            markMessageAsRead(newMsg.id);
          }
          // Scroll al final
          setTimeout(() => {
            flatListRef.current?.scrollToEnd({ animated: true });
          }, 100);
        }
      )
      // Evento custom "typing"
      .on(
        'broadcast',
        { event: 'typing', },
        (payload) => {
          // Mostrar "escribiendo..." solo si el otro usuario es quien escribe
          if (payload.payload.sender_id !== userId) {
            setIsOtherTyping(true);
            // Ocultar después de 2 segundos si no hay más eventos
            if (typingTimeout) clearTimeout(typingTimeout);
            typingTimeout = setTimeout(() => setIsOtherTyping(false), 2000);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      if (typingTimeout) clearTimeout(typingTimeout);
    };
  }, [matchId, userId]);
  
  useEffect(() => {
    if (isOtherTyping) {
      Animated.loop(
        Animated.timing(typingAnim, {
          toValue: 1,
          duration: 1200,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
      ).start();
    } else {
      typingAnim.stopAnimation();
      typingAnim.setValue(0);
    }
  }, [isOtherTyping]);

  // Cargar datos iniciales
  const loadInitialData = async () => {
    try {
      setLoading(true);
      
      // Obtener la sesión del usuario
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        Alert.alert('Error', 'Debes iniciar sesión para usar el chat');
        router.back();
        return;
      }
      
      setUserId(session.user.id);
      
      // Cargar el match
      const { data: matchData, error: matchError } = await supabase
        .from('pet_matches')
        .select(`
          *,
          pet_1:pet_id_1(id, name, species, breed, age, description, image_url, owner_id),
          pet_2:pet_id_2(id, name, species, breed, age, description, image_url, owner_id)
        `)
        .eq('id', matchId)
        .eq('match_status', 'matched')
        .single();
      
      if (matchError) {
        console.error('Error al cargar match:', matchError);
        Alert.alert('Error', 'No se pudo cargar la conversación');
        router.back();
        return;
      }
      
      setMatch(matchData);
      
      // Determinar cuál es mi mascota y cuál es la otra
      if (matchData.pet_1?.owner_id === session.user.id) {
        setMyPet(matchData.pet_1);
        setOtherPet(matchData.pet_2);
      } else {
        setMyPet(matchData.pet_2);
        setOtherPet(matchData.pet_1);
      }
      
      // Cargar mensajes
      const { data: messagesData, error: messagesError } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('match_id', matchId)
        .order('created_at', { ascending: true });
      
      if (messagesError) {
        console.error('Error al cargar mensajes:', messagesError);
      } else {
        setMessages(messagesData || []);
        
        // Marcar mensajes no leídos como leídos
        const unreadMessages = messagesData?.filter(
          msg => !msg.read && msg.sender_id !== session.user.id
        );
        
        if (unreadMessages && unreadMessages.length > 0) {
          unreadMessages.forEach(msg => {
            markMessageAsRead(msg.id);
          });
        }
      }
    } catch (error) {
      console.error('Error al cargar datos:', error);
      Alert.alert('Error', 'Ocurrió un error al cargar la conversación');
    } finally {
      setLoading(false);
    }
  };
  
  // Marcar mensaje como leído
  const markMessageAsRead = async (messageId: string) => {
    try {
      await supabase
        .from('chat_messages')
        .update({ read: true })
        .eq('id', messageId);
    } catch (error) {
      console.error('Error al marcar mensaje como leído:', error);
    }
  };
  
  // Emitir evento "typing" al escribir
  const handleTyping = (text: string) => {
    setNewMessage(text);
    // Notificar al otro usuario que estoy escribiendo
    supabase.channel('chat-messages').send({
      type: 'broadcast',
      event: 'typing',
      payload: { sender_id: userId, match_id: matchId }
    });
  };
  
  // Enviar mensaje
  const sendMessage = async () => {
    if (!newMessage.trim() || !matchId || !userId) return;
    
    try {
      setSending(true);
      
      const { data, error } = await supabase
        .from('chat_messages')
        .insert({
          match_id: matchId,
          sender_id: userId,
          message: newMessage.trim(),
          read: false
        })
        .select()
        .single();
      
      if (error) throw error;
      
      // Mostrar el mensaje enviado inmediatamente
      if (data) {
        setMessages(prev => [...prev, data]);
      }
      setNewMessage('');
      
      // Scroll al final
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
      
    } catch (error: any) {
      console.error('Error al enviar mensaje:', error);
      Alert.alert('Error', `No se pudo enviar el mensaje: ${error.message}`);
    } finally {
      setSending(false);
    }
  };
  
  // Formatear fecha
  const formatMessageDate = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), {
        addSuffix: true,
        locale: es
      });
    } catch (error) {
      return '';
    }
  };
  
  // Renderizar un mensaje
  const renderMessage = ({ item }: { item: Message }) => {
    const isMyMessage = item.sender_id === userId;
    
    return (
      <View style={[
        styles.messageContainer,
        isMyMessage ? styles.myMessageContainer : styles.otherMessageContainer
      ]}>
        {!isMyMessage && (
          <Image
            source={{ uri: otherPet?.image_url || 'https://images.unsplash.com/photo-1543466835-00a7907e9de1' }}
            style={styles.messagePetImage}
          />
        )}
        <View style={[
          styles.messageBubble,
          isMyMessage ? styles.myMessageBubble : styles.otherMessageBubble
        ]}>
          <Text style={[
            styles.messageText,
            isMyMessage && styles.myMessageText
          ]}>{item.message}</Text>
          <Text style={[
            styles.messageTime,
            isMyMessage && styles.myMessageTime
          ]}>
            {formatMessageDate(item.created_at)}
            {isMyMessage && item.read && (
              <Text style={styles.readIndicator}> • Leído</Text>
            )}
          </Text>
        </View>
      </View>
    );
  };
  
  // Renderizar mensaje de bienvenida
  const renderWelcomeMessage = () => {
    if (messages.length > 0) return null;
    
    return (
      <View style={styles.welcomeContainer}>
        <View style={styles.matchIconContainer}>
          <Image
            source={{ uri: myPet?.image_url || 'https://images.unsplash.com/photo-1517849845537-4d257902454a' }}
            style={styles.matchIconImage}
          />
          <Image
            source={{ uri: otherPet?.image_url || 'https://images.unsplash.com/photo-1543466835-00a7907e9de1' }}
            style={[styles.matchIconImage, styles.matchIconImageRight]}
          />
        </View>
        <Text style={styles.welcomeTitle}>¡Es un match!</Text>
        <Text style={styles.welcomeText}>
          {myPet?.name} y {otherPet?.name} han hecho match. ¡Envía un mensaje para comenzar a chatear!
        </Text>
      </View>
    );
  };
  
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#ffbc4c" />
        <Text style={styles.loadingText}>Cargando conversación...</Text>
      </View>
    );
  }
  
  return (
    <SafeAreaView style={styles.container} edges={['top', 'right', 'left']}>
      {/* Cabecera */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.push("/(app)")}
        >
          <ArrowLeft size={24} color="#333" />
        </TouchableOpacity>
        
        <View style={styles.headerInfo}>
          <Image
            source={{ uri: otherPet?.image_url || 'https://images.unsplash.com/photo-1543466835-00a7907e9de1' }}
            style={styles.headerPetImage}
          />
          <View>
            <Text style={styles.headerPetName}>{otherPet?.name}</Text>
            <Text style={styles.headerPetBreed}>
              {otherPet?.species} {otherPet?.breed ? `• ${otherPet.breed}` : ''}
            </Text>
          </View>
        </View>
      </View>
      
      {/* Lista de mensajes */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={item => item.id}
        renderItem={renderMessage}
        contentContainerStyle={styles.messagesList}
        onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
        ListHeaderComponent={renderWelcomeMessage}
        ListEmptyComponent={!loading && (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No hay mensajes aún</Text>
          </View>
        )}
      />
      
      {isOtherTyping && (
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
          <Text style={{ color: '#888', fontStyle: 'italic', marginRight: 8 }}>Escribiendo</Text>
          {[0, 1, 2].map(i => (
            <Animated.Text
              key={i}
              style={{
                color: '#888',
                fontSize: 18,
                opacity: typingAnim.interpolate({
                  inputRange: [0, 0.2 + i * 0.2, 0.4 + i * 0.2, 1],
                  outputRange: [0.2, 1, 0.2, 0.2],
                }),
                marginHorizontal: 1,
                fontWeight: 'bold',
              }}>
              .
            </Animated.Text>
          ))}
        </View>
      )}
      
      {/* Input para enviar mensajes */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            value={newMessage}
            onChangeText={handleTyping}
            placeholder="Escribe un mensaje..."
            placeholderTextColor="#999"
            multiline
          />
          <TouchableOpacity
            style={[styles.sendButton, !newMessage.trim() && styles.sendButtonDisabled]}
            onPress={sendMessage}
            disabled={!newMessage.trim() || sending}
          >
            {sending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Send size={20} color="#fff" />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backButton: {
    marginRight: 15,
  },
  headerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerPetImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
  },
  headerPetName: {
    fontSize: 16,
    fontFamily: 'Inter_700Bold',
  },
  headerPetBreed: {
    fontSize: 12,
    color: '#666',
    fontFamily: 'Inter_400Regular',
  },
  messagesList: {
    padding: 15,
    paddingBottom: 20,
  },
  messageContainer: {
    flexDirection: 'row',
    marginBottom: 15,
    maxWidth: '80%',
  },
  myMessageContainer: {
    alignSelf: 'flex-end',
  },
  otherMessageContainer: {
    alignSelf: 'flex-start',
  },
  messagePetImage: {
    width: 30,
    height: 30,
    borderRadius: 15,
    marginRight: 8,
    alignSelf: 'flex-end',
  },
  messageBubble: {
    padding: 12,
    borderRadius: 18,
    maxWidth: '100%',
  },
  myMessageBubble: {
    backgroundColor: '#ffbc4c',
    borderBottomRightRadius: 4,
  },
  otherMessageBubble: {
    backgroundColor: '#fff',
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: '#333',
  },
  myMessageText: {
    color: '#fff',
  },
  messageTime: {
    fontSize: 10,
    color: '#666',
    marginTop: 4,
    alignSelf: 'flex-end',
    fontFamily: 'Inter_400Regular',
  },
  myMessageTime: {
    color: 'rgba(255, 255, 255, 0.8)',
  },
  readIndicator: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 10,
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 10,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  input: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    maxHeight: 100,
    fontFamily: 'Inter_400Regular',
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ffbc4c',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  sendButtonDisabled: {
    backgroundColor: '#ffbc4c99',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    color: '#999',
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
  },
  welcomeContainer: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
    alignItems: 'center',
  },
  matchIconContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 15,
  },
  matchIconImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: '#fff',
  },
  matchIconImageRight: {
    marginLeft: -20,
  },
  welcomeTitle: {
    fontSize: 20,
    fontFamily: 'Inter_700Bold',
    marginBottom: 10,
    color: '#ffbc4c',
  },
  welcomeText: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
});
