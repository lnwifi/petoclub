// Solo importar react-qr-reader si es web
import React from 'react';
import { Platform } from 'react-native';
import { Box, Button, Typography, Dialog } from '@mui/material';

let QrReader: any = null;
if (Platform.OS === 'web') {
  QrReader = require('react-qr-scanner').default;
}

export function validateQr(placeId: string, data: string | null) {
  if (!data) return { valid: false, error: 'No se detectó ningún QR' };
  if (!data.startsWith('PETOCLUB-LOCAL-')) {
    return { valid: false, error: 'QR inválido' };
  }
  const scannedPlaceId = data.replace('PETOCLUB-LOCAL-', '');
  if (scannedPlaceId !== placeId) {
    return { valid: false, error: 'El QR no corresponde a este local' };
  }
  return { valid: true, error: null };
}

export default function QrScannerWeb({ open, placeId, onSuccess, onClose }: {
  open: boolean;
  placeId: string;
  onSuccess: () => void;
  onClose: () => void;
}) {
  const [error, setError] = React.useState<string | null>(null);

  const handleScan = (data: string | null) => {
    const result = validateQr(placeId, data);
    if (!result.valid) {
      setError(result.error);
      return;
    }
    setError(null);
    onSuccess();
    onClose();
  };

  if (Platform.OS !== 'web') return null;

  return (
    <Dialog open={open} onClose={onClose}>
      <Box p={2}>
        <Typography variant="h6">Escanea el QR del local</Typography>
        {QrReader && (
          <QrReader
            delay={300}
            onError={() => setError('Error de cámara')}
            onScan={handleScan}
            style={{ width: '100%' }}
          />
        )}
        {error && <Typography color="error">{error}</Typography>}
        <Button onClick={onClose}>Cancelar</Button>
      </Box>
    </Dialog>
  );
}
