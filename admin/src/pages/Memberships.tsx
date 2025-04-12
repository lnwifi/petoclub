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
  CircularProgress,
  Snackbar,
  Alert,
  Chip,
  Switch,
  FormControlLabel,
  Tooltip,
  InputAdornment
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  Check as CheckIcon,
  Close as CloseIcon,
  CardMembership as MembershipIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';

// Tipo para las membresías
type Membership = {
  id: string;
  name: string;
  description: string;
  price: number;
  max_pets: number;
  max_photos_per_pet: number;
  max_interests_per_pet: number;
  has_ads: boolean;
  has_coupons: boolean;
  has_store_discount: boolean;
  discount_percentage?: number;
  is_active: boolean;
};

export default function Memberships() {
  const { supabase } = useAuth();
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [openViewDialog, setOpenViewDialog] = useState(false);
  const [currentMembership, setCurrentMembership] = useState<Membership | null>(null);
  const [formData, setFormData] = useState<Partial<Membership>>({
    name: '',
    description: '',
    price: 0,
    max_pets: 1,
    max_photos_per_pet: 1,
    max_interests_per_pet: 1,
    has_ads: true,
    has_coupons: false,
    has_store_discount: false,
    discount_percentage: 0,
    is_active: true
  });
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error' | 'info' | 'warning'
  });

  // Cargar membresías
  useEffect(() => {
    const fetchMemberships = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Obtener membresías de Supabase
        const { data: membershipData, error: membershipError } = await supabase
          .from('membership_types')
          .select('*')
          .order('price', { ascending: true });
        
        if (membershipError) {
          console.error('Error al cargar membresías:', membershipError.message);
          setError(membershipError.message);
          setSnackbar({
            open: true,
            message: 'Error al cargar las membresías. Por favor, intenta nuevamente.',
            severity: 'error'
          });
          throw membershipError;
        }
        
        if (!membershipData || membershipData.length === 0) {
          console.log('No se encontraron membresías en la base de datos');
          // Si no hay datos reales, usar datos de ejemplo
          const mockMemberships: Membership[] = [
            {
              id: '1',
              name: 'Básica',
              description: 'Membresía básica para usuarios',
              price: 0,
              max_pets: 1,
              max_photos_per_pet: 3,
              max_interests_per_pet: 5,
              has_ads: false,
              has_coupons: false,
              has_store_discount: false,
              is_active: true
            },
            {
              id: '2',
              name: 'Premium',
              description: 'Membresía premium con más beneficios',
              price: 9.99,
              max_pets: 3,
              max_photos_per_pet: 10,
              max_interests_per_pet: 10,
              has_ads: true,
              has_coupons: true,
              has_store_discount: true,
              discount_percentage: 10,
              is_active: true
            }
          ];
          setMemberships(mockMemberships);
        } else {
          setMemberships(membershipData as Membership[]);
        }
      } catch (error) {
        console.error('Error en la carga de membresías:', error);
        setError('Error al cargar los datos');
        setSnackbar({
          open: true,
          message: 'Error al cargar las membresías. Por favor, intenta nuevamente.',
          severity: 'error'
        });
      } finally {
        setLoading(false);
      }
    };

    fetchMemberships();
  }, [supabase]);

  // Refrescar datos
  const refreshData = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: membershipData, error: membershipError } = await supabase
        .from('membership_types')
        .select('*')
        .order('price', { ascending: true });
      
      if (membershipError) throw membershipError;
      
      setMemberships(membershipData as Membership[]);
      setSnackbar({
        open: true,
        message: 'Datos actualizados correctamente',
        severity: 'success'
      });
    } catch (error) {
      console.error('Error al refrescar datos:', error);
      setError('Error al refrescar los datos');
      setSnackbar({
        open: true,
        message: 'Error al actualizar los datos',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  // Manejar apertura del diálogo de creación/edición
  const handleOpenDialog = (membership?: Membership) => {
    if (membership) {
      setCurrentMembership(membership);
      setFormData({ ...membership });
    } else {
      setCurrentMembership(null);
      setFormData({
        name: '',
        description: '',
        price: 0,
        max_pets: 1,
        max_photos_per_pet: 1,
        max_interests_per_pet: 1,
        has_ads: true,
        has_coupons: false,
        has_store_discount: false,
        discount_percentage: 0,
        is_active: true
      });
    }
    setOpenDialog(true);
  };

  // Manejar cierre de diálogos
  const handleCloseDialog = () => {
    setOpenDialog(false);
    setOpenDeleteDialog(false);
    setOpenViewDialog(false);
    setCurrentMembership(null);
  };

  // Guardar membresía
  const saveMembership = async () => {
    try {
      setLoading(true);
      setError(null);
      
      if (currentMembership) {
        // Actualizar membresía existente
        const { error: updateError } = await supabase
          .from('membership_types')
          .update(formData)
          .eq('id', currentMembership.id);
        
        if (updateError) throw updateError;
        
        setSnackbar({
          open: true,
          message: 'Membresía actualizada correctamente',
          severity: 'success'
        });
      } else {
        // Crear nueva membresía
        const { error: insertError } = await supabase
          .from('membership_types')
          .insert([formData as Membership]);
        
        if (insertError) throw insertError;
        
        setSnackbar({
          open: true,
          message: 'Membresía creada correctamente',
          severity: 'success'
        });
      }
      
      handleCloseDialog();
      refreshData();
    } catch (error) {
      console.error('Error al guardar membresía:', error);
      setError('Error al guardar la membresía');
      setSnackbar({
        open: true,
        message: 'Error al guardar la membresía. Por favor, intenta nuevamente.',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  // Eliminar membresía
  const deleteMembership = async () => {
    try {
      setLoading(true);
      setError(null);
      
      if (currentMembership) {
        const { error: deleteError } = await supabase
          .from('membership_types')
          .delete()
          .eq('id', currentMembership.id);
        
        if (deleteError) throw deleteError;
        
        setSnackbar({
          open: true,
          message: 'Membresía eliminada correctamente',
          severity: 'success'
        });
      }
      
      handleCloseDialog();
      refreshData();
    } catch (error) {
      console.error('Error al eliminar membresía:', error);
      setError('Error al eliminar la membresía');
      setSnackbar({
        open: true,
        message: 'Error al eliminar la membresía. Por favor, intenta nuevamente.',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  // Ver membresía
  const viewMembership = (membership: Membership) => {
    setCurrentMembership(membership);
    setOpenViewDialog(true);
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5">Membresías</Typography>
        <Box>
          <Button
            variant="contained"
            color="primary"
            startIcon={<RefreshIcon />}
            onClick={refreshData}
            sx={{ mr: 2 }}
          >
            Refrescar
          </Button>
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
          >
            Nueva Membresía
          </Button>
        </Box>
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 4 }}>
          <Typography variant="h6" color="error">Error al cargar los datos</Typography>
          <Typography variant="body1" color="error">{error}</Typography>
          <Button
            variant="outlined"
            color="error"
            onClick={refreshData}
            sx={{ mt: 2 }}
          >
            Intentar nuevamente
          </Button>
        </Box>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Nombre</TableCell>
                <TableCell>Descripción</TableCell>
                <TableCell>Precio</TableCell>
                <TableCell>Mascotas</TableCell>
                <TableCell>Fotos por Mascota</TableCell>
                <TableCell>Intereses por Mascota</TableCell>
                <TableCell>Anuncios</TableCell>
                <TableCell>Cupones</TableCell>
                <TableCell>Descuento Tienda</TableCell>
                <TableCell>Estado</TableCell>
                <TableCell>Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {memberships.map((membership) => (
                <TableRow key={membership.id}>
                  <TableCell>{membership.name}</TableCell>
                  <TableCell>{membership.description}</TableCell>
                  <TableCell>${membership.price.toFixed(2)}</TableCell>
                  <TableCell>{membership.max_pets}</TableCell>
                  <TableCell>{membership.max_photos_per_pet}</TableCell>
                  <TableCell>{membership.max_interests_per_pet}</TableCell>
                  <TableCell>
                    <Chip
                      label={membership.has_ads ? 'Sí' : 'No'}
                      color={membership.has_ads ? 'primary' : 'default'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={membership.has_coupons ? 'Sí' : 'No'}
                      color={membership.has_coupons ? 'primary' : 'default'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    {membership.has_store_discount ? (
                      <Chip
                        label={`${membership.discount_percentage}%`}
                        color="primary"
                        size="small"
                      />
                    ) : (
                      <Chip
                        label="No"
                        color="default"
                        size="small"
                      />
                    )}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={membership.is_active ? 'Activa' : 'Inactiva'}
                      color={membership.is_active ? 'success' : 'error'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <IconButton
                      size="small"
                      onClick={() => viewMembership(membership)}
                      color="primary"
                    >
                      <ViewIcon />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => handleOpenDialog(membership)}
                      color="primary"
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => {
                        setCurrentMembership(membership);
                        setOpenDeleteDialog(true);
                      }}
                      color="error"
                    >
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Diálogos y Snackbar... */}
    </Box>
  );
}