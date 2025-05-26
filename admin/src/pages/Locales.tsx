import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import {
  Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography, Snackbar, FormControl, InputLabel, Select, MenuItem, SelectChangeEvent
} from '@mui/material';
import { Edit, Delete, Add, Block, Visibility as ViewIcon } from '@mui/icons-material';
import LocalQr from '../components/LocalQr';
import CreateLocalUser from '../components/CreateLocalUser'; // Importar el componente CreateLocalUser
import Avatar from '@mui/material/Avatar';
import Tooltip from '@mui/material/Tooltip';

interface Place {
  id: string;
  name: string;
  photo_url?: string;
  rating?: number;
  category?: string;
  address?: string;
  phone?: string;
  whatsapp?: string;
  hours?: { open: string; close: string; closed?: boolean }[];
  lat?: number;
  lng?: number;
  description?: string;
  created_at?: string;
  updated_at?: string;
  suspended?: boolean;
  owner_id?: string;
  qr_url?: string;
}

interface SimpleUser {
  id: string;
  email: string;
  full_name?: string;
  user_id: string;
}

const DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

const initialForm: Partial<Place> = {
  name: '',
  photo_url: '',
  rating: 0,
  category: '',
  address: '',
  phone: '',
  whatsapp: '',
  hours: DAYS.map(() => ({ open: '', close: '', closed: false })),
  lat: undefined,
  lng: undefined,
  description: '',
  owner_id: null,
  qr_url: '',
};

