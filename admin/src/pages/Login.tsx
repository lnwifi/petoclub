import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  TextField,
  Button,
  Typography,
  Paper,
  Alert,
  InputAdornment,
  IconButton,
  CircularProgress
} from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState('');
  const { signIn, error, loading, resetError, isSigningIn, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (error) {
      setFormError(error);
      resetError();
    }
  }, [error, resetError]);

  useEffect(() => {
    if (!loading && !error && user) {
      navigate('/');
    }
  }, [loading, error, user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    
    // Basic validation
    if (!email) {
      setFormError('El correo electrónico es obligatorio');
      return;
    }
    if (!password) {
      setFormError('La contraseña es obligatoria');
      return;
    }

    try {
      await signIn(email, password);
    } catch (error: any) {
      console.error('Error al iniciar sesión:', error);
      setFormError(error.message || 'Error al iniciar sesión. Por favor, inténtalo nuevamente.');
    }
  };

  return (
    <Container component="main" maxWidth="xs">
      <Box
        sx={{
          marginTop: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Paper
          elevation={3}
          sx={{
            padding: 4,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            width: '100%',
            borderRadius: 2,
          }}
        >
          <Typography component="h1" variant="h5" color="primary" fontWeight="bold" mb={3}>
            PetoClub Admin
          </Typography>
          
          {formError && (
            <Alert severity="error" sx={{ width: '100%', mb: 2 }}>
              {formError}
            </Alert>
          )}
          
          <Box component="form" onSubmit={handleSubmit} noValidate sx={{ mt: 1, width: '100%' }}>
            <TextField
              margin="normal"
              required
              fullWidth
              id="email"
              label="Correo electrónico"
              name="email"
              autoComplete="email"
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={!!formError && !email}
              helperText={formError && !email ? formError : ''}
              disabled={isSigningIn}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              name="password"
              label="Contraseña"
              type={showPassword ? 'text' : 'password'}
              id="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={!!formError && !password}
              helperText={formError && !password ? formError : ''}
              disabled={isSigningIn}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label="toggle password visibility"
                      onClick={() => setShowPassword(!showPassword)}
                      edge="end"
                      disabled={isSigningIn}
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ mt: 3, mb: 2 }}
              disabled={isSigningIn}
              startIcon={isSigningIn ? <CircularProgress size={20} /> : undefined}
            >
              Iniciar sesión
            </Button>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
}