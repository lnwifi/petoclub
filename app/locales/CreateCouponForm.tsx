import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { supabase } from '../lib/supabase';

interface Props {
  placeId: string;
  onCreated: () => void;
  onCancel: () => void;
}

export default function CreateCouponForm({ placeId, onCreated, onCancel }: Props) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [discountPercentage, setDiscountPercentage] = useState('');
  const [discountAmount, setDiscountAmount] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!title || !description || (!discountPercentage && !discountAmount) || !expiresAt || !placeId) {
      Alert.alert('Completa todos los campos obligatorios');
      return;
    }
    setLoading(true);
    const { error } = await supabase.from('coupons').insert({
      title,
      description,
      discount_percentage: discountPercentage ? Number(discountPercentage) : null,
      discount_amount: discountAmount ? Number(discountAmount) : null,
      expires_at: expiresAt,
      valid_from: new Date().toISOString(),
      place_id: placeId,
    });
    setLoading(false);
    if (error) {
      Alert.alert('Error', error.message);
    } else {
      Alert.alert('Cupón creado');
      onCreated();
    }
  };

  return (
    <View style={styles.formContainer}>
      <Text style={styles.label}>Título *</Text>
      <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="Ej: 10% de descuento" />
      <Text style={styles.label}>Descripción *</Text>
      <TextInput style={styles.input} value={description} onChangeText={setDescription} placeholder="Describe el beneficio" />
      <Text style={styles.label}>Descuento (%)</Text>
      <TextInput style={styles.input} value={discountPercentage} onChangeText={setDiscountPercentage} placeholder="Ej: 10" keyboardType="numeric" />
      <Text style={styles.label}>Descuento ($)</Text>
      <TextInput style={styles.input} value={discountAmount} onChangeText={setDiscountAmount} placeholder="Ej: 100" keyboardType="numeric" />
      <Text style={styles.label}>Fecha de expiración *</Text>
      <TextInput style={styles.input} value={expiresAt} onChangeText={setExpiresAt} placeholder="YYYY-MM-DD" />
      <View style={{ flexDirection: 'row', marginTop: 18, gap: 10 }}>
        <TouchableOpacity style={styles.submitBtn} onPress={handleCreate} disabled={loading}>
          <Text style={styles.submitBtnText}>{loading ? 'Creando...' : 'Crear cupón'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.cancelBtn} onPress={onCancel} disabled={loading}>
          <Text style={styles.cancelBtnText}>Cancelar</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  formContainer: { backgroundColor: '#fff', padding: 22, borderRadius: 12, marginVertical: 14 },
  label: { marginTop: 10, fontWeight: 'bold', color: '#333' },
  input: { borderColor: '#ccc', borderWidth: 1, borderRadius: 6, padding: 8, marginTop: 4 },
  submitBtn: { backgroundColor: '#fbaa30', borderRadius: 8, padding: 14, alignItems: 'center', flex: 1 },
  submitBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  cancelBtn: { backgroundColor: '#eee', borderRadius: 8, padding: 14, alignItems: 'center', flex: 1 },
  cancelBtnText: { color: '#333', fontWeight: 'bold', fontSize: 16 },
});
