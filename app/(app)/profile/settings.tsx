import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Switch, Alert } from 'react-native';
import { Stack } from 'expo-router';
import { useAuth } from '../../../lib/auth-context';
import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';

export default function SettingsScreen() {
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [emailNotificationsEnabled, setEmailNotificationsEnabled] = useState(true);
  const [loading, setLoading] = useState(false);

  // Cargar datos del usuario
  useEffect(() => {
    if (user) {
      setName(user.user_metadata?.full_name || '');
      setEmail(user.email || '');
      
      // Cargar preferencias de notificaciones
      loadNotificationPreferences();
    }
  }, [user]);

  // Cargar preferencias de notificaciones
  const loadNotificationPreferences = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('notifications_enabled, email_notifications_enabled')
        .eq('user_id', user?.id)
        .single();
      
      if (error) {
        console.error('Error al cargar preferencias:', error);
        return;
      }
      
      if (data) {
        setNotificationsEnabled(data.notifications_enabled ?? true);
        setEmailNotificationsEnabled(data.email_notifications_enabled ?? true);
      }
    } catch (error) {
      console.error('Error inesperado:', error);
    }
  };

  // Guardar cambios
  const handleSaveChanges = async () => {
    try {
      setLoading(true);
      
      // Actualizar nombre en auth
      const { error: updateError } = await supabase.auth.updateUser({
        data: { full_name: name }
      });
      
      if (updateError) {
        Alert.alert('Error', 'No se pudo actualizar la información');
        console.error('Error al actualizar usuario:', updateError);
        return;
      }
      
      // Actualizar preferencias de notificaciones
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          notifications_enabled: notificationsEnabled,
          email_notifications_enabled: emailNotificationsEnabled
        })
        .eq('user_id', user?.id);
      
      if (profileError) {
        Alert.alert('Error', 'No se pudieron actualizar las preferencias de notificaciones');
        console.error('Error al actualizar perfil:', profileError);
        return;
      }
      
      Alert.alert('Éxito', 'Configuración actualizada correctamente');
    } catch (error) {
      console.error('Error inesperado:', error);
      Alert.alert('Error', 'Ocurrió un error inesperado');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Configuración',
          headerShown: true,
        }}
      />
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Información Personal</Text>
        
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Nombre completo</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Tu nombre completo"
          />
        </View>
        
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Email</Text>
          <TextInput
            style={[styles.input, { color: '#999' }]}
            value={email}
            editable={false}
          />
          <Text style={styles.inputHelp}>El email no se puede cambiar</Text>
        </View>
      </View>
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Notificaciones</Text>
        
        <View style={styles.switchContainer}>
          <View>
            <Text style={styles.switchLabel}>Notificaciones en la app</Text>
            <Text style={styles.switchDescription}>
              Recibe notificaciones sobre actualizaciones de pedidos y ofertas
            </Text>
          </View>
          <Switch
            value={notificationsEnabled}
            onValueChange={setNotificationsEnabled}
            trackColor={{ false: '#ddd', true: '#ffbc4c' }}
            thumbColor="#fff"
          />
        </View>
        
        <View style={styles.switchContainer}>
          <View>
            <Text style={styles.switchLabel}>Notificaciones por email</Text>
            <Text style={styles.switchDescription}>
              Recibe emails sobre actualizaciones de pedidos y ofertas
            </Text>
          </View>
          <Switch
            value={emailNotificationsEnabled}
            onValueChange={setEmailNotificationsEnabled}
            trackColor={{ false: '#ddd', true: '#ffbc4c' }}
            thumbColor="#fff"
          />
        </View>
      </View>
      
      <TouchableOpacity
        style={styles.saveButton}
        onPress={handleSaveChanges}
        disabled={loading}
      >
        <Text style={styles.saveButtonText}>
          {loading ? 'Guardando...' : 'Guardar Cambios'}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  section: {
    margin: 16,
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter_700Bold',
    color: '#333',
    marginBottom: 16,
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    color: '#666',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
  },
  inputHelp: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: '#999',
    marginTop: 4,
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  switchLabel: {
    fontSize: 16,
    fontFamily: 'Inter_500Medium',
    color: '#333',
    marginBottom: 4,
  },
  switchDescription: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: '#666',
    maxWidth: '80%',
  },
  saveButton: {
    margin: 16,
    backgroundColor: '#ffbc4c',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
  },
});
