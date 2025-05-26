import React, { useEffect, useState } from 'react';
import { View, Text, Button, StyleSheet, Platform } from 'react-native';
import { BarCodeScanner } from 'expo-barcode-scanner';

export default function QrScannerExpo({ open, placeId, onSuccess, onClose }: {
  open: boolean;
  placeId: string;
  onSuccess: () => void;
  onClose: () => void;
}) {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanned, setScanned] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (Platform.OS !== 'web') {
      BarCodeScanner.requestPermissionsAsync().then(({ status }) => {
        setHasPermission(status === 'granted');
      });
    }
  }, []);

  const handleBarCodeScanned = ({ data }: { data: string }) => {
    if (!data.startsWith('PETOCLUB-LOCAL-')) {
      setError('QR inválido');
      return;
    }
    const scannedPlaceId = data.replace('PETOCLUB-LOCAL-', '');
    if (scannedPlaceId !== placeId) {
      setError('El QR no corresponde a este local');
      return;
    }
    setError(null);
    setScanned(true);
    onSuccess();
    onClose();
  };

  if (!open || Platform.OS === 'web') return null;

  if (hasPermission === null) {
    return <Text>Solicitando permiso de cámara...</Text>;
  }
  if (hasPermission === false) {
    return <Text>No se tiene acceso a la cámara</Text>;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Escanea el QR del local</Text>
      <BarCodeScanner
        onBarCodeScanned={scanned ? undefined : handleBarCodeScanned}
        style={{ width: 250, height: 250 }}
      />
      {error && <Text style={{ color: 'red', marginTop: 8 }}>{error}</Text>}
      <Button title="Cancelar" onPress={onClose} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, alignItems: 'center' },
  label: { fontWeight: 'bold', marginBottom: 8 },
});
