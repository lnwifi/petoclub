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
  Switch,
  FormControlLabel,
  InputAdornment
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  Event as EventIcon,
  LocationOn as LocationIcon,
  AccessTime as TimeIcon
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { TimePicker } from '@mui/x-date-pickers/TimePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { es } from 'date-fns/locale';
import { PhotoCamera } from '@mui/icons-material';

// Tipo para los eventos
type Event = {
  id: string;
  title: string;
  description: string;
  image_url: string;
  location: string;
  event_date: string;
  start_time: string;
  end_time: string;
  event_type: string;
  is_featured: boolean;
  is_active: boolean;
  max_participants: number;
  current_participants: number;
  created_at: string;
  organizer_id?: string;
  organizer_name?: string;
};

export default function Eventos() {
  const { supabase } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [openViewDialog, setOpenViewDialog] = useState(false);
  const [currentEvent, setCurrentEvent] = useState<Event | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    image_url: '',
    location: '',
    event_date: new Date().toISOString(),
    start_time: '10:00',
    end_time: '12:00',
    event_type: 'adopcion',
    is_featured: false,
    is_active: true,
    max_participants: null as number | null,
    current_participants: 0
  });
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error' | 'info' | 'warning'
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  const uploadEventImage = async (file: File) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2,8)}.${fileExt}`;
    const filePath = `${fileName}`;
    const { error } = await supabase.storage.from('eventos').upload(filePath, file, { upsert: true });
    if (error) throw error;
    const { publicUrl } = supabase.storage.from('eventos').getPublicUrl(filePath).data;
    return publicUrl;
  };

  // Cargar eventos
  useEffect(() => {
    const fetchEvents = async () => {
      try {
        setLoading(true);
        
        // Obtener eventos de Supabase
        const { data: eventData, error: eventError } = await supabase
          .from('events')
          .select('*')
          .eq('is_active', true)
          .gte('event_date', new Date().toISOString().split('T')[0])
          .order('event_date', { ascending: true });
        
        if (eventError) throw eventError;
        setEvents(eventData || []);
        setLoading(false);
      } catch (error) {
        console.error('Error al cargar eventos:', error);
        setSnackbar({
          open: true,
          message: 'Error al cargar los eventos',
          severity: 'error'
        });
      }
    };

    fetchEvents();
  }, [supabase]);

  // Manejar apertura del diálogo de creación/edición
  const handleOpenDialog = (event?: Event) => {
    if (event) {
      setCurrentEvent(event);
      setFormData({
        title: event.title,
        description: event.description,
        image_url: event.image_url,
        location: event.location,
        event_date: event.event_date,
        start_time: event.start_time,
        end_time: event.end_time,
        event_type: event.event_type,
        is_featured: event.is_featured,
        is_active: event.is_active,
        max_participants: event.max_participants,
        current_participants: event.current_participants
      });
      setImageFile(null);
    } else {
      setCurrentEvent(null);
      setFormData({
        title: '',
        description: '',
        image_url: '',
        location: '',
        event_date: new Date().toISOString(),
        start_time: '10:00',
        end_time: '12:00',
        event_type: 'adopcion',
        is_featured: false,
        is_active: true,
        max_participants: null,
        current_participants: 0
      });
      setImageFile(null);
    }
    setOpenDialog(true);
  };

  // Manejar apertura del diálogo de vista previa
  const handleOpenViewDialog = (event: Event) => {
    setCurrentEvent(event);
    setOpenViewDialog(true);
  };

  // Manejar cierre del diálogo
  const handleCloseDialog = () => {
    setOpenDialog(false);
  };

  // Manejar cierre del diálogo de vista previa
  const handleCloseViewDialog = () => {
    setOpenViewDialog(false);
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
      setFormData(prev => ({ ...prev, event_date: date.toISOString() }));
    }
  };

  // Manejar cambio de hora de inicio
  const handleStartTimeChange = (time: Date | null) => {
    if (time) {
      const hours = time.getHours().toString().padStart(2, '0');
      const minutes = time.getMinutes().toString().padStart(2, '0');
      setFormData(prev => ({ ...prev, start_time: `${hours}:${minutes}` }));
    }
  };

  // Manejar cambio de hora de fin
  const handleEndTimeChange = (time: Date | null) => {
    if (time) {
      const hours = time.getHours().toString().padStart(2, '0');
      const minutes = time.getMinutes().toString().padStart(2, '0');
      setFormData(prev => ({ ...prev, end_time: `${hours}:${minutes}` }));
    }
  };

  // Manejar cambio de destacado
  const handleFeaturedChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, is_featured: e.target.checked }));
  };

  // Manejar cambio de activo
  const handleActiveChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, is_active: e.target.checked }));
  };

  // Manejar envío del formulario
  const handleSubmit = async () => {
    try {
      // Validar campos obligatorios
      if (!formData.title || !formData.location || !formData.event_date) {
        setSnackbar({
          open: true,
          message: 'Por favor complete todos los campos obligatorios',
          severity: 'error'
        });
        return;
      }

      // En una implementación real, aquí se enviaría a la base de datos
      if (currentEvent) {
        // Actualizar evento existente
        let imageUrl = formData.image_url || '';
        if (imageFile) {
          setUploadingImage(true);
          imageUrl = await uploadEventImage(imageFile);
          setUploadingImage(false);
        }
        const { error } = await supabase
          .from('events')
          .update({
            title: formData.title,
            description: formData.description,
            image_url: imageUrl,
            location: formData.location,
            event_date: formData.event_date,
            start_time: formData.start_time,
            end_time: formData.end_time,
            event_type: formData.event_type,
            is_featured: formData.is_featured,
            is_active: formData.is_active,
            max_participants: formData.max_participants,
            current_participants: formData.current_participants
          })
          .eq('id', currentEvent.id);

        if (error) throw error;

        // Actualizar estado local
        const updatedEvents = events.map(e => 
          e.id === currentEvent.id ? 
          { 
            ...e, 
            title: formData.title || e.title,
            description: formData.description || e.description,
            image_url: imageUrl || e.image_url,
            location: formData.location || e.location,
            event_date: formData.event_date || e.event_date,
            start_time: formData.start_time || e.start_time,
            end_time: formData.end_time || e.end_time,
            event_type: formData.event_type || e.event_type,
            is_featured: formData.is_featured !== undefined ? formData.is_featured : e.is_featured,
            is_active: formData.is_active !== undefined ? formData.is_active : e.is_active,
            max_participants: formData.max_participants !== undefined ? formData.max_participants : e.max_participants,
            current_participants: formData.current_participants !== undefined ? formData.current_participants : e.current_participants
          } : e
        );
        setEvents(updatedEvents);
        setSnackbar({
          open: true,
          message: 'Evento actualizado correctamente',
          severity: 'success'
        });
      } else {
        // Crear nuevo evento
        let imageUrl = '';
        if (imageFile) {
          setUploadingImage(true);
          imageUrl = await uploadEventImage(imageFile);
          setUploadingImage(false);
        }
        const { data, error } = await supabase
          .from('events')
          .insert([
            {
              title: formData.title,
              description: formData.description,
              image_url: imageUrl,
              location: formData.location,
              event_date: formData.event_date,
              start_time: formData.start_time,
              end_time: formData.end_time,
              event_type: formData.event_type,
              is_featured: formData.is_featured,
              is_active: formData.is_active,
              max_participants: formData.max_participants,
              current_participants: formData.current_participants,
              created_at: new Date().toISOString(),
              organizer_id: null, // En una implementación real, aquí iría el ID del organizador
              organizer_name: 'PetoClub' // En una implementación real, aquí iría el nombre del organizador
            }
          ])
          .select();

        if (error) throw error;

        // Actualizar estado local
        if (data && data.length > 0) {
          setEvents([...events, data[0]]);
        } else {
          // Fallback para demo
          const newEvent: Event = {
            id: `${Date.now()}`,
            title: formData.title || '',
            description: formData.description || '',
            image_url: imageUrl || '',
            location: formData.location || '',
            event_date: formData.event_date || new Date().toISOString(),
            start_time: formData.start_time || '10:00',
            end_time: formData.end_time || '12:00',
            event_type: formData.event_type || 'adopcion',
            is_featured: formData.is_featured !== undefined ? formData.is_featured : false,
            is_active: formData.is_active !== undefined ? formData.is_active : true,
            max_participants: formData.max_participants,
            current_participants: formData.current_participants,
            created_at: new Date().toISOString(),
            organizer_name: 'PetoClub'
          };
          setEvents([...events, newEvent]);
        }
        
        setSnackbar({
          open: true,
          message: 'Evento creado correctamente',
          severity: 'success'
        });
      }
    } catch (error) {
      setUploadingImage(false);
      console.error('Error al guardar el evento:', error);
      setSnackbar({
        open: true,
        message: 'Error al guardar el evento',
        severity: 'error'
      });
    } finally {
      handleCloseDialog();
      setImageFile(null);
    }
  };

  // Manejar apertura del diálogo de eliminación
  const handleOpenDeleteDialog = (event: Event) => {
    setCurrentEvent(event);
    setOpenDeleteDialog(true);
  };

  // Manejar cierre del diálogo de eliminación
  const handleCloseDeleteDialog = () => {
    setOpenDeleteDialog(false);
  };

  // Manejar eliminación de evento
  const handleDeleteEvent = async () => {
    try {
      if (currentEvent) {
        // En una implementación real, aquí se eliminaría de la base de datos
        const { error } = await supabase
          .from('events')
          .delete()
          .eq('id', currentEvent.id);

        if (error) throw error;

        // Actualizar estado local
        const updatedEvents = events.filter(e => e.id !== currentEvent.id);
        setEvents(updatedEvents);
        setSnackbar({
          open: true,
          message: 'Evento eliminado correctamente',
          severity: 'success'
        });
      }
      handleCloseDeleteDialog();
    } catch (error) {
      console.error('Error al eliminar evento:', error);
      setSnackbar({
        open: true,
        message: 'Error al eliminar el evento',
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

  // Verificar si un evento ya pasó
  const isPastEvent = (eventDate: string) => {
    return new Date(eventDate) < new Date();
  };

  // Obtener el tipo de evento formateado
  const getEventTypeLabel = (type: string) => {
    const types: Record<string, { label: string, color: 'primary' | 'secondary' | 'success' | 'error' | 'info' | 'warning' }> = {
      'adopcion': { label: 'Adopción', color: 'primary' },
      'salud': { label: 'Salud', color: 'success' },
      'educacion': { label: 'Educación', color: 'info' },
      'recaudacion': { label: 'Recaudación', color: 'secondary' },
      'otro': { label: 'Otro', color: 'warning' }
    };
    
    return types[type] || { label: 'Otro', color: 'default' };
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
          Eventos
        </Typography>
        <Button 
          variant="contained" 
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
        >
          Nuevo Evento
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table sx={{ minWidth: 650 }}>
          <TableHead>
            <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
              <TableCell>Título</TableCell>
              <TableCell>Fecha</TableCell>
              <TableCell>Ubicación</TableCell>
              <TableCell>Tipo</TableCell>
              <TableCell>Estado</TableCell>
              <TableCell>Participantes</TableCell>
              <TableCell align="center">Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {events.map((event) => (
              <TableRow key={event.id}>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <EventIcon sx={{ mr: 1, color: 'primary.main' }} />
                    <Box>
                      <Typography fontWeight="medium">{event.title}</Typography>
                      {event.is_featured && (
                        <Chip 
                          label="Destacado" 
                          color="secondary" 
                          size="small" 
                          sx={{ mt: 0.5 }}
                        />
                      )}
                    </Box>
                  </Box>
                </TableCell>
                <TableCell>
                  <Typography variant="body2">
                    {formatDate(event.event_date)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {event.start_time} - {event.end_time}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <LocationIcon fontSize="small" sx={{ mr: 0.5, color: 'text.secondary' }} />
                    <Typography variant="body2">{event.location}</Typography>
                  </Box>
                </TableCell>
                <TableCell>
                  <Chip 
                    label={getEventTypeLabel(event.event_type).label} 
                    color={getEventTypeLabel(event.event_type).color} 
                    size="small" 
                  />
                </TableCell>
                <TableCell>
                  <Chip 
                    label={isPastEvent(event.event_date) ? 'Finalizado' : (event.is_active ? 'Activo' : 'Inactivo')} 
                    color={isPastEvent(event.event_date) ? 'default' : (event.is_active ? 'success' : 'error')} 
                    size="small" 
                  />
                </TableCell>
                <TableCell>
                  <Typography variant="body2">
                    {event.max_participants !== null 
                      ? `${event.current_participants || 0} / ${event.max_participants}`
                      : `${event.current_participants || 0} (Sin límite)`
                    }
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
                    <Typography variant="body2" sx={{ mr: 1 }}>
                      {event.current_participants} / {event.max_participants}
                    </Typography>
                    <Box 
                      sx={{ 
                        flexGrow: 1,
                        backgroundColor: '#eee', 
                        height: 8, 
                        borderRadius: 4
                      }}
                    >
                      <Box 
                        sx={{ 
                          width: `${(event.current_participants / (event.max_participants || 1)) * 100}%`, 
                          backgroundColor: 'primary.main', 
                          height: 8, 
                          borderRadius: 4 
                        }} 
                      />
                    </Box>
                  </Box>
                </TableCell>
                <TableCell align="center">
                  <Tooltip title="Ver">
                    <IconButton onClick={() => handleOpenViewDialog(event)}>
                      <ViewIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Editar">
                    <IconButton onClick={() => handleOpenDialog(event)}>
                      <EditIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Eliminar">
                    <IconButton onClick={() => handleOpenDeleteDialog(event)}>
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
          {currentEvent ? `Editar ${currentEvent.title}` : 'Crear Nuevo Evento'}
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
                name="image_url"
                label="URL de la imagen"
                fullWidth
                value={formData.image_url}
                onChange={handleFormChange}
              />
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
            <Grid item xs={12}>
              <Button
                variant="outlined"
                component="label"
                startIcon={<PhotoCamera />}
                fullWidth
                sx={{ mb: 1 }}
                disabled={uploadingImage}
              >
                {formData.image_url || imageFile ? 'Cambiar imagen' : 'Subir imagen'}
                <input
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={e => {
                    if (e.target.files && e.target.files[0]) {
                      setImageFile(e.target.files[0]);
                      setFormData(prev => ({ ...prev, image_url: '' }));
                    }
                  }}
                />
              </Button>
              {(imageFile || formData.image_url) && (
                <Box mt={1} mb={1} display="flex" justifyContent="center">
                  <img
                    src={imageFile ? URL.createObjectURL(imageFile) : formData.image_url}
                    alt="Evento"
                    style={{ maxHeight: 180, borderRadius: 8, boxShadow: '0 1px 8px #0002' }}
                  />
                </Box>
              )}
              {uploadingImage && <Typography color="primary">Subiendo imagen...</Typography>}
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                name="location"
                label="Ubicación *"
                fullWidth
                value={formData.location}
                onChange={handleFormChange}
                required
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <LocationIcon />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel id="event-type-label">Tipo de evento *</InputLabel>
                <Select
                  labelId="event-type-label"
                  name="event_type"
                  value={formData.event_type}
                  label="Tipo de evento *"
                  onChange={handleFormChange}
                  required
                >
                  <MenuItem value="adopcion">Adopción</MenuItem>
                  <MenuItem value="salud">Salud</MenuItem>
                  <MenuItem value="educacion">Educación</MenuItem>
                  <MenuItem value="recaudacion">Recaudación</MenuItem>
                  <MenuItem value="otro">Otro</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={4}>
              <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={es}>
                <DatePicker
                  label="Fecha del evento *"
                  value={new Date(formData.event_date || new Date())}
                  onChange={handleDateChange}
                  slotProps={{ textField: { fullWidth: true } }}
                />
              </LocalizationProvider>
            </Grid>
            <Grid item xs={12} md={4}>
              <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={es}>
                <TimePicker
                  label="Hora de inicio *"
                  value={new Date(`2023-01-01T${formData.start_time}:00`)}
                  onChange={handleStartTimeChange}
                  slotProps={{ textField: { fullWidth: true } }}
                />
              </LocalizationProvider>
            </Grid>
            <Grid item xs={12} md={4}>
              <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={es}>
                <TimePicker
                  label="Hora de fin *"
                  value={new Date(`2023-01-01T${formData.end_time}:00`)}
                  onChange={handleEndTimeChange}
                  slotProps={{ textField: { fullWidth: true } }}
                />
              </LocalizationProvider>
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                name="max_participants"
                label="Máximo de participantes"
                type="number"
                fullWidth
                value={formData.max_participants || ''}
                onChange={(e) => {
                  const value = e.target.value;
                  setFormData({
                    ...formData,
                    max_participants: value ? parseInt(value, 10) : null
                  });
                }}
                inputProps={{ min: 1 }}
                helperText="Deja vacío si no hay límite"
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.is_featured}
                    onChange={handleFeaturedChange}
                    name="is_featured"
                    color="secondary"
                  />
                }
                label="Destacar evento"
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.is_active}
                    onChange={handleActiveChange}
                    name="is_active"
                    color="primary"
                  />
                }
                label="Evento activo"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancelar</Button>
          <Button onClick={handleSubmit} variant="contained">
            {currentEvent ? 'Actualizar' : 'Crear'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Diálogo de vista previa */}
      <Dialog open={openViewDialog} onClose={handleCloseViewDialog} maxWidth="md" fullWidth>
        <DialogTitle>Vista previa del evento</DialogTitle>
        <DialogContent>
          {currentEvent && (
            <Box sx={{ mt: 2 }}>
              {currentEvent.image_url && (
                <Box 
                  component="img" 
                  src={currentEvent.image_url} 
                  alt={currentEvent.title}
                  sx={{ 
                    width: '100%', 
                    maxHeight: 300, 
                    objectFit: 'cover', 
                    borderRadius: 1,
                    mb: 2
                  }}
                />
              )}
              <Typography variant="h6" gutterBottom>
                {currentEvent.title}
              </Typography>
              <Typography variant="body1" paragraph>
                {currentEvent.description}
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Fecha y hora:
                  </Typography>
                  <Typography variant="body2">
                    {formatDate(currentEvent.event_date)}, {currentEvent.start_time} - {currentEvent.end_time}
                  </Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Ubicación:
                  </Typography>
                  <Typography variant="body2">
                    {currentEvent.location}
                  </Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Tipo de evento:
                  </Typography>
                  <Chip 
                    label={getEventTypeLabel(currentEvent.event_type).label}
                    color={getEventTypeLabel(currentEvent.event_type).color}
                    size="small"
                    sx={{ mt: 0.5 }}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Estado:
                  </Typography>
                  <Chip 
                    label={isPastEvent(currentEvent.event_date) ? 'Finalizado' : (currentEvent.is_active ? 'Activo' : 'Inactivo')}
                    color={isPastEvent(currentEvent.event_date) ? 'default' : (currentEvent.is_active ? 'success' : 'error')}
                    size="small"
                    sx={{ mt: 0.5 }}
                  />
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Participantes:
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
                    <Typography variant="body2" sx={{ mr: 1 }}>
                      {currentEvent.current_participants} / {currentEvent.max_participants}
                    </Typography>
                    <Box 
                      sx={{ 
                        flexGrow: 1,
                        backgroundColor: '#eee', 
                        height: 8, 
                        borderRadius: 4
                      }}
                    >
                      <Box 
                        sx={{ 
                          width: `${(currentEvent.current_participants / currentEvent.max_participants) * 100}%`, 
                          backgroundColor: 'primary.main', 
                          height: 8, 
                          borderRadius: 4 
                        }} 
                      />
                    </Box>
                  </Box>
                </Grid>
                {currentEvent.organizer_name && (
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Organizador:
                    </Typography>
                    <Typography variant="body2">
                      {currentEvent.organizer_name}
                    </Typography>
                  </Grid>
                )}
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseViewDialog}>Cerrar</Button>
          {currentEvent && (
            <Button 
              onClick={() => {
                handleCloseViewDialog();
                handleOpenDialog(currentEvent);
              }} 
              variant="contained"
            >
              Editar
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Diálogo de eliminación */}
      <Dialog open={openDeleteDialog} onClose={handleCloseDeleteDialog}>
        <DialogTitle>Confirmar eliminación</DialogTitle>
        <DialogContent>
          <Typography>
            ¿Está seguro que desea eliminar el evento "{currentEvent?.title}"?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDeleteDialog}>Cancelar</Button>
          <Button onClick={handleDeleteEvent} color="error">
            Eliminar
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snackbar.open} autoHideDuration={6000} onClose={handleCloseSnackbar}>
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}