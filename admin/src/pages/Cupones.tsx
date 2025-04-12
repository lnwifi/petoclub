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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tooltip,
  InputAdornment
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  ContentCopy as CopyIcon,
  LocalOffer as CouponIcon
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { es } from 'date-fns/locale';

// Tipo para los cupones
type Coupon = {
  id: string;
  title: string;
  description: string;
  code: string;
  discount_percentage: number;
  category: string;
  created_at: string;
  expires_at: string;
  is_active: boolean;
  usage_count: number;
};

export default function Cupones() {
  const { supabase } = useAuth();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [currentCoupon, setCurrentCoupon] = useState<Coupon | null>(null);
  const [formData, setFormData] = useState<Partial<Coupon>>({
    title: '',
    description: '',
    code: '',
    discount_percentage: 10,
    category: '',
    expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 días desde hoy
    is_active: true
  });
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error' | 'info' | 'warning'
  });

  // Cargar cupones
  useEffect(() => {
    const fetchCoupons = async () => {
      try {
        setLoading(true);
        
        // Obtener cupones de Supabase
        const { data: couponData, error: couponError } = await supabase
          .from('discount_coupons')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (couponError) throw couponError;
        
        // Si no hay datos reales, usar datos de ejemplo
        if (!couponData || couponData.length === 0) {
          // Datos de ejemplo
          const mockCoupons: Coupon[] = [
            {
              id: '1',
              title: 'Descuento de bienvenida',
              description: 'Cupón de bienvenida para nuevos usuarios',
              code: 'WELCOME10',
              discount_percentage: 10,
              category: 'General',
              created_at: '2023-01-15T10:30:00Z',
              expires_at: '2023-12-31T23:59:59Z',
              is_active: true,
              usage_count: 45
            },
            {
              id: '2',
              title: 'Descuento en accesorios',
              description: 'Obtén un 15% de descuento en todos los accesorios para mascotas',
              code: 'ACCESORIOS15',
              discount_percentage: 15,
              category: 'PetShop',
              created_at: '2023-02-20T14:45:00Z',
              expires_at: '2023-11-30T23:59:59Z',
              is_active: true,
              usage_count: 23
            },
            {
              id: '3',
              title: 'Descuento en alimentos',
              description: 'Obtén un 20% de descuento en alimentos premium',
              code: 'FOOD20',
              discount_percentage: 20,
              category: 'Alimentos',
              created_at: '2023-03-10T09:15:00Z',
              expires_at: '2023-10-15T23:59:59Z',
              is_active: false,
              usage_count: 67
            }
          ];
          setCoupons(mockCoupons);
        } else {
          // Transformar datos reales al formato esperado
          const formattedCoupons = couponData.map(coupon => ({
            ...coupon,
            usage_count: coupon.usage_count || 0,
            is_active: coupon.is_active !== false // Por defecto activo si no se especifica
          }));
          setCoupons(formattedCoupons);
        }
      } catch (error) {
        console.error('Error al cargar cupones:', error);
        setSnackbar({
          open: true,
          message: 'Error al cargar los cupones',
          severity: 'error'
        });
      } finally {
        setLoading(false);
      }
    };

    fetchCoupons();
  }, [supabase]);

  // Generar código de cupón aleatorio
  const generateCouponCode = () => {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
      result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
  };

  // Manejar apertura del diálogo de creación/edición
  const handleOpenDialog = (coupon?: Coupon) => {
    if (coupon) {
      setCurrentCoupon(coupon);
      setFormData({
        title: coupon.title,
        description: coupon.description,
        code: coupon.code,
        discount_percentage: coupon.discount_percentage,
        category: coupon.category,
        expires_at: coupon.expires_at,
        is_active: coupon.is_active
      });
    } else {
      setCurrentCoupon(null);
      setFormData({
        title: '',
        description: '',
        code: generateCouponCode(),
        discount_percentage: 10,
        category: 'General',
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 días desde hoy
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
  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | { name?: string; value: unknown }>) => {
    const name = e.target.name as string;
    const value = e.target.value;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Manejar cambio de fecha
  const handleDateChange = (date: Date | null) => {
    if (date) {
      setFormData(prev => ({ ...prev, expires_at: date.toISOString() }));
    }
  };

  // Manejar envío del formulario
  const handleSubmit = async () => {
    try {
      // Validar campos obligatorios
      if (!formData.title || !formData.code || !formData.discount_percentage) {
        setSnackbar({
          open: true,
          message: 'Por favor complete todos los campos obligatorios',
          severity: 'error'
        });
        return;
      }

      // En una implementación real, aquí se enviaría a la base de datos
      if (currentCoupon) {
        // Actualizar cupón existente
        const { error } = await supabase
          .from('discount_coupons')
          .update({
            title: formData.title,
            description: formData.description,
            code: formData.code,
            discount_percentage: formData.discount_percentage,
            category: formData.category,
            expires_at: formData.expires_at,
            is_active: formData.is_active
          })
          .eq('id', currentCoupon.id);

        if (error) throw error;

        // Actualizar estado local
        const updatedCoupons = coupons.map(c => 
          c.id === currentCoupon.id ? 
          { 
            ...c, 
            title: formData.title || c.title,
            description: formData.description || c.description,
            code: formData.code || c.code,
            discount_percentage: formData.discount_percentage !== undefined ? formData.discount_percentage : c.discount_percentage,
            category: formData.category || c.category,
            expires_at: formData.expires_at || c.expires_at,
            is_active: formData.is_active !== undefined ? formData.is_active : c.is_active
          } : c
        );
        setCoupons(updatedCoupons);
        setSnackbar({
          open: true,
          message: 'Cupón actualizado correctamente',
          severity: 'success'
        });
      } else {
        // Crear nuevo cupón
        const { data, error } = await supabase
          .from('discount_coupons')
          .insert([
            {
              title: formData.title,
              description: formData.description,
              code: formData.code,
              discount_percentage: formData.discount_percentage,
              category: formData.category,
              expires_at: formData.expires_at,
              is_active: formData.is_active,
              created_at: new Date().toISOString()
            }
          ])
          .select();

        if (error) throw error;

        // Actualizar estado local
        if (data && data.length > 0) {
          setCoupons([data[0], ...coupons]);
        } else {
          // Fallback para demo
          const newCoupon: Coupon = {
            id: `${Date.now()}`,
            title: formData.title || '',
            description: formData.description || '',
            code: formData.code || generateCouponCode(),
            discount_percentage: formData.discount_percentage || 10,
            category: formData.category || 'General',
            created_at: new Date().toISOString(),
            expires_at: formData.expires_at || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            is_active: formData.is_active !== undefined ? formData.is_active : true,
            usage_count: 0
          };
          setCoupons([newCoupon, ...coupons]);
        }
        
        setSnackbar({
          open: true,
          message: 'Cupón creado correctamente',
          severity: 'success'
        });
      }

      handleCloseDialog();
    } catch (error) {
      console.error('Error al guardar cupón:', error);
      setSnackbar({
        open: true,
        message: 'Error al guardar el cupón',
        severity: 'error'
      });
    }
  };

  // Manejar apertura del diálogo de eliminación
  const handleOpenDeleteDialog = (coupon: Coupon) => {
    setCurrentCoupon(coupon);
    setOpenDeleteDialog(true);
  };

  // Manejar cierre del diálogo de eliminación
  const handleCloseDeleteDialog = () => {
    setOpenDeleteDialog(false);
  };

  // Manejar eliminación de cupón
  const handleDeleteCoupon = async () => {
    try {
      if (currentCoupon) {
        // En una implementación real, aquí se eliminaría de la base de datos
        const { error } = await supabase
          .from('discount_coupons')
          .delete()
          .eq('id', currentCoupon.id);

        if (error) throw error;

        // Actualizar estado local
        const updatedCoupons = coupons.filter(c => c.id !== currentCoupon.id);
        setCoupons(updatedCoupons);
        setSnackbar({
          open: true,
          message: 'Cupón eliminado correctamente',
          severity: 'success'
        });
      }
      handleCloseDeleteDialog();
    } catch (error) {
      console.error('Error al eliminar cupón:', error);
      setSnackbar({
        open: true,
        message: 'Error al eliminar el cupón',
        severity: 'error'
      });
    }
  };

  // Manejar copia de código de cupón
  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setSnackbar({
      open: true,
      message: 'Código copiado al portapapeles',
      severity: 'success'
    });
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

  // Verificar si un cupón está expirado
  const isExpired = (expiresAt: string) => {
    return new Date(expiresAt) < new Date();
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
          Cupones
        </Typography>
        <Button 
          variant="contained" 
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
        >
          Nuevo Cupón
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table sx={{ minWidth: 650 }}>
          <TableHead>
            <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
              <TableCell>Título</TableCell>
              <TableCell>Código</TableCell>
              <TableCell>Descuento</TableCell>
              <TableCell>Categoría</TableCell>
              <TableCell>Vencimiento</TableCell>
              <TableCell>Estado</TableCell>
              <TableCell>Usos</TableCell>
              <TableCell align="center">Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {coupons.map((coupon) => (
              <TableRow key={coupon.id}>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <CouponIcon sx={{ mr: 1, color: 'primary.main' }} />
                    <Typography fontWeight="medium">{coupon.title}</Typography>
                  </Box>
                </TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Typography fontFamily="monospace" fontWeight="bold" sx={{ mr: 1 }}>
                      {coupon.code}
                    </Typography>
                    <IconButton size="small" onClick={() => handleCopyCode(coupon.code)}>
                      <CopyIcon fontSize="small" />
                    </IconButton>
                  </Box>
                </TableCell>
                <TableCell>
                  <Chip 
                    label={`${coupon.discount_percentage}%`} 
                    color="primary" 
                    variant="outlined" 
                  />
                </TableCell>
                <TableCell>{coupon.category}</TableCell>
                <TableCell>
                  <Typography 
                    color={isExpired(coupon.expires_at) ? 'error.main' : 'text.primary'}
                  >
                    {formatDate(coupon.expires_at)}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Chip 
                    label={
                      isExpired(coupon.expires_at) ? 'Expirado' : 
                      coupon.is_active ? 'Activo' : 'Inactivo'
                    } 
                    color={
                      isExpired(coupon.expires_at) ? 'error' : 
                      coupon.is_active ? 'success' : 'default'
                    } 
                    size="small"
                  />
                </TableCell>
                <TableCell>{coupon.usage_count}</TableCell>
                <TableCell align="center">
                  <Tooltip title="Editar">
                    <IconButton onClick={() => handleOpenDialog(coupon)}>
                      <EditIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Eliminar">
                    <IconButton onClick={() => handleOpenDeleteDialog(coupon)}>
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
          {currentCoupon ? `Editar ${currentCoupon.title}` : 'Crear Nuevo Cupón'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} md={6}>
              <TextField
                name="title"
                label="Título *"
                fullWidth
                value={formData.title}
                onChange={handleFormChange}
                required
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                name="code"
                label="Código *"
                fullWidth
                value={formData.code}
                onChange={handleFormChange}
                required
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <Tooltip title="Generar código">
                        <IconButton
                          onClick={() => setFormData(prev => ({ ...prev, code: generateCouponCode() }))}
                          edge="end"
                        >
                          <CouponIcon />
                        </IconButton>
                      </Tooltip>
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                name="description"
                label="Descripción"
                fullWidth
                multiline
                rows={2}
                value={formData.description}
                onChange={handleFormChange}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                name="discount_percentage"
                label="Porcentaje de descuento *"
                fullWidth
                type="number"
                value={formData.discount_percentage}
                onChange={handleFormChange}
                required
                InputProps={{
                  endAdornment: <InputAdornment position="end">%</InputAdornment>,
                }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel id="category-label">Categoría</InputLabel>
                <Select
                  labelId="category-label"
                  name="category"
                  value={formData.category}
                  label="Categoría"
                  onChange={handleFormChange}
                >
                  <MenuItem value="General">General</MenuItem>
                  <MenuItem value="PetShop">PetShop</MenuItem>
                  <MenuItem value="Alimentos">Alimentos</MenuItem>
                  <MenuItem value="Accesorios">Accesorios</MenuItem>
                  <MenuItem value="Servicios">Servicios</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={es}>
                <DatePicker
                  label="Fecha de vencimiento *"
                  value={new Date(formData.expires_at || new Date())}
                  onChange={handleDateChange}
                  slotProps={{ textField: { fullWidth: true } }}
                />
              </LocalizationProvider>
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel id="active-label">Estado</InputLabel>
                <Select
                  labelId="active-label"
                  name="is_active"
                  value={formData.is_active}
                  label="Estado"
                  onChange={handleFormChange}
                >
                  <MenuItem value={true}>Activo</MenuItem>
                  <MenuItem value={false}>Inactivo</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancelar</Button>
          <Button onClick={handleSubmit} variant="contained">
            {currentCoupon ? 'Actualizar' : 'Crear'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Diálogo de eliminación */}
      <Dialog open={openDeleteDialog} onClose={handleCloseDeleteDialog}>
        <DialogTitle>Confirmar eliminación</DialogTitle>
        <DialogContent>
          <Typography>
            ¿Está seguro que desea eliminar el cupón "{currentCoupon?.title}"? Esta acción no se puede deshacer.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDeleteDialog}>Cancelar</Button>
          <Button onClick={handleDeleteCoupon} color="error" variant="contained">
            Eliminar
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