export default function Locales() {
  const { supabase } = useAuth();
  const [locales, setLocales] = useState<Place[]>([]);
  const [loading, setLoading] = useState(false);
  const [openDialog, setOpenDialog] = useState(false);
  const [form, setForm] = useState<Partial<Place>>(initialForm);
  const [editId, setEditId] = useState<string | null>(null);
  const [snackbar, setSnackbar] = useState<{open: boolean, message: string, severity: 'success'|'error'}>({open: false, message: '', severity: 'success'});
  const [users, setUsers] = useState<SimpleUser[]>([]);
  const [openCreateUser, setOpenCreateUser] = useState(false); // Estado para el modal de crear usuario
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [openViewDialog, setOpenViewDialog] = useState(false);
  const [currentLocal, setCurrentLocal] = useState<Place | null>(null);

  const fetchLocales = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('places').select('*');
    if (error) {
      setSnackbar({open: true, message: 'Error al cargar locales', severity: 'error'});
    } else {
      setLocales(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchLocales();
  }, []);

  useEffect(() => {
    async function fetchUsers() {
      // Usar función RPC si existe, si no, seleccionar todos los perfiles
      let data, error;
      if (supabase.rpc) {
        ({ data, error } = await supabase.rpc('get_all_profiles'));
        if (!error && data) {
          // Mapear para que coincida con SimpleUser
          data = data.map((profile: any) => ({
            id: profile.profile_id || profile.id,
            email: profile.email,
            full_name: profile.full_name || profile.email?.split('@')[0] || 'Sin nombre',
            user_id: profile.user_id,
          }));
        }
      }
      if (!data || error) {
        // Fallback: select * from profiles
        const res = await supabase
          .from('profiles')
          .select('id, email, full_name, user_id');
        data = res.data;
      }
      if (data) setUsers(data);
    }
    fetchUsers();
  }, [supabase]);

  const handleOpenDialog = (place?: Place) => {
    if (place) {
      setEditId(place.id);
      setForm(place);
    } else {
      setEditId(null);
      setForm(initialForm);
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setForm(initialForm);
    setEditId(null);
  };

  // handleChange universal para inputs y selects
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | SelectChangeEvent<string>) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
  };

  const handleSave = async () => {
    if (!form.name) {
      setSnackbar({open: true, message: 'El nombre es obligatorio', severity: 'error'});
      return;
    }
    setLoading(true);
    let ownerId = form.owner_id;
    if (ownerId && !users.some(u => u.user_id === ownerId)) {
      setSnackbar({open: true, message: 'Selecciona un dueño válido', severity: 'error'});
      setLoading(false);
      return;
    }
    let photoUrl = form.photo_url;
    // Si hay un logo nuevo seleccionado, subirlo a Supabase Storage
    if (logoFile) {
      try {
        const fileName = `${Date.now()}-${logoFile.name}`;
        const { error: uploadError } = await supabase.storage.from('locales-logos').upload(fileName, logoFile, { upsert: false });
        if (uploadError) throw uploadError;
        const { data: publicUrlData } = supabase.storage.from('locales-logos').getPublicUrl(fileName);
        photoUrl = publicUrlData.publicUrl;
      } catch (e: any) {
        setSnackbar({open: true, message: 'Error al subir logo: ' + (e.message || e.error_description), severity: 'error'});
        setLoading(false);
        return;
      }
    }
    const formToSend = {
      ...form,
      photo_url: photoUrl,
      owner_id: ownerId === '' ? null : ownerId,
    };
    let res;
    if (editId) {
      res = await supabase.from('places').update(formToSend).eq('id', editId);
    } else {
      res = await supabase.from('places').insert([formToSend]);
    }
    if (res.error) {
      setSnackbar({open: true, message: 'Error al guardar: ' + res.error.message, severity: 'error'});
    } else {
      setSnackbar({open: true, message: 'Guardado correctamente', severity: 'success'});
      fetchLocales();
      handleCloseDialog();
      setLogoFile(null); // Limpiar logo después de guardar
    }
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    setLoading(true);
    const { error } = await supabase.from('places').delete().eq('id', id);
    if (error) {
      setSnackbar({open: true, message: 'Error al eliminar local', severity: 'error'});
    } else {
      setSnackbar({open: true, message: 'Local eliminado', severity: 'success'});
      fetchLocales();
    }
    setLoading(false);
  };

  const handleSuspend = async (id: string, suspended: boolean) => {
    setLoading(true);
    const { error } = await supabase.from('places').update({ suspended: !suspended }).eq('id', id);
    if (error) {
      setSnackbar({open: true, message: 'Error al suspender local', severity: 'error'});
    } else {
      setSnackbar({open: true, message: suspended ? 'Local reactivado' : 'Local suspendido', severity: 'success'});
      fetchLocales();
    }
    setLoading(false);
  };

  const handleOpenViewDialog = (local: Place) => {
    setCurrentLocal(local);
    setOpenViewDialog(true);
  };

  const handleCloseViewDialog = () => {
    setOpenViewDialog(false);
    setCurrentLocal(null);
  };

  return (
    <Box p={3}>
      <Typography variant="h4" mb={2}>Locales</Typography>
      <Button variant="contained" startIcon={<Add />} onClick={() => handleOpenDialog()}>Agregar Local</Button>
      <Button variant="outlined" sx={{ ml: 2 }} onClick={() => setOpenCreateUser(true)}>
        Crear credenciales de acceso para local
      </Button>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Logo</TableCell>
            <TableCell>Nombre</TableCell>
            <TableCell>Categoría</TableCell>
            <TableCell>Dirección</TableCell>
            <TableCell>Teléfono</TableCell>
            <TableCell>Acciones</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {locales.map((local) => (
            <TableRow key={local.id}>
              <TableCell>
                <Avatar
                  src={local.photo_url || ''}
                  alt={local.name}
                  variant="rounded"
                  sx={{ width: 56, height: 56 }}
                />
              </TableCell>
              <TableCell>{local.name}</TableCell>
              <TableCell>{local.category}</TableCell>
              <TableCell>{local.address}</TableCell>
              <TableCell>{local.phone}</TableCell>
              <TableCell>
                <Tooltip title="Vista previa">
                  <IconButton onClick={() => handleOpenViewDialog(local)}>
                    <ViewIcon />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Editar">
                  <IconButton onClick={() => handleOpenDialog(local)}><Edit /></IconButton>
                </Tooltip>
                <Tooltip title="Eliminar">
                  <IconButton onClick={() => handleDelete(local.id)}><Delete /></IconButton>
                </Tooltip>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {/* Diálogo agregar/editar */}
      <Dialog open={openDialog} onClose={handleCloseDialog}>
        <DialogTitle>{editId ? 'Editar Local' : 'Agregar Local'}</DialogTitle>
        <DialogContent>
          <TextField margin="dense" label="Nombre" name="name" value={form.name} onChange={handleChange} fullWidth required />
          <TextField margin="dense" label="Categoría" name="category" value={form.category} onChange={handleChange} fullWidth />
          <TextField margin="dense" label="Dirección" name="address" value={form.address} onChange={handleChange} fullWidth />
          <TextField margin="dense" label="Teléfono" name="phone" value={form.phone} onChange={handleChange} fullWidth />
          <TextField margin="dense" label="WhatsApp" name="whatsapp" value={form.whatsapp} onChange={handleChange} fullWidth helperText="Ej: +5491123456789" />
          {/* Selector visual de horarios */}
          <Box sx={{ mt: 2, mb: 1 }}>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>Horarios de atención</Typography>
            {DAYS.map((day, idx) => (
              <Box key={day} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <Typography sx={{ width: 90 }}>{day}</Typography>
                <TextField
                  type="time"
                  size="small"
                  label="Abre"
                  value={form.hours?.[idx]?.open || ''}
                  onChange={e => {
                    const hours = [...(form.hours || [])];
                    hours[idx] = { ...hours[idx], open: e.target.value };
                    setForm(f => ({ ...f, hours }));
                  }}
                  disabled={form.hours?.[idx]?.closed}
                  sx={{ width: 110 }}
                  inputProps={{ step: 300 }}
                />
                <TextField
                  type="time"
                  size="small"
                  label="Cierra"
                  value={form.hours?.[idx]?.close || ''}
                  onChange={e => {
                    const hours = [...(form.hours || [])];
                    hours[idx] = { ...hours[idx], close: e.target.value };
                    setForm(f => ({ ...f, hours }));
                  }}
                  disabled={form.hours?.[idx]?.closed}
                  sx={{ width: 110 }}
                  inputProps={{ step: 300 }}
                />
                <Button
                  size="small"
                  variant={form.hours?.[idx]?.closed ? 'contained' : 'outlined'}
                  color={form.hours?.[idx]?.closed ? 'error' : 'inherit'}
                  onClick={() => {
                    const hours = [...(form.hours || [])];
                    hours[idx] = { ...hours[idx], closed: !hours[idx]?.closed, open: '', close: '' };
                    setForm(f => ({ ...f, hours }));
                  }}
                  sx={{ ml: 1 }}
                >
                  {form.hours?.[idx]?.closed ? 'Cerrado' : 'Abierto'}
                </Button>
              </Box>
            ))}
          </Box>
          {/* Campos de ubicación */}
          <Box sx={{ display: 'flex', gap: 2, mb: 1 }}>
            <TextField
              margin="dense"
              label="Latitud (Ubicación)"
              name="lat"
              type="number"
              value={form.lat ?? ''}
              onChange={e => setForm(f => ({ ...f, lat: e.target.value === '' ? undefined : Number(e.target.value) }))}
              fullWidth
            />
            <TextField
              margin="dense"
              label="Longitud (Ubicación)"
              name="lng"
              type="number"
              value={form.lng ?? ''}
              onChange={e => setForm(f => ({ ...f, lng: e.target.value === '' ? undefined : Number(e.target.value) }))}
              fullWidth
            />
          </Box>
          <TextField margin="dense" label="Imagen (URL)" name="photo_url" value={form.photo_url} onChange={handleChange} fullWidth />
          {/* Subida de logo */}
          <Box sx={{ my: 1 }}>
            <input
              accept="image/*"
              style={{ display: 'none' }}
              id="logo-upload"
              type="file"
              onChange={e => {
                const file = e.target.files?.[0];
                if (file) {
                  setLogoFile(file);
                  // Previsualización inmediata
                  setForm(f => ({ ...f, photo_url: URL.createObjectURL(file) }));
                }
              }}
            />
            <label htmlFor="logo-upload">
              <Button variant="outlined" component="span" fullWidth>
                {logoFile ? 'Cambiar logo' : 'Subir logo'}
              </Button>
            </label>
            {/* Previsualización del logo */}
            {form.photo_url && (
              <Box sx={{ mt: 1, textAlign: 'center' }}>
                <img src={form.photo_url} alt="Logo preview" style={{ maxWidth: 120, maxHeight: 120, borderRadius: 8 }} />
              </Box>
            )}
          </Box>
          <TextField margin="dense" label="Descripción" name="description" value={form.description} onChange={handleChange} fullWidth multiline minRows={2} maxRows={6} />
          <FormControl fullWidth margin="dense">
            <InputLabel id="owner-select-label">Dueño</InputLabel>
            <Select
              labelId="owner-select-label"
              name="owner_id"
              value={form.owner_id || ''}
              label="Dueño"
              onChange={e => {
                // owner_id debe ser el user_id de profiles
                const selectedUserId = e.target.value;
                // Validar que el user_id seleccionado exista en la lista de usuarios
                const exists = users.some(u => u.user_id === selectedUserId);
                setForm(f => ({ ...f, owner_id: exists ? selectedUserId : '' }));
              }}
              required
            >
              <MenuItem value=""><em>Sin asignar</em></MenuItem>
              {users.map(u => (
                <MenuItem key={u.user_id} value={u.user_id}>{u.email} ({u.user_id})</MenuItem>
              ))}
            </Select>
          </FormControl>
          {editId && form.id && (
            <LocalQr
              placeId={form.id}
              qrUrl={form.qr_url}
              onQrUploaded={async (url: string) => {
                // Actualiza el campo qr_url en la base de datos y en el estado local
                await supabase.from('places').update({ qr_url: url }).eq('id', form.id);
                setForm(f => ({ ...f, qr_url: url }));
                // Opcional: muestra un mensaje de éxito
                setSnackbar({ open: true, message: 'QR guardado correctamente', severity: 'success' });
              }}
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancelar</Button>
          <Button onClick={handleSave} variant="contained" disabled={loading}>{editId ? 'Guardar' : 'Agregar'}</Button>
        </DialogActions>
      </Dialog>
      {/* Modal para crear credenciales de usuario local */}
      <Dialog open={openCreateUser} onClose={() => setOpenCreateUser(false)}>
        <DialogTitle>Crear usuario de local</DialogTitle>
        <DialogContent>
          <CreateLocalUser onCreated={() => setOpenCreateUser(false)} />
        </DialogContent>
      </Dialog>
      {/* Modal de vista previa */}
      <Dialog open={openViewDialog} onClose={handleCloseViewDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Vista previa del local</DialogTitle>
        <DialogContent>
          {currentLocal && (
            <Box sx={{ textAlign: 'center', py: 2 }}>
              <Avatar
                src={currentLocal.photo_url || ''}
                alt={currentLocal.name}
                variant="rounded"
                sx={{ width: 120, height: 120, mb: 2, mx: 'auto' }}
              />
              <Typography variant="h5" gutterBottom>{currentLocal.name}</Typography>
              <Typography variant="subtitle1" color="text.secondary" gutterBottom>{currentLocal.category}</Typography>
              <Typography variant="body1" gutterBottom>{currentLocal.address}</Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>{currentLocal.phone}</Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>{currentLocal.description}</Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseViewDialog}>Cerrar</Button>
        </DialogActions>
      </Dialog>
      <Snackbar open={snackbar.open} autoHideDuration={3000} onClose={() => setSnackbar({...snackbar, open: false})} message={snackbar.message} />
    </Box>
  );
}
