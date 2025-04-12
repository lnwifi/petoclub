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
  AccessTime as TimeIcon,
  Image as ImageIcon
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { TimePicker } from '@mui/x-date-pickers/TimePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { es } from 'date-fns/locale';

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
  const [formData, setFormData] = useState<Partial<Event>>({
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
    max_participants: 50,
    current_participants: 0
  });
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error' | 'info' | 'warning'
  });

  // Cargar eventos
  useEffect(() => {
    const fetchEvents = async () => {
      try {
        setLoading(true);
        
        // Obtener eventos de Supabase
        const { data: eventData, error: eventError } = await supabase
          .from('events')
          .select('*')
          .order('event_date', { ascending: true });
        
        if (eventError) throw eventError;
        
        // Si no hay datos reales, usar datos de ejemplo
        if (!eventData || eventData.length === 0) {
          // Datos de ejemplo
          const mockEvents: Event[] = [
            {
              id: '1',
              title: 'Jornada de adopción',
              description: 'Ven a conocer a nuestros amigos peludos que buscan un hogar',
              image_url: 'https://images.unsplash.com/photo-1548199973-03cce0bbc87b',
              location: 'Parque Centenario, Buenos Aires',
              event_date: '2024-01-15T00:00:00Z',
              start_time: '10:00',
              end_time: '16:00',
              event_type: 'adopcion',
              is_featured: true,
              is_active: true,
              max_participants: 100,
              current_participants: 45,
              created_at: '2023-12-01T10:30:00Z',
              organizer_name: 'Refugio Patitas Felices'
            },
            {
              id: '2',
              title: 'Campaña de vacunación gratuita',
              description: 'Vacunación antirrábica para perros y gatos',
              image_url: 'https://images.unsplash.com/photo-1612531385446-f7e6d131e1d0',
              location: 'Plaza San Martín, Córdoba',
              event_date: '2024-02-20T00:00:00Z',
              start_time: '09:00',
              end_time: '14:00',
              event_type: 'salud',
              is_featured: false,
              is_active: true,
              max_participants: 200,
              current_participants: 0,
              created_at: '2023-12-15T14:45:00Z',
              organizer_name: 'Municipalidad de Córdoba'
            },
            {
              id: '3',
              title: 'Taller de adiestramiento canino',
              description: 'Aprende técnicas básicas para educar a tu mascota',
              image_url: 'https://images.unsplash.com/photo-1534361960057-19889db9621e',
              location: 'Club Canino, Rosario',
              event_date: '2024-01-30T00:00:00Z',
              start_time: '15:00',
              end_time: '17:30',
              event_type: 'educacion',
              is_featured: true,
              is_active: true,
              max_participants: 30,
              current_participants: 25,
              created_at: '2023-12-10T09:15:00Z',
              organizer_name: 'Club Canino Rosario'
            }
          ];
          setEvents(mockEvents);
        } else {
          // Transformar datos reales al formato esperado
          setEvents(eventData);
        }
      } catch (error) {
        console.error('Error al cargar eventos:', error);
        setSnackbar({
          open: true,
          message: 'Error al cargar los eventos',
          severity: 'error'
        });
      } finally {
        setLoading(false);
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
        max_participants: 50,
        current_participants: 0
      });
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
        const { error } = await supabase
          .from('events')
          .update({
            title: formData.title,
            description: formData.description,
            image_url: formData.image_url,
            location: formData.location,
            event_date: formData.event_date,
            start_time: formData.start_time,
            end_time: formData.end_time,
            event_type: formData.event_type,
            is_featured: formData.is_featured,
            is_active: formData.is_active,
            max_participants: formData.max_participants
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
            image_url: formData.image_url || e.image_url,
            location: formData.location || e.location,
            event_date: formData.event_date || e.event_date,
            start_time: formData.start_time || e.start_time,
            end_time: formData.end_time || e.end_time,
            event_type: formData.event_type || e.event_type,
            is_featured: formData.is_featured !== undefined ? formData.is_featured : e.is_featured,
            is_active: formData.is_active !== undefined ? formData.is_active : e.is_active,
            max_participants: formData.max_participants !== undefined ? formData.max_participants : e.max_participants
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
        const { data, error } = await supabase
          .from('events')
          .insert([
            {
              title: formData.title,
              description: formData.description,
              image_url: formData.image_url,
              location: formData.location,
              event_date: formData.event_date,
              start_time: formData.start_time,
              end_time: formData.end_time,
              event_type: formData.event_type,
              is_featured: formData.is_featured,
              is_active: formData.is_active,
              max_participants: formData.max_participants,
              current_participants: 0,
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
            image_url: formData.image_url || '',
            location: formData.location || '',
            event_date: formData.event_date || new Date().toISOString(),
            start_time: formData.start_time || '10:00',
            end_time: formData.end_time || '12:00',
            event_type: formData.event_type || 'adopcion',
            is_featured: formData.is_featured !== undefined ? formData.is_featured : false,
            is_active: formData.is_active !== undefined ? formData.is_active : true,
            max_participants: formData.max_participants || 50,
            current_participants: 0,
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
      console.error('Error al guardar el evento:', error);
      setSnackbar({
        open: true,
        message: 'Error al guardar el evento',
        severity: 'error'
      });
    } finally {
      handleCloseDialog();
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
                    {event.current_participants} / {event.max_participants}
                  </Typography>
                  <Box 
                    sx={{ 
                      width: '100%', 
                      backgroundColor: '#eee', 
                      height: 4, 
                      borderRadius: 2,
                      mt: 0.5
                    }}
                  >
                    <Box 
                      sx={{ 
                        width: `${(event.current_participants / event.max_participants) * 100}%`, 
                        backgroundColor: 'primary.main', 
                        height: 4, 
                        borderRadius: 2 
                      }} 
                    />
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
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton edge="end">
                        <ImageIcon />
                      </IconButton>
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
                rows={3}
                value={formData.description}
                onChange={handleFormChange}
              />
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
                fullWidth
                type="number"
                value={formData.max_participants}
                onChange={handleFormChange}
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