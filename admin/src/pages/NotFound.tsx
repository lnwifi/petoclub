import { Box, Typography, Button } from '@mui/material';
import { Link } from 'react-router-dom';
import { SentimentDissatisfied as SadIcon } from '@mui/icons-material';

export default function NotFound() {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '80vh',
        textAlign: 'center',
        p: 3
      }}
    >
      <SadIcon sx={{ fontSize: 80, color: 'text.secondary', mb: 2 }} />
      <Typography variant="h3" gutterBottom fontWeight="bold">
        404
      </Typography>
      <Typography variant="h5" gutterBottom color="text.secondary">
        Página no encontrada
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4, maxWidth: 500 }}>
        Lo sentimos, la página que estás buscando no existe o ha sido movida.
      </Typography>
      <Button
        component={Link}
        to="/"
        variant="contained"
        color="primary"
        size="large"
      >
        Volver al inicio
      </Button>
    </Box>
  );
}