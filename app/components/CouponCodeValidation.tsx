import React, { useState } from 'react';
import { Platform, View, Text, TextInput, Button, StyleSheet, ActivityIndicator } from 'react-native';
import { supabase } from '../lib/supabase';

interface Props {
  placeId: string;
  userId: string;
  couponId: string;
  onSuccess: () => void;
}

export default function CouponCodeValidation({ placeId, userId, couponId, onSuccess }: Props) {
  const [redeemCode, setRedeemCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleValidateCode = async () => {
    setLoading(true);
    setResult(null);
    const { data, error } = await supabase.rpc('validate_coupon_code', {
      place_id: placeId,
      user_id: userId,
      coupon_id: couponId,
      redeem_code: redeemCode,
    });
    setLoading(false);
    if (error) {
      setResult({ success: false, message: error.message });
      return;
    }
    if (data && data.valid) {
      setResult({ success: true, message: data.message || '¡Cupón canjeado con éxito!' });
      onSuccess();
    } else {
      setResult({ success: false, message: data?.message || 'Código inválido o expirado.' });
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Ingrese el código de canje:</Text>
      <TextInput
        style={styles.input}
        value={redeemCode}
        onChangeText={setRedeemCode}
        placeholder="Código de canje"
        autoCapitalize="characters"
      />
      <Button title="Validar código" onPress={handleValidateCode} disabled={loading || !redeemCode} />
      {loading && <ActivityIndicator style={{ marginTop: 16 }} />}
      {result && (
        <Text style={{ color: result.success ? 'green' : 'red', marginTop: 16 }}>{result.message}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, alignItems: 'center' },
  label: { fontWeight: 'bold', marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 8,
    marginBottom: 12,
    width: Platform.OS === 'web' ? 320 : '100%',
    borderRadius: 4,
    backgroundColor: '#fff',
  },
});
