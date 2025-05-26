import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Box, TextField, Button, Typography, Alert } from '@mui/material';

export default function CreateLocalUser({ onCreated }: { onCreated?: () => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [placeId, setPlaceId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleCreate = async () => {
    setError(null);
    setSuccess(null);
    if (!email || !password || !placeId) {
      setError('Completa todos los campos');
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.admin.createUser({
      email,
      password,
      user_metadata: { place_id: placeId },
    });
    setLoading(false);
    if (error) {
      setError(error.message);
    } else {
      setSuccess('Usuario creado correctamente. El local ya puede iniciar sesión en /locales');
      setEmail('');
      setPassword('');
      setPlaceId('');
      if (onCreated) onCreated();
    }
  };

  return (
    <Box sx={{ p: 2, minWidth: 320 }}>
      <Typography variant="h6" mb={1}>Crear usuario de local</Typography>
      {error && <Alert severity="error" sx={{ mb: 1 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 1 }}>{success}</Alert>}
      <TextField
        label="Email del local"
        fullWidth
        value={email}
        onChange={e => setEmail(e.target.value)}
        margin="dense"
        type="email"
      />
      <TextField
        label="Contraseña"
        fullWidth
        value={password}
        onChange={e => setPassword(e.target.value)}
        margin="dense"
        type="password"
      />
      <TextField
        label="ID del local (place_id)"
        fullWidth
        value={placeId}
        onChange={e => setPlaceId(e.target.value)}
        margin="dense"
      />
      <Button
        variant="contained"
        color="primary"
        onClick={handleCreate}
        disabled={loading}
        sx={{ mt: 2 }}
        fullWidth
      >
        {loading ? 'Creando...' : 'Crear usuario'}
      </Button>
    </Box>
  );
}
