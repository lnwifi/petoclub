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
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Tooltip,
  FormHelperText
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  PhotoCamera as PhotoIcon
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';

// Tipo para las mascotas
type Pet = {
  id: string;
  name: string;
  image_url: string;
  description: string;
  age: string;
  species: string;
  breed: string;
  owner_id: string;
  owner_email: string;
  created_at?: string;
  updated_at?: string;
};

// Tipo para los propietarios
type Owner = {
  user_id: string;
  email: string;
};

// Estado inicial del formulario
// FormData solo debe tener owner_id, no owner_email
type FormData = {
  name: string;
  image_url: string;
  description: string;
  age: string;
  species: string;
  breed: string;
  owner_id: string;
};

export default function Mascotas() {
  const { supabase, isAdmin, user } = useAuth();
  const [pets, setPets] = useState<Pet[]>([]);
  const [owners, setOwners] = useState<Owner[]>([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [openViewDialog, setOpenViewDialog] = useState(false);
  const [currentPet, setCurrentPet] = useState<Pet | null>(null);
  const initialFormData: FormData = {
    name: '',
    image_url: '',
    description: '',
    age: '',
    species: '',
    breed: '',
    owner_id: ''
  };
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });

  useEffect(() => {
    const loadAllData = async () => {
      setLoading(true);
      try {
        // Para admins: cargar todos los perfiles
        const { data: users, error: usersError } = await supabase
          .from('profiles')
          .select('user_id, email')
          .order('email');
        
        if (usersError) throw usersError;
        const owners = isAdmin 
          ? users || [] 
          : user ? [{ user_id: user.id, email: user.email }] : [];
        setOwners(owners);

        // Cargar mascotas
        const { data: petsData, error: petsError } = await supabase
          .from('pets')
          .select('*')
          .order('name');
        
        if (petsError) throw petsError;
        
        // Para admins, mostrar todas las mascotas
        const filteredPets = isAdmin 
          ? petsData || [] 
          : petsData?.filter(pet => pet.owner_id === user?.id) || [];

        // Mapping robusto
        const ownersMap = new Map(owners.map(o => [o.user_id, o.email]));
        const petsWithOwnerEmail = filteredPets.map(pet => ({
          ...pet,
          owner_email: ownersMap.get(pet.owner_id) || 'Desconocido'
        }));
        
        setPets(petsWithOwnerEmail);
      } catch (error) {
        console.error('Error al cargar datos:', error);
        setSnackbar({
          open: true,
          message: 'Error al cargar datos. Por favor, inténtalo de nuevo.',
          severity: 'error'
        });
      } finally {
        setLoading(false);
      }
    };
    loadAllData();
  }, [supabase, isAdmin, user]);

  // Manejar apertura del diálogo de creación/edición
  const handleOpenDialog = async (pet?: Pet) => {
    try {
      // Verificar sesión antes de continuar
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        throw sessionError;
      }

      if (!session?.user?.id) {
        throw new Error('No hay sesión activa');
      }

      // Asegurarse de que hay propietarios cargados
      if (owners.length === 0) {
        const { data: users, error } = await supabase
          .from('profiles')
          .select('user_id, email')
          .order('email');

        if (error) {
          console.error('Error al cargar propietarios:', error);
          throw error;
        }

        const filteredOwners = isAdmin 
          ? users || [] 
          : user ? [{ user_id: user.id, email: user.email }] : [];
        
        setOwners(filteredOwners);
      }

      if (pet) {
        const owner = owners.find(o => o.user_id === pet.owner_id);
        console.log('Editando mascota:', pet.name, 'owner_id:', pet.owner_id, 'encontrado:', !!owner, 'owners:', owners.map(o => o.user_id));
        if (!owner) {
          console.warn('Propietario no encontrado para la mascota:', pet);
        }

        setCurrentPet(pet);
        setFormData({
          name: pet.name,
          image_url: pet.image_url,
          description: pet.description,
          age: pet.age,
          species: pet.species,
          breed: pet.breed,
          owner_id: owner ? owner.user_id : ''
        });
      } else {
        setCurrentPet(null);
        setFormData({
          name: '',
          image_url: '',
          description: '',
          age: '',
          species: '',
          breed: '',
          owner_id: '' // Dejar vacío por defecto, se llenará cuando elijan un propietario
        });
      }
      setOpenDialog(true);
    } catch (error) {
      console.error('Error al abrir el diálogo:', error);
      setSnackbar({
        open: true,
        message: error instanceof Error ? error.message : 'Error al abrir el diálogo',
        severity: 'error'
      });
    }
  };

  // Manejar cambios en el formulario
  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | { name?: string; value: unknown }>) => {
    const name = e.target.name as string;
    const value = e.target.value as string;
    
    // Si es el select de owner_id, validar que existe en la lista
    if (name === 'owner_id') {
      const owner = owners.find(o => o.user_id === value);
      if (owner) {
        setFormData(prev => ({ ...prev, owner_id: value }));
      } else {
        setSnackbar({
          open: true,
          message: 'El propietario seleccionado no es válido',
          severity: 'error'
        });
      }
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  // Manejar envío del formulario
  const handleSubmit = async () => {
    try {
      // Validar campos obligatorios
      if (!formData.name || !formData.species) {
        setSnackbar({
          open: true,
          message: 'Por favor complete todos los campos obligatorios',
          severity: 'error'
        });
        return;
      }

      // Verificar sesión antes de hacer cambios
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        throw new Error(`Error de autenticación: ${sessionError.message}`);
      }
      if (!session?.user?.id) {
        throw new Error('No hay sesión activa. Por favor, inicie sesión.');
      }

      // Verificar que el owner_id es válido
      const owner = owners.find(o => o.user_id === formData.owner_id);
      if (!owner) {
        throw new Error('El propietario seleccionado no es válido');
      }

      console.log('Datos a enviar:', {
        name: formData.name,
        description: formData.description,
        age: formData.age,
        species: formData.species,
        breed: formData.breed,
        image_url: formData.image_url,
        owner_id: formData.owner_id
      });

      if (currentPet) {
        // Actualizar mascota existente
        const { data: updateData, error: updateError } = await supabase
          .from('pets')
          .update({
            name: formData.name,
            description: formData.description || '',
            age: formData.age || '',
            species: formData.species,
            breed: formData.breed || '',
            image_url: formData.image_url || '',
            owner_id: formData.owner_id,
            updated_at: new Date().toISOString()
          })
          .eq('id', currentPet.id)
          .select();

        if (updateError) {
          console.error('Error detallado al actualizar:', updateError);
          throw new Error(`Error al actualizar: ${updateError.message}`);
        }

        if (!updateData || updateData.length === 0) {
          throw new Error('No se recibieron datos de actualización');
        }

        console.log('Datos actualizados:', updateData[0]);

        // Actualizar estado local
        setPets(pets.map(p => 
          p.id === currentPet.id ? 
          { 
            ...p, 
            ...updateData[0]
          } : p
        ));

        setSnackbar({
          open: true,
          message: 'Mascota actualizada correctamente',
          severity: 'success'
        });
      } else {
        // Crear nueva mascota
        const { data: insertData, error: insertError } = await supabase
          .from('pets')
          .insert([
            {
              name: formData.name,
              description: formData.description || '',
              age: formData.age || '',
              species: formData.species,
              breed: formData.breed || '',
              image_url: formData.image_url || 'https://images.unsplash.com/photo-1543466835-00a7907e9de1',
              owner_id: formData.owner_id,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }
          ])
          .select();

        if (insertError) {
          console.error('Error detallado al crear:', insertError);
          throw new Error(`Error al crear: ${insertError.message}`);
        }

        if (!insertData || insertData.length === 0) {
          throw new Error('No se recibieron datos de inserción');
        }

        console.log('Nueva mascota creada:', insertData[0]);

        // Actualizar estado local
        setPets([insertData[0], ...pets]);

        setSnackbar({
          open: true,
          message: 'Mascota creada correctamente',
          severity: 'success'
        });
      }

      handleCloseDialog();
    } catch (error) {
      console.error('Error completo:', error);
      setSnackbar({
        open: true,
        message: error instanceof Error ? error.message : 'Error al guardar la mascota',
        severity: 'error'
      });
    }
  };

  // Manejar cierre del diálogo
  const handleCloseDialog = () => {
    setOpenDialog(false);
  };

  // Manejar apertura del diálogo de eliminación
  const handleOpenDeleteDialog = (pet: Pet) => {
    setCurrentPet(pet);
    setOpenDeleteDialog(true);
  };

  // Manejar cierre del diálogo de eliminación
  const handleCloseDeleteDialog = () => {
    setOpenDeleteDialog(false);
  };

  // Manejar eliminación de mascota
  const handleDeletePet = async () => {
    try {
      if (currentPet) {
        // En una implementación real, aquí se eliminaría de la base de datos
        const { error } = await supabase
          .from('pets')
          .delete()
          .eq('id', currentPet.id);

        if (error) throw error;

        // Actualizar estado local
        const updatedPets = pets.filter(p => p.id !== currentPet.id);
        setPets(updatedPets);
        setSnackbar({
          open: true,
          message: 'Mascota eliminada correctamente',
          severity: 'success'
        });
      }
      handleCloseDeleteDialog();
    } catch (error) {
      console.error('Error al eliminar mascota:', error);
      setSnackbar({
        open: true,
        message: 'Error al eliminar la mascota',
        severity: 'error'
      });
    }
  };

  // Manejar apertura del diálogo de visualización
  const handleOpenViewDialog = (pet: Pet) => {
    setCurrentPet(pet);
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

  // Obtener nombre del propietario por user_id
  const getOwnerName = (ownerId: string) => {
    const owner = owners.find(o => o.user_id === ownerId);
    return owner ? owner.email : 'Desconocido';
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
          Mascotas
        </Typography>
        <Button 
          variant="contained" 
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
        >
          Nueva Mascota
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table sx={{ minWidth: 650 }}>
          <TableHead>
            <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
              <TableCell>Imagen</TableCell>
              <TableCell>Nombre</TableCell>
              <TableCell>Especie</TableCell>
              <TableCell>Edad</TableCell>
              <TableCell>Propietario</TableCell>
              <TableCell align="center">Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {pets.map((pet) => (
              <TableRow key={pet.id}>
                <TableCell>
                  <Avatar 
                    src={pet.image_url} 
                    alt={pet.name}
                    variant="rounded"
                    sx={{ width: 60, height: 60 }}
                  />
                </TableCell>
                <TableCell>{pet.name}</TableCell>
                <TableCell>
                  <Chip 
                    label={pet.species} 
                    color={pet.species === 'Perro' ? 'primary' : 'secondary'} 
                    variant="outlined" 
                  />
                </TableCell>
                <TableCell>{pet.age}</TableCell>
                <TableCell>
                  {(() => {
                    const owner = owners.find(o => o.user_id === pet.owner_id);
                    return owner ? owner.email : (
                      <Chip 
                        label="Propietario no encontrado"
                        color="warning"
                        variant="outlined"
                      />
                    );
                  })()}
                </TableCell>
                <TableCell align="center">
                  <Tooltip title="Ver detalles">
                    <IconButton onClick={() => handleOpenViewDialog(pet)}>
                      <ViewIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Editar">
                    <IconButton onClick={() => handleOpenDialog(pet)}>
                      <EditIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Eliminar">
                    <IconButton onClick={() => handleOpenDeleteDialog(pet)}>
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
          {currentPet ? `Editar ${currentPet.name}` : 'Crear Nueva Mascota'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} md={6}>
              <TextField
                name="name"
                label="Nombre de la mascota *"
                fullWidth
                value={formData.name}
                onChange={handleFormChange}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel id="species-label">Especie *</InputLabel>
                <Select
                  labelId="species-label"
                  name="species"
                  value={formData.species}
                  label="Especie *"
                  onChange={handleFormChange}
                >
                  <MenuItem value="Perro">Perro</MenuItem>
                  <MenuItem value="Gato">Gato</MenuItem>
                  <MenuItem value="Ave">Ave</MenuItem>
                  <MenuItem value="Otro">Otro</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                name="description"
                label="Descripción"
                fullWidth
                multiline
                rows={3}
                value={formData.description}
                onChange={handleFormChange}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                name="age"
                label="Edad"
                fullWidth
                value={formData.age}
                onChange={handleFormChange}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                name="breed"
                label="Raza"
                fullWidth
                value={formData.breed}
                onChange={handleFormChange}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth margin="normal">
                <InputLabel id="owner-label">Propietario</InputLabel>
                <Select
                  labelId="owner-label"
                  id="owner_id"
                  name="owner_id"
                  value={formData.owner_id}
                  label="Propietario"
                  onChange={e => setFormData(prev => ({ ...prev, owner_id: e.target.value }))}
                >
                  {owners.map((owner) => (
                    <MenuItem key={owner.user_id} value={owner.user_id}>
                      {owner.email}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                name="image_url"
                label="URL de la imagen"
                fullWidth
                value={formData.image_url}
                onChange={handleFormChange}
                helperText="Ingrese la URL de una imagen para la mascota"
                InputProps={{
                  endAdornment: (
                    <IconButton color="primary">
                      <PhotoIcon />
                    </IconButton>
                  ),
                }}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancelar</Button>
          <Button onClick={handleSubmit} variant="contained">
            {currentPet ? 'Actualizar' : 'Crear'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Diálogo de eliminación */}
      <Dialog open={openDeleteDialog} onClose={handleCloseDeleteDialog}>
        <DialogTitle>Confirmar eliminación</DialogTitle>
        <DialogContent>
          <Typography>
            ¿Está seguro que desea eliminar la mascota "{currentPet?.name}"? Esta acción no se puede deshacer.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDeleteDialog}>Cancelar</Button>
          <Button onClick={handleDeletePet} color="error" variant="contained">
            Eliminar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Diálogo de visualización */}
      <Dialog open={openViewDialog} onClose={handleCloseViewDialog} maxWidth="md" fullWidth>
        <DialogTitle>{currentPet?.name}</DialogTitle>
        <DialogContent>
          {currentPet && (
            <Grid container spacing={3}>
              <Grid item xs={12} md={4}>
                <img 
                  src={currentPet.image_url} 
                  alt={currentPet.name} 
                  style={{ width: '100%', borderRadius: '8px' }} 
                />
              </Grid>
              <Grid item xs={12} md={8}>
                <Typography variant="h6" gutterBottom>Información</Typography>
                <Typography paragraph>{currentPet.description}</Typography>
                
                <Grid container spacing={2}>
                  <Grid item xs={12} md={4}>
                    <Typography variant="subtitle2" color="text.secondary">Especie</Typography>
                    <Typography variant="body1" fontWeight="medium">{currentPet.species}</Typography>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <Typography variant="subtitle2" color="text.secondary">Raza</Typography>
                    <Typography variant="body1" fontWeight="medium">{currentPet.breed || 'No especificada'}</Typography>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <Typography variant="subtitle2" color="text.secondary">Edad</Typography>
                    <Typography variant="body1" fontWeight="medium">{currentPet.age || 'No especificada'}</Typography>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <Typography variant="subtitle2" color="text.secondary">Fecha de registro</Typography>
                    <Typography variant="body1" fontWeight="medium">
                      {new Date(currentPet.created_at).toLocaleDateString()}
                    </Typography>
                  </Grid>
                </Grid>
                
                <Box sx={{ mt: 3 }}>
                  <Typography variant="subtitle1" fontWeight="bold">Propietario:</Typography>
                  <Typography variant="body1">{getOwnerName(currentPet.owner_id)}</Typography>
                </Box>
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseViewDialog}>Cerrar</Button>
          <Button 
            onClick={() => {
              handleCloseViewDialog();
              if (currentPet) {
                handleOpenDialog(currentPet);
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