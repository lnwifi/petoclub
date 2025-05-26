import { useState, useEffect, useRef } from 'react';
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
type Mascota = {
  id: string;
  name: string;
  description: string;
  age: string;
  size: string;
  image: string;
};

type CausaUrgente = {
  id: string;
  title: string;
  description: string;
  goal: number;
  current: number;
  image: string;
};

type Refugio = {
  id: string;
  name: string;
  description: string;
  address: string;
  phone: string;
  email: string;
  bank_account: string;
  image: string;
  mascotas: Mascota[];
  causas_urgentes: CausaUrgente[];
  created_at: string;
};

export default function Refugios() {
  const { supabase } = useAuth();
  const [refugios, setRefugios] = useState<Refugio[]>([]);
  const [loading, setLoading] = useState(true);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' | 'info' | 'warning' });

  // Dialogos y formularios
  const [openDialog, setOpenDialog] = useState(false);
  const [currentRefugio, setCurrentRefugio] = useState<Refugio | null>(null);
  const [formData, setFormData] = useState<Partial<Refugio>>({ 
    name: '', 
    description: '', 
    address: '', 
    phone: '', 
    email: '', 
    bank_account: '', 
    image: '', 
    mascotas: [], 
    causas_urgentes: [] 
  });

  // Manejar cambios en mascotas
  const handleMascotaChange = (idx: number, field: keyof Mascota, value: string | number) => {
    setFormData(prev => {
      const newMascotas = [...(prev.mascotas || [])];
      newMascotas[idx] = {
        ...newMascotas[idx],
        [field]: value
      };
      return { ...prev, mascotas: newMascotas };
    });
  };

  // Manejar cambios en causas urgentes
  const handleCausaUrgenteChange = (idx: number, field: keyof CausaUrgente, value: string | number) => {
    setFormData(prev => {
      const newCausas = [...(prev.causas_urgentes || [])];
      newCausas[idx] = {
        ...newCausas[idx],
        [field]: value
      };
      return { ...prev, causas_urgentes: newCausas };
    });
  };

  // Referencias para inputs de archivos
  const logoInputRef = useRef<HTMLInputElement>(null);
  const mascotaInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Subir imagen a Supabase Storage
  const uploadImage = async (file: File, path: string) => {
    const { data, error } = await supabase.storage.from('refugios').upload(path, file, { upsert: true });
    if (error) throw error;
    // Devuelve la URL pública
    const { publicUrl } = supabase.storage.from('refugios').getPublicUrl(path).data;
    return publicUrl;
  };

  // --- CRUD REFUGIOS ---
  const fetchRefugios = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('refugios')
      .select('*')
      .order('name');
    if (!error) {
      // Normaliza los arrays para evitar nulls
      const normalizados = (data || []).map(r => ({
        ...r,
        mascotas: Array.isArray(r.mascotas) ? r.mascotas : [],
        causas_urgentes: Array.isArray(r.causas_urgentes) ? r.causas_urgentes : [],
      }));
      setRefugios(normalizados);
    }
    setLoading(false);
  };

  const handleSubmitRefugio = async () => {
    setLoading(true);
    try {
      console.log('Datos a guardar:', formData); // Debug: muestra los datos que se van a guardar
      
      // Preparar el payload asegurando que mascotas y causas_urgentes sean arrays
      const payload = {
        ...formData,
        mascotas: Array.isArray(formData.mascotas) ? formData.mascotas : [],
        causas_urgentes: Array.isArray(formData.causas_urgentes) ? formData.causas_urgentes : [],
      };

      let error;
      if (currentRefugio) {
        ({ error } = await supabase.from('refugios').update(payload).eq('id', currentRefugio.id));
      } else {
        ({ error } = await supabase.from('refugios').insert([payload]));
      }

      setSnackbar({ open: true, message: error ? 'Error al guardar refugio' : 'Refugio guardado', severity: error ? 'error' : 'success' });
      setOpenDialog(false);
      await fetchRefugios();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRefugios(); }, []);

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
          onClick={() => setOpenDialog(true)}
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
              <TableCell>Mascotas</TableCell>
              <TableCell>Causas urgentes</TableCell>
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
                  <Chip 
                    label={`${refugio.mascotas.length} mascotas`} 
                    color="primary" 
                    variant="outlined" 
                  />
                </TableCell>
                <TableCell>
                  <Chip 
                    label={`${refugio.causas_urgentes.length} causas urgentes`} 
                    color="primary" 
                    variant="outlined" 
                  />
                </TableCell>
                <TableCell align="center">
                  <Tooltip title="Ver detalles">
                    <IconButton onClick={() => setCurrentRefugio(refugio)}>
                      <ViewIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Editar">
                    <IconButton onClick={() => {
                      setCurrentRefugio(refugio);
                      setFormData({
                        name: refugio.name,
                        description: refugio.description,
                        address: refugio.address,
                        phone: refugio.phone,
                        email: refugio.email,
                        bank_account: refugio.bank_account,
                        image: refugio.image,
                        mascotas: Array.isArray(refugio.mascotas) ? refugio.mascotas : [],
                        causas_urgentes: Array.isArray(refugio.causas_urgentes) ? refugio.causas_urgentes : [],
                      });
                      setOpenDialog(true);
                    }}>
                      <EditIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Eliminar">
                    <IconButton onClick={() => {
                      setCurrentRefugio(refugio);
                      // Eliminar refugio
                    }}>
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
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 2, bgcolor: 'primary.main', color: 'white', py: 2, mb: 1 }}>
          <Avatar src={formData.image} sx={{ width: 60, height: 60, mr: 2, bgcolor: 'grey.200', border: '2px solid white' }} variant="rounded">
            {!formData.image && formData.name?.[0]}
          </Avatar>
          <Box>
            <Typography variant="h5" fontWeight="bold">
              {currentRefugio ? `Editar Refugio` : 'Crear Nuevo Refugio'}
            </Typography>
            <Typography variant="subtitle1" sx={{ opacity: 0.8 }}>
              {formData.name || 'Completa los datos para tu refugio'}
            </Typography>
          </Box>
        </DialogTitle>
        <DialogContent dividers sx={{ background: '#f8fafc', px: 4, py: 3 }}>
          <Grid container spacing={4}>
            {/* Logo y nombre */}
            <Grid item xs={12} md={4}>
              <Paper elevation={1} sx={{ p: 3, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, bgcolor: '#f1f5f9', borderRadius: 3 }}>
                <Avatar src={formData.image} sx={{ width: 90, height: 90, mb: 1, bgcolor: 'grey.200', border: '2px solid #1976d2' }} variant="rounded">
                  {!formData.image && formData.name?.[0]}
                </Avatar>
                <Button
                  variant="contained"
                  component="label"
                  size="small"
                  sx={{ borderRadius: 2 }}
                >
                  Subir Logo
                  <input
                    type="file"
                    accept="image/*"
                    hidden
                    ref={logoInputRef}
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        try {
                          const url = await uploadImage(file, `logos/${crypto.randomUUID()}-${file.name}`);
                          setFormData(prev => ({ ...prev, image: url }));
                          setSnackbar({ open: true, message: 'Logo subido correctamente', severity: 'success' });
                        } catch (err) {
                          setSnackbar({ open: true, message: 'Error al subir logo', severity: 'error' });
                        }
                      }
                    }}
                  />
                </Button>
              </Paper>
            </Grid>
            <Grid item xs={12} md={8}>
              <Paper elevation={1} sx={{ p: 3, bgcolor: '#f1f5f9', borderRadius: 3 }}>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <TextField
                      name="name"
                      label="Nombre del refugio *"
                      fullWidth
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }))}
                      InputProps={{ sx: { fontWeight: 'bold', fontSize: 22 } }}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      name="description"
                      label="Descripción *"
                      fullWidth
                      multiline
                      minRows={3}
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }))}
                    />
                  </Grid>
                </Grid>
              </Paper>
            </Grid>

            {/* Datos de contacto y bancarios */}
            <Grid item xs={12} md={6}>
              <Paper elevation={1} sx={{ p: 3, bgcolor: '#f1f5f9', borderRadius: 3 }}>
                <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 2, color: 'primary.main' }}>Contacto</Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      name="address"
                      label="Dirección *"
                      fullWidth
                      value={formData.address}
                      onChange={(e) => setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }))}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      name="phone"
                      label="Teléfono *"
                      fullWidth
                      value={formData.phone}
                      onChange={(e) => setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }))}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      name="email"
                      label="Correo electrónico"
                      fullWidth
                      value={formData.email}
                      onChange={(e) => setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }))}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      name="bank_account"
                      label="Cuenta bancaria"
                      fullWidth
                      value={formData.bank_account}
                      onChange={(e) => setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }))}
                    />
                  </Grid>
                </Grid>
              </Paper>
            </Grid>

            {/* Mascotas para adoptar */}
            <Grid item xs={12} md={6}>
              <Paper elevation={1} sx={{ p: 3, bgcolor: '#f1f5f9', borderRadius: 3 }}>
                <Box mb={2} display="flex" alignItems="center" gap={1}>
                  <Typography variant="subtitle1" fontWeight="bold" color="primary.main">Mascotas para adoptar</Typography>
                  <Button
                    variant="outlined"
                    startIcon={<AddIcon />}
                    size="small"
                    onClick={() => {
                      const nuevaMascota = {
                        id: crypto.randomUUID(),
                        name: '',
                        description: '',
                        image: '',
                        age: '',
                        size: ''
                      };
                      setFormData(prev => ({
                        ...prev,
                        mascotas: [...(prev.mascotas || []), nuevaMascota]
                      }));
                    }}
                    sx={{ ml: 'auto' }}
                  >
                    Agregar mascota
                  </Button>
                </Box>
                <Grid container spacing={2}>
                  {(formData.mascotas || []).map((mascota, idx) => (
                    <Grid item xs={12} key={mascota.id || idx}>
                      <Paper elevation={0} sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2, bgcolor: '#e0e7ef', borderRadius: 2 }}>
                        <Avatar src={mascota.image} alt={mascota.name} sx={{ width: 50, height: 50, bgcolor: 'grey.100' }} variant="rounded" />
                        <Box flexGrow={1}>
                          <TextField
                            label="Nombre"
                            value={mascota.name}
                            onChange={e => handleMascotaChange(idx, 'name', e.target.value)}
                            fullWidth
                            sx={{ mb: 1 }}
                          />
                          <TextField
                            label="Descripción"
                            value={mascota.description}
                            onChange={e => handleMascotaChange(idx, 'description', e.target.value)}
                            fullWidth
                            multiline
                            minRows={2}
                          />
                        </Box>
                        <Box display="flex" flexDirection="column" alignItems="center" gap={1}>
                          <Button
                            variant="text"
                            component="label"
                            size="small"
                            sx={{ minWidth: 0 }}
                          >
                            <AddIcon fontSize="small" />
                            <input
                              type="file"
                              accept="image/*"
                              hidden
                              ref={el => (mascotaInputRefs.current[idx] = el)}
                              onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  try {
                                    const url = await uploadImage(file, `mascotas/${crypto.randomUUID()}-${file.name}`);
                                    setFormData(prev => ({
                                      ...prev,
                                      mascotas: prev.mascotas.map((m, i) => i === idx ? { ...m, image: url } : m)
                                    }));
                                    setSnackbar({ open: true, message: 'Foto de mascota subida', severity: 'success' });
                                  } catch (err) {
                                    setSnackbar({ open: true, message: 'Error al subir foto', severity: 'error' });
                                  }
                                }
                              }}
                            />
                          </Button>
                          <IconButton color="error" size="small" onClick={() => {
                            setFormData(prev => ({
                              ...prev,
                              mascotas: (prev.mascotas || []).filter((m, i) => i !== idx)
                            }));
                          }}>
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Box>
                      </Paper>
                    </Grid>
                  ))}
                </Grid>
              </Paper>
            </Grid>

            {/* Causas urgentes */}
            <Grid item xs={12}>
              <Paper elevation={1} sx={{ p: 3, bgcolor: '#f1f5f9', borderRadius: 3 }}>
                <Box mb={2} display="flex" alignItems="center" gap={1}>
                  <Typography variant="subtitle1" fontWeight="bold" color="primary.main">Causas urgentes</Typography>
                  <Button
                    variant="outlined"
                    startIcon={<AddIcon />}
                    size="small"
                    onClick={() => {
                      const nuevaCausa = {
                        id: crypto.randomUUID(),
                        title: '',
                        description: '',
                        image: '',
                        goal: 0,
                        current: 0
                      };
                      setFormData(prev => ({
                        ...prev,
                        causas_urgentes: [...(prev.causas_urgentes || []), nuevaCausa]
                      }));
                    }}
                    sx={{ ml: 'auto' }}
                  >
                    Agregar causa urgente
                  </Button>
                </Box>
                <Grid container spacing={2}>
                  {(formData.causas_urgentes || []).map((causa, idx) => (
                    <Grid item xs={12} sm={6} md={4} key={causa.id || idx}>
                      <Paper elevation={0} sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1, alignItems: 'center', bgcolor: '#e0e7ef', borderRadius: 2 }}>
                        <Avatar src={causa.image} alt={causa.title} sx={{ width: 48, height: 48, bgcolor: 'grey.100', mb: 1 }} variant="rounded" />
                        <Button
                          variant="text"
                          component="label"
                          size="small"
                          sx={{ mb: 1 }}
                        >
                          <AddIcon fontSize="small" />
                          <input
                            type="file"
                            accept="image/*"
                            hidden
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                try {
                                  const url = await uploadImage(file, `causas/${crypto.randomUUID()}-${file.name}`);
                                  setFormData(prev => ({
                                    ...prev,
                                    causas_urgentes: prev.causas_urgentes.map((c, i) => i === idx ? { ...c, image: url } : c)
                                  }));
                                  setSnackbar({ open: true, message: 'Imagen de causa subida', severity: 'success' });
                                } catch (err) {
                                  setSnackbar({ open: true, message: 'Error al subir imagen', severity: 'error' });
                                }
                              }
                            }}
                          />
                        </Button>
                        <TextField
                          label="Título"
                          value={causa.title}
                          onChange={e => handleCausaUrgenteChange(idx, 'title', e.target.value)}
                          fullWidth
                          sx={{ mb: 1 }}
                        />
                        <TextField
                          label="Descripción"
                          value={causa.description}
                          onChange={e => handleCausaUrgenteChange(idx, 'description', e.target.value)}
                          fullWidth
                          multiline
                          minRows={2}
                          sx={{ mb: 1 }}
                        />
                        <TextField
                          label="Meta ($)"
                          type="number"
                          value={causa.goal}
                          onChange={e => handleCausaUrgenteChange(idx, 'goal', parseInt(e.target.value) || 0)}
                          fullWidth
                          sx={{ mb: 1 }}
                        />
                        <TextField
                          label="Monto actual ($)"
                          type="number"
                          value={causa.current}
                          onChange={e => handleCausaUrgenteChange(idx, 'current', parseInt(e.target.value) || 0)}
                          fullWidth
                          sx={{ mb: 1 }}
                        />
                        <IconButton color="error" size="small" onClick={() => {
                          setFormData(prev => ({
                            ...prev,
                            causas_urgentes: (prev.causas_urgentes || []).filter((c, i) => i !== idx)
                          }));
                        }}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Paper>
                    </Grid>
                  ))}
                </Grid>
              </Paper>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ bgcolor: '#f8fafc', px: 3, py: 2 }}>
          <Button onClick={() => setOpenDialog(false)} variant="outlined">Cancelar</Button>
          <Button onClick={handleSubmitRefugio} variant="contained" color="primary">
            {currentRefugio ? 'Actualizar' : 'Crear'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar para notificaciones */}
      <Snackbar 
        open={snackbar.open} 
        autoHideDuration={6000} 
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={() => setSnackbar(prev => ({ ...prev, open: false }))} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}