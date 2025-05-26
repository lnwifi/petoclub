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
  Switch,
  FormControlLabel,
  Tooltip
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  Email as EmailIcon,
  Phone as PhoneIcon
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';

// Tipo para los usuarios
type User = {
  id: string;
  email: string;
  full_name?: string;
  phone?: string;
  avatar_url?: string;
  is_admin?: boolean;
  created_at: string;
  membership_type?: string;
  is_active?: boolean;
};

export default function Usuarios() {
  const { supabase, user, isAdmin } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [openViewDialog, setOpenViewDialog] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [formData, setFormData] = useState<Partial<User>>({
    email: '',
    full_name: '',
    phone: '',
    avatar_url: '',
    is_admin: false,
    is_active: true
  });
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error' | 'info' | 'warning'
  });

  // Cargar usuarios
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);
        
        // Verificar si hay un usuario autenticado
        if (!user) {
          throw new Error('No hay usuario autenticado');
        }

        console.log('Usuario actual:', user);
        console.log('Es administrador:', isAdmin);

        // Construir la consulta para obtener todos los usuarios
        // Asegurarse de que no haya filtros para mostrar todos los usuarios
        console.log('Ejecutando consulta RPC para obtener todos los perfiles');
        
        // Usar la función RPC personalizada que ignora las políticas de seguridad (RLS)
        // Esta función verifica si el usuario es administrador y devuelve todos los perfiles
        const { data: userData, error: userError } = await supabase.rpc('get_all_profiles');
        // Si necesitas ordenar por fecha de creación, hazlo en el frontend:
        let formattedUsers = (userData || []).map(profile => ({
          id: profile.profile_id,
          email: profile.email,
          full_name: profile.full_name || profile.email?.split('@')[0] || 'Sin nombre',
          phone: '', // No existe en la tabla
          avatar_url: profile.avatar_url || '',
          is_admin: profile.is_admin || false,
          created_at: profile.created_at || new Date().toISOString(),
          membership_type: 'Básico', // No existe en la tabla
          is_active: true // No existe en la tabla
        }));
        // Ordenar por fecha de creación descendente
        formattedUsers = formattedUsers.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

        console.log('Usuarios formateados:', formattedUsers);

        setUsers(formattedUsers);
        setSnackbar({
          open: true,
          message: `Se encontraron ${formattedUsers.length} usuarios`,
          severity: 'info'
        });
      } catch (error) {
        console.error('Error detallado:', error);
        setSnackbar({
          open: true,
          message: error instanceof Error ? 
            error.message : 
            'Error al cargar los usuarios. Por favor, inténtalo de nuevo.',
          severity: 'error'
        });
        setUsers([]); // Limpiar usuarios en caso de error
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [supabase, user, isAdmin]);

  // Manejar apertura del diálogo de creación/edición
  const handleOpenDialog = (user?: User) => {
    if (user) {
      setCurrentUser(user);
      setFormData({
        email: user.email,
        full_name: user.full_name || '',
        phone: user.phone || '',
        avatar_url: user.avatar_url || '',
        is_admin: user.is_admin || false,
        is_active: user.is_active
      });
    } else {
      setCurrentUser(null);
      setFormData({
        email: '',
        full_name: '',
        phone: '',
        avatar_url: '',
        is_admin: false,
        is_active: true
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
    const { name, value, checked } = e.target;
    if (name === 'is_admin' || name === 'is_active') {
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  // Manejar envío del formulario
  const handleSubmit = async () => {
    try {
      // Validar campos obligatorios
      if (!formData.email) {
        setSnackbar({
          open: true,
          message: 'El correo electrónico es obligatorio',
          severity: 'error'
        });
        return;
      }

      // En una implementación real, aquí se enviaría a la base de datos
      if (currentUser) {
        // Actualizar usuario existente
        const { error } = await supabase
          .from('profiles')
          .update({
            full_name: formData.full_name,
            phone: formData.phone,
            avatar_url: formData.avatar_url,
            role: formData.is_admin ? 'admin' : 'user',
            is_active: formData.is_active
          })
          .eq('user_id', currentUser.id);

        if (error) throw error;

        // Actualizar estado local
        const updatedUsers = users.map(u => 
          u.id === currentUser.id ? 
          { 
            ...u, 
            full_name: formData.full_name,
            phone: formData.phone,
            avatar_url: formData.avatar_url,
            is_admin: formData.is_admin,
            is_active: formData.is_active
          } : u
        );
        setUsers(updatedUsers);
        setSnackbar({
          open: true,
          message: 'Usuario actualizado correctamente',
          severity: 'success'
        });
      } else {
        // Crear nuevo usuario
        // Nota: En una implementación real, esto debería incluir la creación de la cuenta de autenticación
        const { data, error } = await supabase.auth.admin.createUser({
          email: formData.email,
          password: 'password123', // Contraseña temporal
          email_confirm: true,
          user_metadata: {
            full_name: formData.full_name,
            phone: formData.phone,
            avatar_url: formData.avatar_url,
            is_admin: formData.is_admin
          }
        });

        if (error) throw error;

        // Crear perfil en la tabla profiles
        if (data.user) {
          const { error: profileError } = await supabase
            .from('profiles')
            .insert([
              {
                user_id: data.user.id,
                email: formData.email,
                full_name: formData.full_name,
                phone: formData.phone,
                avatar_url: formData.avatar_url,
                role: formData.is_admin ? 'admin' : 'user',
                is_active: formData.is_active
              }
            ]);

          if (profileError) throw profileError;

          // Actualizar estado local
          const newUser: User = {
            id: data.user.id,
            email: formData.email || '',
            full_name: formData.full_name,
            phone: formData.phone,
            avatar_url: formData.avatar_url,
            is_admin: formData.is_admin,
            created_at: new Date().toISOString(),
            membership_type: 'Básico',
            is_active: formData.is_active
          };
          setUsers([newUser, ...users]);
        } else {
          // Fallback para demo
          const newUser: User = {
            id: `${Date.now()}`,
            email: formData.email || '',
            full_name: formData.full_name,
            phone: formData.phone,
            avatar_url: formData.avatar_url || 'https://randomuser.me/api/portraits/lego/1.jpg',
            is_admin: formData.is_admin,
            created_at: new Date().toISOString(),
            membership_type: 'Básico',
            is_active: formData.is_active
          };
          setUsers([newUser, ...users]);
        }
        
        setSnackbar({
          open: true,
          message: 'Usuario creado correctamente',
          severity: 'success'
        });
      }

      handleCloseDialog();
    } catch (error: any) {
      console.error('Error al guardar usuario:', error);
      setSnackbar({
        open: true,
        message: `Error al guardar el usuario: ${error.message}`,
        severity: 'error'
      });
    }
  };

  // Manejar apertura del diálogo de eliminación
  const handleOpenDeleteDialog = (user: User) => {
    setCurrentUser(user);
    setOpenDeleteDialog(true);
  };

  // Manejar cierre del diálogo de eliminación
  const handleCloseDeleteDialog = () => {
    setOpenDeleteDialog(false);
  };

  // Manejar eliminación de usuario
  const handleDeleteUser = async () => {
    try {
      if (currentUser) {
        // En una implementación real, aquí se eliminaría de la base de datos
        // Nota: Esto debería incluir la eliminación de la cuenta de autenticación
        const { error } = await supabase.auth.admin.deleteUser(currentUser.id);

        if (error) throw error;

        // Actualizar estado local
        const updatedUsers = users.filter(u => u.id !== currentUser.id);
        setUsers(updatedUsers);
        setSnackbar({
          open: true,
          message: 'Usuario eliminado correctamente',
          severity: 'success'
        });
      }
      handleCloseDeleteDialog();
    } catch (error: any) {
      console.error('Error al eliminar usuario:', error);
      setSnackbar({
        open: true,
        message: `Error al eliminar el usuario: ${error.message}`,
        severity: 'error'
      });
    }
  };

  // Manejar apertura del diálogo de visualización
  const handleOpenViewDialog = (user: User) => {
    setCurrentUser(user);
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

  // Formatear fecha
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
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
          Usuarios
        </Typography>
        <Button 
          variant="contained" 
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
        >
          Nuevo Usuario
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table sx={{ minWidth: 650 }}>
          <TableHead>
            <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
              <TableCell>Avatar</TableCell>
              <TableCell>Nombre</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Membresía</TableCell>
              <TableCell>Estado</TableCell>
              <TableCell>Rol</TableCell>
              <TableCell align="center">Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {users.map((user, idx) => (
              <TableRow key={user.id || idx}>
                <TableCell>
                  <Avatar 
                    src={user.avatar_url} 
                    alt={user.full_name || user.email}
                  >
                    {!user.avatar_url && (user.full_name?.[0] || user.email[0]).toUpperCase()}
                  </Avatar>
                </TableCell>
                <TableCell>{user.full_name || 'Sin nombre'}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>
                  <Chip 
                    label={user.membership_type || 'Básico'} 
                    color={user.membership_type === 'Pro' ? 'secondary' : 
                           user.membership_type === 'Premium' ? 'primary' : 'default'} 
                    variant="outlined" 
                  />
                </TableCell>
                <TableCell>
                  <Chip 
                    label={user.is_active ? 'Activo' : 'Inactivo'} 
                    color={user.is_active ? 'success' : 'error'} 
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <Chip 
                    label={user.is_admin ? 'Administrador' : 'Usuario'} 
                    color={user.is_admin ? 'warning' : 'info'} 
                    size="small"
                    variant="outlined"
                  />
                </TableCell>
                <TableCell align="center">
                  <Tooltip title="Ver detalles">
                    <IconButton onClick={() => handleOpenViewDialog(user)}>
                      <ViewIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Editar">
                    <IconButton onClick={() => handleOpenDialog(user)}>
                      <EditIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Eliminar">
                    <IconButton onClick={() => handleOpenDeleteDialog(user)}>
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
          {currentUser ? `Editar ${currentUser.full_name || currentUser.email}` : 'Crear Nuevo Usuario'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            {!currentUser && (
              <Grid item xs={12}>
                <TextField
                  name="email"
                  label="Correo electrónico *"
                  fullWidth
                  value={formData.email}
                  onChange={handleFormChange}
                  type="email"
                  required
                />
              </Grid>
            )}
            <Grid item xs={12} md={6}>
              <TextField
                name="full_name"
                label="Nombre completo"
                fullWidth
                value={formData.full_name}
                onChange={handleFormChange}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                name="phone"
                label="Teléfono"
                fullWidth
                value={formData.phone}
                onChange={handleFormChange}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                name="avatar_url"
                label="URL del avatar"
                fullWidth
                value={formData.avatar_url}
                onChange={handleFormChange}
                helperText="Ingrese la URL de una imagen para el avatar"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.is_admin}
                    onChange={handleFormChange}
                    name="is_admin"
                    color="warning"
                  />
                }
                label="Es administrador"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.is_active}
                    onChange={handleFormChange}
                    name="is_active"
                    color="success"
                  />
                }
                label="Usuario activo"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancelar</Button>
          <Button onClick={handleSubmit} variant="contained">
            {currentUser ? 'Actualizar' : 'Crear'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Diálogo de eliminación */}
      <Dialog open={openDeleteDialog} onClose={handleCloseDeleteDialog}>
        <DialogTitle>Confirmar eliminación</DialogTitle>
        <DialogContent>
          <Typography>
            ¿Está seguro que desea eliminar el usuario "{currentUser?.full_name || currentUser?.email}"? Esta acción no se puede deshacer.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDeleteDialog}>Cancelar</Button>
          <Button onClick={handleDeleteUser} color="error" variant="contained">
            Eliminar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Diálogo de visualización */}
      <Dialog open={openViewDialog} onClose={handleCloseViewDialog} maxWidth="md" fullWidth>
        <DialogTitle>{currentUser?.full_name || currentUser?.email}</DialogTitle>
        <DialogContent>
          {currentUser && (
            <Grid container spacing={3}>
              <Grid item xs={12} md={4} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <Avatar 
                  src={currentUser.avatar_url} 
                  alt={currentUser.full_name || currentUser.email}
                  sx={{ width: 150, height: 150, mb: 2 }}
                >
                  {!currentUser.avatar_url && (currentUser.full_name?.[0] || currentUser.email[0]).toUpperCase()}
                </Avatar>
                <Chip 
                  label={currentUser.is_admin ? 'Administrador' : 'Usuario'} 
                  color={currentUser.is_admin ? 'warning' : 'info'} 
                  sx={{ mb: 1 }}
                />
                <Chip 
                  label={currentUser.is_active ? 'Activo' : 'Inactivo'} 
                  color={currentUser.is_active ? 'success' : 'error'} 
                />
              </Grid>
              <Grid item xs={12} md={8}>
                <Typography variant="h6" gutterBottom>Información de contacto</Typography>
                
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <EmailIcon sx={{ mr: 1, color: 'text.secondary' }} />
                  <Typography>{currentUser.email}</Typography>
                </Box>
                
                {currentUser.phone && (
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <PhoneIcon sx={{ mr: 1, color: 'text.secondary' }} />
                    <Typography>{currentUser.phone}</Typography>
                  </Box>
                )}
                
                <Typography variant="subtitle1" fontWeight="bold" sx={{ mt: 3 }}>Membresía:</Typography>
                <Chip 
                  label={currentUser.membership_type || 'Básico'} 
                  color={currentUser.membership_type === 'Pro' ? 'secondary' : 
                         currentUser.membership_type === 'Premium' ? 'primary' : 'default'} 
                />
                
                <Typography variant="subtitle1" fontWeight="bold" sx={{ mt: 3 }}>Fecha de registro:</Typography>
                <Typography>{formatDate(currentUser.created_at)}</Typography>
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseViewDialog}>Cerrar</Button>
          <Button 
            onClick={() => {
              handleCloseViewDialog();
              if (currentUser) {
                handleOpenDialog(currentUser);
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