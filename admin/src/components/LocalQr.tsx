import React from 'react';
// --- INICIO FIX IMPORT QR ---
// Importación compatible con Vite y react-qr-code (usar import por defecto sin destructuring)
import QRCode from 'react-qr-code';
// --- FIN FIX IMPORT QR ---
import { Box, Typography, Button } from '@mui/material';
import { supabase } from '../lib/supabase';

interface LocalQrProps {
  placeId: string;
  qrUrl?: string | null;
  onQrUploaded?: (url: string) => void;
}

const qrPrefix = 'PETOCLUB-LOCAL-';

export default function LocalQr({ placeId, qrUrl, onQrUploaded }: LocalQrProps) {
  const [uploading, setUploading] = React.useState(false);
  const [uploadedUrl, setUploadedUrl] = React.useState<string | null>(qrUrl || null);

  const qrValue = `${qrPrefix}${placeId}`;

  // Subir QR a Supabase Storage y guardar URL
  const handleUpload = async () => {
    setUploading(true);
    try {
      const svg = document.getElementById('local-qr-svg');
      if (!(svg instanceof SVGSVGElement)) throw new Error('No SVG found');
      const serializer = new XMLSerializer();
      const source = serializer.serializeToString(svg);
      const blob = new Blob([source], { type: 'image/svg+xml' });
      const filePath = `${placeId}.svg`;
      // Subir a bucket locales-qr
      const { error } = await supabase.storage.from('locales-qr').upload(filePath, blob, { upsert: true, contentType: 'image/svg+xml' });
      if (error) throw error;
      // Obtener URL pública
      const { data } = supabase.storage.from('locales-qr').getPublicUrl(filePath);
      setUploadedUrl(data.publicUrl);
      if (onQrUploaded) onQrUploaded(data.publicUrl);
    } catch (e: any) {
      alert('Error al subir el QR: ' + (e.message || e.error_description || 'Error desconocido'));
    }
    setUploading(false);
  };

  return (
    <Box textAlign="center" my={3}>
      <Typography variant="h6" gutterBottom>
        QR para validar canje en el local
      </Typography>
      {uploadedUrl ? (
        <Box>
          <img src={uploadedUrl} alt="QR del local" style={{ background: 'white', padding: 16, width: 220, height: 220 }} />
          <Typography variant="body2" color="textSecondary" mt={2}>
            Este QR está guardado y disponible para el local.
          </Typography>
        </Box>
      ) : (
        <>
          <div style={{ background: 'white', padding: 16, display: 'inline-block' }}>
            <QRCode id="local-qr-svg" value={qrValue} size={220} />
          </div>
          <Box mt={2}>
            <Button variant="contained" color="primary" onClick={handleUpload} disabled={uploading}>
              {uploading ? 'Subiendo...' : 'Guardar QR en Supabase'}
            </Button>
          </Box>
          <Typography variant="body2" color="textSecondary" mt={2}>
            Guarda el QR para que siempre esté disponible para este local.
          </Typography>
        </>
      )}
    </Box>
  );
}
