import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';

interface RedeemCodeModalProps {
  visible: boolean;
  code: string;
  onScanQr: () => void;
  onClose: () => void;
}

export default function RedeemCodeModal({ visible, code, onScanQr, onClose }: RedeemCodeModalProps) {
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modalBox}>
          <Text style={styles.title}>¡Código generado!</Text>
          <Text style={styles.code}>{code}</Text>
          <Text style={styles.instruction}>Escanea el QR del local para realizar el canje!</Text>
          <TouchableOpacity style={styles.scanBtn} onPress={onScanQr}>
            <Text style={styles.scanBtnText}>Escanear QR del negocio</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeBtnText}>Cerrar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBox: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 28,
    alignItems: 'center',
    width: 320,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 5,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fbaa30',
    marginBottom: 14,
  },
  code: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#222',
    letterSpacing: 2,
    marginBottom: 20,
  },
  instruction: {
    color: '#555',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 16,
  },
  scanBtn: {
    backgroundColor: '#4BB543',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 28,
    marginBottom: 14,
  },
  scanBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  closeBtn: {
    marginTop: 4,
    paddingVertical: 8,
    paddingHorizontal: 18,
  },
  closeBtnText: {
    color: '#888',
    fontSize: 15,
  },
});
