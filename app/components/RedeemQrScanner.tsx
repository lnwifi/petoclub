import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { BarCodeScanner } from 'expo-barcode-scanner';

interface RedeemQrScannerProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: (qrData: string) => void;
}

export default function RedeemQrScanner({ visible, onClose, onSuccess }: RedeemQrScannerProps) {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanned, setScanned] = useState(false);

  useEffect(() => {
    if (visible) {
      setScanned(false);
      (async () => {
        const { status } = await BarCodeScanner.requestPermissionsAsync();
        setHasPermission(status === 'granted');
      })();
    }
  }, [visible]);

  const handleBarCodeScanned = ({ data }: { data: string }) => {
    setScanned(true);
    onSuccess(data);
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        <Text style={styles.title}>Escanea el QR del local</Text>
        {hasPermission === null ? (
          <ActivityIndicator size="large" color="#fbaa30" />
        ) : hasPermission === false ? (
          <Text>No se ha concedido permiso para la cámara</Text>
        ) : (
          <BarCodeScanner
            onBarCodeScanned={scanned ? undefined : handleBarCodeScanned}
            style={styles.scanner}
          />
        )}
        <TouchableOpacity onPress={onClose} style={styles.cancelBtn}>
          <Text style={styles.cancelText}>Cancelar</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 18,
    color: '#fbaa30',
  },
  scanner: {
    width: '100%',
    height: 350,
    borderRadius: 18,
    overflow: 'hidden',
    marginBottom: 24,
  },
  cancelBtn: {
    marginTop: 16,
    backgroundColor: '#eee',
    paddingVertical: 10,
    paddingHorizontal: 34,
    borderRadius: 18,
  },
  cancelText: {
    color: '#222',
    fontWeight: '600',
    fontSize: 16,
  },
});
