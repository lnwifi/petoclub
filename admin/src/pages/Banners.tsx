import React, { useState, useEffect, useCallback } from 'react';
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
  Switch,
  FormControlLabel,
  InputAdornment,
  Avatar
} from '@mui/material';
import { SelectChangeEvent } from '@mui/material/Select';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Upload as UploadIcon,
  CalendarToday as CalendarIcon,
  Search as SearchIcon,
  Visibility as ViewIcon,
  Image as ImageIcon,
  Link as LinkIcon
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { es } from 'date-fns/locale';

// Tipo para los banners
interface Banner {
  id: string;
  title: string;
  description: string;
  image_url: string;
  link_url: string;
  target_section: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
  priority: number;
  created_at: string;
  updated_at: string;
}

export default function Banners() {
  const { supabase } = useAuth();
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [openViewDialog, setOpenViewDialog] = useState(false);
  const [currentBanner, setCurrentBanner] = useState<Banner | null>(null);
  const [formData, setFormData] = useState<Partial<Banner>>({
    title: '',
    description: '',
    image_url: '',
    link_url: '',
    target_section: 'home',
    start_date: new Date().toISOString(),
    end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    is_active: true,
    priority: 1,
    updated_at: new Date().toISOString()
  });
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error' | 'info' | 'warning'
  });
  const [isAdmin, setIsAdmin] = useState(false);
  const [session, setSession] = useState(null);

  // Función para recargar banners
  const reloadBanners = async () => {
    try {
      setLoading(true);
      const { data: bannerData, error: bannerError } = await supabase
        .from('banners')
        .select('*')
        .order('priority', { ascending: true });
      
      if (bannerError) throw bannerError;
      setBanners(bannerData || []);
    } catch (error) {
      console.error('Error al recargar banners:', error);
      setSnackbar({
        open: true,
        message: 'Error al recargar los banners. Por favor, inténtelo nuevamente.',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  // Cargar banners al montar el componente
  useEffect(() => {
    reloadBanners();
  }, []);

  // Cargar banners cuando se cierra el diálogo de edición
  useEffect(() => {
    if (!openDialog && !openDeleteDialog && !openViewDialog) {
      reloadBanners();
    }
  }, [openDialog, openDeleteDialog, openViewDialog]);

  // Handle form change
  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    console.log('Form change:', { name, value });
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Handle form reset
  const handleFormReset = () => {
    setFormData({
      title: '',
      description: '',
      image_url: '',
      link_url: '',
      target_section: 'home',
      start_date: new Date().toISOString(),
      end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      is_active: true,
      priority: banners.length > 0 ? Math.max(...banners.map(b => b.priority)) + 1 : 1,
      updated_at: new Date().toISOString()
    });
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log('Form submission:', formData);
    
    // Validate required fields
    if (!formData.title || !formData.image_url) {
      setSnackbar({
        open: true,
        message: 'Por favor complete todos los campos obligatorios',
        severity: 'error'
      });
      return;
    }

    try {
      if (currentBanner) {
        await updateBanner();
      } else {
        await createBanner();
      }
    } catch (error) {
      console.error('Error al guardar:', error);
      setSnackbar({
        open: true,
        message: error instanceof Error ? error.message : 'Error al guardar',
        severity: 'error'
      });
    }
  };

  // Open dialog
  const handleOpenDialog = (banner?: Banner) => {
    if (banner) {
      setCurrentBanner(banner);
      setFormData({
        title: banner.title,
        description: banner.description,
        image_url: banner.image_url,
        link_url: banner.link_url,
        target_section: banner.target_section,
        start_date: banner.start_date,
        end_date: banner.end_date,
        is_active: banner.is_active,
        priority: banner.priority,
        updated_at: banner.updated_at
      });
    } else {
      setCurrentBanner(null);
      handleFormReset();
    }
    setOpenDialog(true);
  };

  // Close dialog
  const handleCloseDialog = () => {
    setCurrentBanner(null);
    handleFormReset();
    setOpenDialog(false);
  };

  // Manejar apertura del diálogo de vista previa
  const handleOpenViewDialog = (banner: Banner) => {
    setCurrentBanner(banner);
    setOpenViewDialog(true);
  };

  // Manejar cierre del diálogo de vista previa
  const handleCloseViewDialog = () => {
    setOpenViewDialog(false);
  };

  // Manejar cambios en el formulario
  const handleStartDateChange = (date: Date | null) => {
    if (date) {
      setFormData(prev => ({ ...prev, start_date: date.toISOString() }));
    }
  };

  // Manejar cambio de fecha de fin
  const handleEndDateChange = (date: Date | null) => {
    if (date) {
      setFormData(prev => ({ ...prev, end_date: date.toISOString() }));
    }
  };

  // Manejar cambio de estado activo
  const handleActiveChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, is_active: e.target.checked }));
  };

  // Function to create a banner
  const createBanner = async () => {
    try {
      console.log('Starting banner creation...');
      
      // Verify session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        console.error('Session error:', sessionError);
        throw sessionError;
      }
      if (!session) {
        console.error('No session found');
        throw new Error('No session found');
      }
      console.log('Session verified');

      // Verify if user is admin
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('user_id', session.user.id)
        .single();

      if (profileError) {
        console.error('Profile error:', profileError);
        throw profileError;
      }
      if (!profile?.is_admin) {
        console.error('User is not an administrator');
        throw new Error('User is not an administrator');
      }
      console.log('User is admin');

      // Create banner
      const { data, error } = await supabase
        .from('banners')
        .insert([
          {
            title: formData.title,
            description: formData.description,
            image_url: formData.image_url,
            link_url: formData.link_url,
            target_section: formData.target_section,
            start_date: formData.start_date,
            end_date: formData.end_date,
            is_active: formData.is_active,
            priority: formData.priority,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        ])
        .select();

      if (error) {
        console.error('Error creating banner:', error);
        throw error;
      }

      console.log('Banner created successfully:', data);
      
      // Update local state
      if (data && data.length > 0) {
        setBanners([...banners, data[0]]);
        setSnackbar({
          open: true,
          message: 'Banner creado correctamente',
          severity: 'success'
        });
      } else {
        console.error('No data received from server');
        throw new Error('No se recibió respuesta del servidor');
      }

      // Close dialog
      handleCloseDialog();
    } catch (error) {
      console.error('Error al crear banner:', error);
      setSnackbar({
        open: true,
        message: error instanceof Error ? error.message : 'Error al crear el banner',
        severity: 'error'
      });
    }
  };

  // Function to update a banner
  const updateBanner = async () => {
    try {
      // Verify session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      if (!session) throw new Error('No session found');

      // Verify if user is admin
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('user_id', session.user.id)
        .single();

      if (profileError) throw profileError;
      if (!profile?.is_admin) throw new Error('User is not an administrator');

      // Update banner
      const { error } = await supabase
        .from('banners')
        .update({
          title: formData.title,
          description: formData.description,
          image_url: formData.image_url,
          link_url: formData.link_url,
          target_section: formData.target_section,
          start_date: formData.start_date,
          end_date: formData.end_date,
          is_active: formData.is_active,
          priority: formData.priority,
          updated_at: new Date().toISOString()
        })
        .eq('id', currentBanner?.id);

      if (error) throw error;

      // Update local state
      const updatedBanners = banners.map(b => 
        b.id === currentBanner?.id ? 
        { 
          ...b, 
          title: formData.title || b.title,
          description: formData.description || b.description,
          image_url: formData.image_url || b.image_url,
          link_url: formData.link_url || b.link_url,
          target_section: formData.target_section || b.target_section,
          start_date: formData.start_date || b.start_date,
          end_date: formData.end_date || b.end_date,
          is_active: formData.is_active !== undefined ? formData.is_active : b.is_active,
          priority: formData.priority !== undefined ? formData.priority : b.priority,
          updated_at: new Date().toISOString()
        } : b
      );
      setBanners(updatedBanners);
      setSnackbar({
        open: true,
        message: 'Banner actualizado correctamente',
        severity: 'success'
      });

      // Close dialog
      handleCloseDialog();
    } catch (error) {
      console.error('Error al actualizar banner:', error);
      setSnackbar({
        open: true,
        message: error instanceof Error ? error.message : 'Error al actualizar el banner',
        severity: 'error'
      });
    }
  };

  // Manejar apertura del diálogo de eliminación
  const handleOpenDeleteDialog = (banner: Banner) => {
    setCurrentBanner(banner);
    setOpenDeleteDialog(true);
  };

  // Manejar cierre del diálogo de eliminación
  const handleCloseDeleteDialog = () => {
    setOpenDeleteDialog(false);
  };

  // Manejar eliminación de banner
  const handleDeleteBanner = async () => {
    try {
      if (currentBanner) {
        // En una implementación real, aquí se eliminaría de la base de datos
        const { error } = await supabase
          .from('banners')
          .delete()
          .eq('id', currentBanner.id);

        if (error) throw error;

        // Actualizar estado local
        const updatedBanners = banners.filter(b => b.id !== currentBanner.id);
        setBanners(updatedBanners);
        setSnackbar({
          open: true,
          message: 'Banner eliminado correctamente',
          severity: 'success'
        });
      }
      handleCloseDeleteDialog();
    } catch (error) {
      console.error('Error al eliminar banner:', error);
      setSnackbar({
        open: true,
        message: 'Error al eliminar el banner',
        severity: 'error'
      });
    }
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

  // Verificar si un banner está activo actualmente
  const isCurrentlyActive = (banner: Banner) => {
    const now = new Date();
    const startDate = new Date(banner.start_date);
    const endDate = new Date(banner.end_date);
    return banner.is_active && now >= startDate && now <= endDate;
  };

  // Obtener el estado del banner
  const getBannerStatus = (banner: Banner) => {
    const now = new Date();
    const startDate = new Date(banner.start_date);
    const endDate = new Date(banner.end_date);
    
    if (!banner.is_active) {
      return { label: 'Inactivo', color: 'default' as 'default' };
    } else if (now < startDate) {
      return { label: 'Programado', color: 'info' as 'info' };
    } else if (now > endDate) {
      return { label: 'Expirado', color: 'error' as 'error' };
    } else {
      return { label: 'Activo', color: 'success' as 'success' };
    }
  };

  const verifyAdminStatus = useCallback(async () => {
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      if (!session) {
        console.log('No session found');
        setIsAdmin(false);
        return;
      }

      console.log('User ID:', session.user.id);

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('user_id', session.user.id)
        .single();

      if (profileError) {
        console.error('Profile error:', profileError);
        throw profileError;
      }

      const isAdmin = profile?.is_admin || false;
      console.log('Is admin:', isAdmin);
      setIsAdmin(isAdmin);
    } catch (error) {
      console.error('Error verifying admin status:', error);
      setIsAdmin(false);
    }
  }, []);

  useEffect(() => {
    verifyAdminStatus();
  }, [verifyAdminStatus]);

  useEffect(() => {
    const checkAndSetLoading = async () => {
      setLoading(true);
      await verifyAdminStatus();
      setLoading(false);
    };

    checkAndSetLoading();
  }, [verifyAdminStatus]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" gutterBottom fontWeight="600">
          Banners Promocionales
        </Typography>
        {/* FORZAR BOTÓN SIEMPRE VISIBLE PARA DEBUG */}
        <Button 
          variant="contained" 
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
          sx={{ 
            display: 'block',
            marginRight: 0
          }}
        >
          Nuevo Banner
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Imagen</TableCell>
              <TableCell>Título</TableCell>
              <TableCell>Descripción</TableCell>
              <TableCell>Sección</TableCell>
              <TableCell>Estado</TableCell>
              <TableCell>Prioridad</TableCell>
              <TableCell>Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {banners.map((banner) => (
              <TableRow key={banner.id}>
                <TableCell>
                  <Avatar src={banner.image_url} sx={{ width: 50, height: 50 }} />
                </TableCell>
                <TableCell>{banner.title}</TableCell>
                <TableCell>{banner.description}</TableCell>
                <TableCell>{banner.target_section}</TableCell>
                <TableCell>
                  <Chip
                    label={banner.is_active ? 'Activo' : 'Inactivo'}
                    color={banner.is_active ? 'success' : 'error'}
                  />
                </TableCell>
                <TableCell>{banner.priority}</TableCell>
                <TableCell>
                  <Tooltip title="Ver">
                    <IconButton onClick={() => handleOpenViewDialog(banner)}>
                      <ViewIcon />
                    </IconButton>
                  </Tooltip>
                  {isAdmin && (
                    <React.Fragment>
                      <Tooltip title="Editar">
                        <IconButton onClick={() => handleOpenDialog(banner)}>
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Eliminar">
                        <IconButton onClick={() => handleOpenDeleteDialog(banner)}>
                          <DeleteIcon />
                        </IconButton>
                      </Tooltip>
                    </React.Fragment>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Dialogos y otros componentes */}
      {/* --- FORMULARIO MODAL PARA CREAR/EDITAR BANNER --- */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{currentBanner ? 'Editar Banner' : 'Nuevo Banner'}</DialogTitle>
        <DialogContent>
          <Box component="form" sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Título"
              name="title"
              value={formData.title}
              onChange={handleFormChange}
              fullWidth
              required
            />
            <TextField
              label="Descripción"
              name="description"
              value={formData.description}
              onChange={handleFormChange}
              fullWidth
              multiline
              rows={2}
            />
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Button
                variant="outlined"
                component="label"
                startIcon={<UploadIcon />}
                sx={{ minWidth: 160 }}
              >
                Subir Imagen
                <input
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    // Subir a Supabase Storage
                    const fileName = `banner_${Date.now()}_${file.name}`;
                    const { data, error } = await supabase.storage
                      .from('banners')
                      .upload(fileName, file, { upsert: true });
                    if (error) {
                      setSnackbar({ open: true, message: 'Error al subir la imagen', severity: 'error' });
                    } else {
                      // Obtener URL pública
                      const { data: publicUrl } = supabase.storage.from('banners').getPublicUrl(fileName);
                      setFormData(prev => ({ ...prev, image_url: publicUrl.publicUrl }));
                      setSnackbar({ open: true, message: 'Imagen subida correctamente', severity: 'success' });
                    }
                  }}
                />
              </Button>
              {formData.image_url && (
                <Avatar src={formData.image_url} sx={{ width: 56, height: 56 }} variant="rounded" />
              )}
            </Box>
            <TextField
              label="URL de Link (opcional)"
              name="link_url"
              value={formData.link_url}
              onChange={handleFormChange}
              fullWidth
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <LinkIcon />
                  </InputAdornment>
                )
              }}
            />
            <FormControl fullWidth>
              <InputLabel id="target-section-label">Sección Destino</InputLabel>
              <Select
                labelId="target-section-label"
                name="target_section"
                value={formData.target_section}
                label="Sección Destino"
                onChange={e => handleFormChange(e as any)}
              >
                <MenuItem value="home">Home</MenuItem>
                <MenuItem value="explore">Explorar</MenuItem>
                <MenuItem value="offers">Ofertas</MenuItem>
              </Select>
            </FormControl>
            <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={es}>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <DatePicker
                    label="Fecha de Inicio"
                    value={formData.start_date ? new Date(formData.start_date) : null}
                    onChange={handleStartDateChange}
                    renderInput={(params) => <TextField {...params} fullWidth />}
                  />
                </Grid>
                <Grid item xs={6}>
                  <DatePicker
                    label="Fecha de Fin"
                    value={formData.end_date ? new Date(formData.end_date) : null}
                    onChange={handleEndDateChange}
                    renderInput={(params) => <TextField {...params} fullWidth />}
                  />
                </Grid>
              </Grid>
            </LocalizationProvider>
            <FormControlLabel
              control={
                <Switch
                  checked={!!formData.is_active}
                  onChange={handleActiveChange}
                  name="is_active"
                  color="primary"
                />
              }
              label="Activo"
            />
            <TextField
              label="Prioridad"
              name="priority"
              type="number"
              value={formData.priority}
              onChange={handleFormChange}
              fullWidth
              inputProps={{ min: 1 }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} color="secondary">
            Cancelar
          </Button>
          <Button onClick={handleSubmit} variant="contained" color="primary">
            {currentBanner ? 'Guardar Cambios' : 'Crear Banner'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Diálogo para eliminar banner */}
      <Dialog open={openDeleteDialog} onClose={handleCloseDeleteDialog}>
        <DialogTitle>Eliminar Banner</DialogTitle>
        <DialogContent>
          <Typography>¿Estás seguro de que deseas eliminar este banner?</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDeleteDialog} color="secondary">
            Cancelar
          </Button>
          <Button onClick={handleDeleteBanner} color="error" variant="contained">
            Eliminar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Diálogo para ver banner */}
      <Dialog open={openViewDialog} onClose={handleCloseViewDialog} maxWidth="xs" fullWidth>
        <DialogTitle>Vista Previa del Banner</DialogTitle>
        <DialogContent>
          {currentBanner && (
            <Box sx={{ textAlign: 'center', p: 2 }}>
              <Avatar src={currentBanner.image_url} sx={{ width: 120, height: 120, mx: 'auto', mb: 2 }} variant="rounded" />
              <Typography variant="h6">{currentBanner.title}</Typography>
              <Typography>{currentBanner.description}</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Sección: {currentBanner.target_section}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Vigencia: {formatDate(currentBanner.start_date)} - {formatDate(currentBanner.end_date)}
              </Typography>
              <Chip
                label={getBannerStatus(currentBanner).label}
                color={getBannerStatus(currentBanner).color}
                sx={{ mt: 2 }}
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseViewDialog} color="primary">
            Cerrar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar de feedback */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
      {/* --- FIN FORMULARIOS Y DIALOGOS --- */}
    </Box>
  );
}