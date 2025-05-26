import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, StyleSheet, Alert, Modal } from 'react-native';
import { supabase } from '../lib/supabase';

interface Props {
  visible: boolean;
  placeId: string;
  onClose: () => void;
}

export default function ManualCouponValidationModal({ visible, placeId, onClose }: Props) {
  const [redeemCode, setRedeemCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleValidate = async () => {
    if (!redeemCode) {
      Alert.alert('Ingresa el código de canje');
      return;
    }
    setLoading(true);
    setResult(null);
    const { data, error } = await supabase.rpc('validate_coupon_code', {
      place_id: placeId,
      redeem_code: redeemCode,
    });
    setLoading(false);
    if (error) {
      setResult({ success: false, message: error.message });
    } else if (data && data.valid) {
      setResult({ success: true, message: data.message || '¡Cupón canjeado con éxito!' });
    } else {
      setResult({ success: false, message: data?.message || 'Código inválido o expirado.' });
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modalBox}>
          <Text style={styles.title}>Validar cupón manualmente</Text>
          <TextInput
            style={styles.input}
            value={redeemCode}
            onChangeText={setRedeemCode}
            placeholder="Código de canje"
            autoCapitalize="characters"
          />
          <TouchableOpacity style={styles.validateBtn} onPress={handleValidate} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.validateBtnText}>Validar</Text>}
          </TouchableOpacity>
          {result && (
            <Text style={{ color: result.success ? 'green' : 'red', marginTop: 12 }}>{result.message}</Text>
          )}
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeBtnText}>Cerrar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center' },
  modalBox: { backgroundColor: '#fff', borderRadius: 18, padding: 28, width: 340, maxWidth: '90%' },
  title: { fontSize: 20, fontWeight: 'bold', marginBottom: 18, textAlign: 'center', color: '#222' },
  input: { borderColor: '#ccc', borderWidth: 1, borderRadius: 8, padding: 10, marginBottom: 12 },
  validateBtn: { backgroundColor: '#fbaa30', borderRadius: 8, padding: 14, alignItems: 'center', marginTop: 8 },
  validateBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  closeBtn: { backgroundColor: '#eee', borderRadius: 8, padding: 14, alignItems: 'center', marginTop: 16 },
  closeBtnText: { color: '#222', fontWeight: 'bold', fontSize: 16 },
});
