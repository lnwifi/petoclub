import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Grid,
  Avatar,
  CircularProgress,
  Snackbar,
  Alert,
  Chip,
  Tooltip
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  Star as StarIcon
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';

// Tipo para los refugios
type Pet = {
  id: string;
  name: string;
  image: string;
  description: string;
  age: string;
  size: string;
};

type UrgentCause = {
  id: string;
  title: string;
  description: string;
  goal: number;
  current: number;
};

type Refugio = {
  id: string;
  name: string;
  image: string;
  rating: number;
  address: string;
  phone: string;
  description: string;
  email?: string;
  bankAccount?: string;
  pets: Pet[];
  urgentCauses: UrgentCause[];
};

export default function Refugios() {
  const { supabase } = useAuth();
  const [refugios, setRefugios] = useState<Refugio[]>([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [openViewDialog, setOpenViewDialog] = useState(false);
  const [currentRefugio, setCurrentRefugio] = useState<Refugio | null>(null);
  const [formData, setFormData] = useState<Partial<Refugio>>({
    name: '',
    description: '',
    address: '',
    phone: '',
    email: '',
    bankAccount: '',
    image: ''
  });
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error' | 'info' | 'warning'
  });

  // Cargar refugios
  useEffect(() => {
    const fetchRefugios = async () => {
      try {
        setLoading(true);
        // En una implementación real, esto vendría de la base de datos
        // Aquí usamos datos de ejemplo similares a los de la app móvil
        const mockRefugios: Refugio[] = [
          {
            id: '1',
            name: 'Refugio Patitas Felices',
            image: 'https://images.unsplash.com/photo-1548199973-03cce0bbc87b',
            rating: 4.9,
            address: 'Av. Libertador 1234',
            phone: '+54 11 1234 5678',
            description: 'Refugio dedicado a perros y gatos abandonados. Ofrecemos adopción responsable.',
            email: 'contacto@patitasfelices.org',
            bankAccount: 'Banco Nación: 0000-1111-2222',
            pets: [
              {
                id: 'p1',
                name: 'Luna',
                image: 'https://images.unsplash.com/photo-1543466835-00a7907e9de1',
                description: 'Perrita dulce y juguetona',
                age: '2 años',
                size: 'Mediano'
              },
              {
                id: 'p2',
                name: 'Simba',
                image: 'https://images.unsplash.com/photo-1573865526739-10659fec78a5',
                description: 'Gatito muy cariñoso',
                age: '6 meses',
                size: 'Pequeño'
              }
            ],
            urgentCauses: [
              {
                id: 'c1',
                title: 'Alimentos para el invierno',
                description: 'Necesitamos juntar alimentos para nuestros peludos',
                goal: 50000,
                current: 25000
              }
            ]
          },
          {
            id: '2',
            name: 'Hogar de Mascotas',
            image: 'https://images.unsplash.com/photo-1601758124510-52d02ddb7cbd',
            rating: 4.7,
            address: 'Calle San Martín 567',
            phone: '+54 11 8765 4321',
            description: 'Rescatamos animales en situación de calle y les buscamos un hogar amoroso.',
            email: 'info@hogardemascotas.org',
            bankAccount: 'Banco Provincia: 3333-4444-5555',
            pets: [
              {
                id: 'p3',
                name: 'Rocky',
                image: 'https://images.unsplash.com/photo-1587300003388-59208cc962cb',
                description: 'Perro adulto muy tranquilo',
                age: '5 años',
                size: 'Grande'
              }
            ],
            urgentCauses: [
              {
                id: 'c2',
                title: 'Campaña de vacunación',
                description: 'Ayudanos a vacunar a todos nuestros rescatados',
                goal: 30000,
                current: 15000
              }
            ]
          },
          {
            id: '3',
            name: 'Refugio Huellitas',
            image: 'https://images.unsplash.com/photo-1541781774459-bb2af2f05b55',
            rating: 4.8,
            address: 'Av. Rivadavia 890',
            phone: '+54 11 2468 1357',
            description: 'Más de 10 años rescatando y rehabilitando animales para darlos en adopción.',
            email: 'contacto@huellitas.org',
            bankAccount: 'Banco Galicia: 6666-7777-8888',
            pets: [
              {
                id: 'p4',
                name: 'Milo',
                image: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba',
                description: 'Gatito juguetón',
                age: '1 año',
                size: 'Pequeño'
              }
            ],
            urgentCauses: [
              {
                id: 'c3',
                title: 'Reparación del refugio',
                description: 'Necesitamos arreglar techos y paredes',
                goal: 100000,
                current: 45000
              }
            ]
          },
        ];

        setRefugios(mockRefugios);
      } catch (error) {
        console.error('Error al cargar refugios:', error);
        setSnackbar({
          open: true,
          message: 'Error al cargar los refugios',
          severity: 'error'
        });
      } finally {
        setLoading(false);
      }
    };

    fetchRefugios();
  }, [supabase]);

  // Manejar apertura del diálogo de creación/edición
  const handleOpenDialog = (refugio?: Refugio) => {
    if (refugio) {
      setCurrentRefugio(refugio);
      setFormData({
        name: refugio.name,
        description: refugio.description,
        address: refugio.address,
        phone: refugio.phone,
        email: refugio.email || '',
        bankAccount: refugio.bankAccount || '',
        image: refugio.image
      });
    } else {
      setCurrentRefugio(null);
      setFormData({
        name: '',
        description: '',
        address: '',
        phone: '',
        email: '',
        bankAccount: '',
        image: ''
      });
    }
    setOpenDialog(true);
  };

  // Manejar cierre del diálogo
  const handleCloseDialog = () => {
    setOpenDialog(false);
  };

  // Manejar cambios en el formulario
  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Manejar envío del formulario
  const handleSubmit = async () => {
    try {
      // Validar campos obligatorios
      if (!formData.name || !formData.description || !formData.address || !formData.phone) {
        setSnackbar({
          open: true,
          message: 'Por favor complete todos los campos obligatorios',
          severity: 'error'
        });
        return;
      }

      // En una implementación real, aquí se enviaría a la base de datos
      if (currentRefugio) {
        // Actualizar refugio existente
        const updatedRefugios = refugios.map(r => 
          r.id === currentRefugio.id ? 
          { 
            ...r, 
            name: formData.name || r.name,
            description: formData.description || r.description,
            address: formData.address || r.address,
            phone: formData.phone || r.phone,
            email: formData.email,
            bankAccount: formData.bankAccount,
            image: formData.image || r.image
          } : r
        );
        setRefugios(updatedRefugios);
        setSnackbar({
          open: true,
          message: 'Refugio actualizado correctamente',
          severity: 'success'
        });
      } else {
        // Crear nuevo refugio
        const newRefugio: Refugio = {
          id: `${Date.now()}`, // Generar ID temporal
          name: formData.name || '',
          description: formData.description || '',
          address: formData.address || '',
          phone: formData.phone || '',
          email: formData.email,
          bankAccount: formData.bankAccount,
          image: formData.image || 'https://images.unsplash.com/photo-1548199973-03cce0bbc87b',
          rating: 5.0,
          pets: [],
          urgentCauses: []
        };
        setRefugios([...refugios, newRefugio]);
        setSnackbar({
          open: true,
          message: 'Refugio creado correctamente',
          severity: 'success'
        });
      }

      handleCloseDialog();
    } catch (error) {
      console.error('Error al guardar refugio:', error);
      setSnackbar({
        open: true,
        message: 'Error al guardar el refugio',
        severity: 'error'
      });
    }
  };

  // Manejar apertura del diálogo de eliminación
  const handleOpenDeleteDialog = (refugio: Refugio) => {
    setCurrentRefugio(refugio);
    setOpenDeleteDialog(true);
  };

  // Manejar cierre del diálogo de eliminación
  const handleCloseDeleteDialog = () => {
    setOpenDeleteDialog(false);
  };

  // Manejar eliminación de refugio
  const handleDeleteRefugio = () => {
    try {
      if (currentRefugio) {
        // En una implementación real, aquí se eliminaría de la base de datos
        const updatedRefugios = refugios.filter(r => r.id !== currentRefugio.id);
        setRefugios(updatedRefugios);
        setSnackbar({
          open: true,
          message: 'Refugio eliminado correctamente',
          severity: 'success'
        });
      }
      handleCloseDeleteDialog();
    } catch (error) {
      console.error('Error al eliminar refugio:', error);
      setSnackbar({
        open: true,
        message: 'Error al eliminar el refugio',
        severity: 'error'
      });
    }
  };

  // Manejar apertura del diálogo de visualización
  const handleOpenViewDialog = (refugio: Refugio) => {
    setCurrentRefugio(refugio);
    setOpenViewDialog(true);
  };

  // Manejar cierre del diálogo de visualización
  const handleCloseViewDialog = () => {
    setOpenViewDialog(false);
  };

  // Manejar cierre del snackbar
  const handleCloseSnackbar = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ flexGrow: 1 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" gutterBottom fontWeight="600">
          Refugios
        </Typography>
        <Button 
          variant="contained" 
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
        >
          Nuevo Refugio
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table sx={{ minWidth: 650 }}>
          <TableHead>
            <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
              <TableCell>Imagen</TableCell>
              <TableCell>Nombre</TableCell>
              <TableCell>Dirección</TableCell>
              <TableCell>Teléfono</TableCell>
              <TableCell>Valoración</TableCell>
              <TableCell>Mascotas</TableCell>
              <TableCell align="center">Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {refugios.map((refugio) => (
              <TableRow key={refugio.id}>
                <TableCell>
                  <Avatar 
                    src={refugio.image} 
                    alt={refugio.name}
                    variant="rounded"
                    sx={{ width: 60, height: 60 }}
                  />
                </TableCell>
                <TableCell>{refugio.name}</TableCell>
                <TableCell>{refugio.address}</TableCell>
                <TableCell>{refugio.phone}</TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <StarIcon sx={{ color: '#FFD700', mr: 0.5 }} />
                    <Typography>{refugio.rating}</Typography>
                  </Box>
                </TableCell>
                <TableCell>
                  <Chip 
                    label={`${refugio.pets.length} mascotas`} 
                    color="primary" 
                    variant="outlined" 
                  />
                </TableCell>
                <TableCell align="center">
                  <Tooltip title="Ver detalles">
                    <IconButton onClick={() => handleOpenViewDialog(refugio)}>
                      <ViewIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Editar">
                    <IconButton onClick={() => handleOpenDialog(refugio)}>
                      <EditIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Eliminar">
                    <IconButton onClick={() => handleOpenDeleteDialog(refugio)}>
                      <DeleteIcon />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Diálogo de creación/edición */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {currentRefugio ? `Editar ${currentRefugio.name}` : 'Crear Nuevo Refugio'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                name="name"
                label="Nombre del refugio *"
                fullWidth
                value={formData.name}
                onChange={handleFormChange}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                name="description"
                label="Descripción *"
                fullWidth
                multiline
                rows={3}
                value={formData.description}
                onChange={handleFormChange}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                name="address"
                label="Dirección *"
                fullWidth
                value={formData.address}
                onChange={handleFormChange}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                name="phone"
                label="Teléfono *"
                fullWidth
                value={formData.phone}
                onChange={handleFormChange}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                name="email"
                label="Correo electrónico"
                fullWidth
                value={formData.email}
                onChange={handleFormChange}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                name="bankAccount"
                label="Cuenta bancaria"
                fullWidth
                value={formData.bankAccount}
                onChange={handleFormChange}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                name="image"
                label="URL de la imagen"
                fullWidth
                value={formData.image}
                onChange={handleFormChange}
                helperText="Ingrese la URL de una imagen para el refugio"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancelar</Button>
          <Button onClick={handleSubmit} variant="contained">
            {currentRefugio ? 'Actualizar' : 'Crear'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Diálogo de eliminación */}
      <Dialog open={openDeleteDialog} onClose={handleCloseDeleteDialog}>
        <DialogTitle>Confirmar eliminación</DialogTitle>
        <DialogContent>
          <Typography>
            ¿Está seguro que desea eliminar el refugio "{currentRefugio?.name}"? Esta acción no se puede deshacer.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDeleteDialog}>Cancelar</Button>
          <Button onClick={handleDeleteRefugio} color="error" variant="contained">
            Eliminar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Diálogo de visualización */}
      <Dialog open={openViewDialog} onClose={handleCloseViewDialog} maxWidth="md" fullWidth>
        <DialogTitle>{currentRefugio?.name}</DialogTitle>
        <DialogContent>
          {currentRefugio && (
            <Grid container spacing={3}>
              <Grid item xs={12} md={4}>
                <img 
                  src={currentRefugio.image} 
                  alt={currentRefugio.name} 
                  style={{ width: '100%', borderRadius: '8px' }} 
                />
              </Grid>
              <Grid item xs={12} md={8}>
                <Typography variant="h6" gutterBottom>Información</Typography>
                <Typography paragraph>{currentRefugio.description}</Typography>
                
                <Typography variant="subtitle1" fontWeight="bold">Dirección:</Typography>
                <Typography paragraph>{currentRefugio.address}</Typography>
                
                <Typography variant="subtitle1" fontWeight="bold">Contacto:</Typography>
                <Typography paragraph>
                  Teléfono: {currentRefugio.phone}<br />
                  Email: {currentRefugio.email || 'No disponible'}
                </Typography>
                
                <Typography variant="subtitle1" fontWeight="bold">Datos bancarios:</Typography>
                <Typography paragraph>{currentRefugio.bankAccount || 'No disponible'}</Typography>
              </Grid>
              
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>Mascotas ({currentRefugio.pets.length})</Typography>
                <Grid container spacing={2}>
                  {currentRefugio.pets.map(pet => (
                    <Grid item xs={12} sm={6} md={4} key={pet.id}>
                      <Paper sx={{ p: 2, display: 'flex', alignItems: 'center' }}>
                        <Avatar 
                          src={pet.image} 
                          alt={pet.name} 
                          sx={{ width: 60, height: 60, mr: 2 }} 
                          variant="rounded"
                        />
                        <Box>
                          <Typography variant="subtitle1" fontWeight="bold">{pet.name}</Typography>
                          <Typography variant="body2">{pet.age} · {pet.size}</Typography>
                        </Box>
                      </Paper>
                    </Grid>
                  ))}
                </Grid>
              </Grid>
              
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>Causas urgentes</Typography>
                <Grid container spacing={2}>
                  {currentRefugio.urgentCauses.map(cause => (
                    <Grid item xs={12} key={cause.id}>
                      <Paper sx={{ p: 2 }}>
                        <Typography variant="subtitle1" fontWeight="bold">{cause.title}</Typography>
                        <Typography paragraph>{cause.description}</Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                          <Box 
                            sx={{ 
                              flexGrow: 1, 
                              bgcolor: '#eee', 
                              borderRadius: 1, 
                              mr: 2, 
                              height: 10, 
                              position: 'relative' 
                            }}
                          >
                            <Box 
                              sx={{ 
                                position: 'absolute', 
                                left: 0, 
                                top: 0, 
                                bottom: 0, 
                                bgcolor: 'primary.main', 
                                borderRadius: 1,
                                width: `${(cause.current / cause.goal) * 100}%`
                              }} 
                            />
                          </Box>
                          <Typography variant="body2">
                            ${cause.current} de ${cause.goal}
                          </Typography>
                        </Box>
                      </Paper>
                    </Grid>
                  ))}
                </Grid>
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseViewDialog}>Cerrar</Button>
          <Button 
            onClick={() => {
              handleCloseViewDialog();
              if (currentRefugio) {
                handleOpenDialog(currentRefugio);
              }
            }} 
            variant="contained"
          >
            Editar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar para notificaciones */}
      <Snackbar 
        open={snackbar.open} 
        autoHideDuration={6000} 
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}