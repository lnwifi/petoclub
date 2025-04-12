import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  TextField,
  Button,
  Divider,
  Switch,
  FormControlLabel,
  Card,
  CardContent,
  CardHeader,
  Tabs,
  Tab,
  CircularProgress,
  Snackbar,
  Alert,
  InputAdornment,
  IconButton
} from '@mui/material';
import {
  Save as SaveIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  Settings as SettingsIcon,
  Notifications as NotificationsIcon,
  Security as SecurityIcon,
  Language as LanguageIcon
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`config-tabpanel-${index}`}
      aria-labelledby={`config-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

function a11yProps(index: number) {
  return {
    id: `config-tab-${index}`,
    'aria-controls': `config-tabpanel-${index}`,
  };
}

export default function Configuracion() {
  const { supabase, user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [tabValue, setTabValue] = useState(0);
  const [showPassword, setShowPassword] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error' | 'info' | 'warning'
  });

  // Configuración general
  const [generalConfig, setGeneralConfig] = useState({
    siteName: 'PetoClub',
    siteDescription: 'Plataforma para amantes de mascotas',
    contactEmail: 'contacto@petoclub.com',
    enableRegistration: true,
    enablePublicProfiles: true,
    maxUploadSize: 5,
    defaultLanguage: 'es'
  });

  // Configuración de notificaciones
  const [notificationConfig, setNotificationConfig] = useState({
    enableEmailNotifications: true,
    enablePushNotifications: true,
    notifyOnNewUser: true,
    notifyOnNewPet: true,
    notifyOnNewRefugio: true,
    notifyOnNewOrder: true,
    dailySummary: false
  });

  // Configuración de seguridad
  const [securityConfig, setSecurityConfig] = useState({
    adminEmail: user?.email || '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
    requireStrongPasswords: true,
    sessionTimeout: 60,
    maxLoginAttempts: 5
  });

  // Cargar configuración
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        setLoading(true);
        
        // En una implementación real, aquí se cargarían los datos de la base de datos
        // Por ahora usamos los valores por defecto definidos en los estados
        
        // Ejemplo de cómo se cargaría desde Supabase:
        // const { data, error } = await supabase
        //   .from('app_configuration')
        //   .select('*')
        //   .single();
        // 
        // if (error) throw error;
        // 
        // if (data) {
        //   setGeneralConfig({
        //     siteName: data.site_name,
        //     siteDescription: data.site_description,
        //     contactEmail: data.contact_email,
        //     enableRegistration: data.enable_registration,
        //     enablePublicProfiles: data.enable_public_profiles,
        //     maxUploadSize: data.max_upload_size,
        //     defaultLanguage: data.default_language
        //   });
        //   // ... cargar otras configuraciones
        // }
      } catch (error) {
        console.error('Error al cargar configuración:', error);
        setSnackbar({
          open: true,
          message: 'Error al cargar la configuración',
          severity: 'error'
        });
      } finally {
        setLoading(false);
      }
    };

    fetchConfig();
  }, [supabase, user]);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleGeneralChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, checked, type } = e.target;
    setGeneralConfig(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleNotificationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setNotificationConfig(prev => ({
      ...prev,
      [name]: checked
    }));
  };

  const handleSecurityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, checked, type } = e.target;
    setSecurityConfig(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSaveGeneral = async () => {
    try {
      setLoading(true);
      
      // En una implementación real, aquí se guardarían los datos en la base de datos
      // Ejemplo:
      // const { error } = await supabase
      //   .from('app_configuration')
      //   .update({
      //     site_name: generalConfig.siteName,
      //     site_description: generalConfig.siteDescription,
      //     contact_email: generalConfig.contactEmail,
      //     enable_registration: generalConfig.enableRegistration,
      //     enable_public_profiles: generalConfig.enablePublicProfiles,
      //     max_upload_size: generalConfig.maxUploadSize,
      //     default_language: generalConfig.defaultLanguage
      //   })
      //   .eq('id', 1);
      // 
      // if (error) throw error;
      
      // Simulamos un retraso para mostrar el loading
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setSnackbar({
        open: true,
        message: 'Configuración general guardada correctamente',
        severity: 'success'
      });
    } catch (error) {
      console.error('Error al guardar configuración:', error);
      setSnackbar({
        open: true,
        message: 'Error al guardar la configuración',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveNotifications = async () => {
    try {
      setLoading(true);
      
      // Simulamos un retraso para mostrar el loading
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setSnackbar({
        open: true,
        message: 'Configuración de notificaciones guardada correctamente',
        severity: 'success'
      });
    } catch (error) {
      console.error('Error al guardar configuración:', error);
      setSnackbar({
        open: true,
        message: 'Error al guardar la configuración',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    try {
      // Validaciones
      if (securityConfig.newPassword !== securityConfig.confirmPassword) {
        setSnackbar({
          open: true,
          message: 'Las contraseñas no coinciden',
          severity: 'error'
        });
        return;
      }
      
      if (securityConfig.newPassword.length < 8) {
        setSnackbar({
          open: true,
          message: 'La contraseña debe tener al menos 8 caracteres',
          severity: 'error'
        });
        return;
      }
      
      setLoading(true);
      
      // En una implementación real, aquí se cambiaría la contraseña
      // Ejemplo:
      // const { error } = await supabase.auth.updateUser({
      //   password: securityConfig.newPassword
      // });
      // 
      // if (error) throw error;
      
      // Simulamos un retraso para mostrar el loading
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Limpiar campos de contraseña
      setSecurityConfig(prev => ({
        ...prev,
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      }));
      
      setSnackbar({
        open: true,
        message: 'Contraseña actualizada correctamente',
        severity: 'success'
      });
    } catch (error) {
      console.error('Error al cambiar contraseña:', error);
      setSnackbar({
        open: true,
        message: 'Error al cambiar la contraseña',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSecurity = async () => {
    try {
      setLoading(true);
      
      // Simulamos un retraso para mostrar el loading
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setSnackbar({
        open: true,
        message: 'Configuración de seguridad guardada correctamente',
        severity: 'success'
      });
    } catch (error) {
      console.error('Error al guardar configuración:', error);
      setSnackbar({
        open: true,
        message: 'Error al guardar la configuración',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  if (loading && tabValue === -1) { // Solo mostramos el loading completo al cargar inicialmente
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
          Configuración
        </Typography>
      </Box>

      <Paper sx={{ width: '100%', mb: 2 }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs 
            value={tabValue} 
            onChange={handleTabChange} 
            aria-label="configuración tabs"
            variant="scrollable"
            scrollButtons="auto"
          >
            <Tab 
              icon={<SettingsIcon />} 
              label="General" 
              {...a11yProps(0)} 
              iconPosition="start"
            />
            <Tab 
              icon={<NotificationsIcon />} 
              label="Notificaciones" 
              {...a11yProps(1)} 
              iconPosition="start"
            />
            <Tab 
              icon={<SecurityIcon />} 
              label="Seguridad" 
              {...a11yProps(2)} 
              iconPosition="start"
            />
          </Tabs>
        </Box>

        {/* Panel de Configuración General */}
        <TabPanel value={tabValue} index={0}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <TextField
                name="siteName"
                label="Nombre del sitio"
                fullWidth
                value={generalConfig.siteName}
                onChange={handleGeneralChange}
                margin="normal"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                name="contactEmail"
                label="Email de contacto"
                fullWidth
                value={generalConfig.contactEmail}
                onChange={handleGeneralChange}
                margin="normal"
                type="email"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                name="siteDescription"
                label="Descripción del sitio"
                fullWidth
                value={generalConfig.siteDescription}
                onChange={handleGeneralChange}
                margin="normal"
                multiline
                rows={2}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                name="maxUploadSize"
                label="Tamaño máximo de archivos (MB)"
                fullWidth
                value={generalConfig.maxUploadSize}
                onChange={handleGeneralChange}
                margin="normal"
                type="number"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                name="defaultLanguage"
                label="Idioma por defecto"
                fullWidth
                value={generalConfig.defaultLanguage}
                onChange={handleGeneralChange}
                margin="normal"
                select
                SelectProps={{
                  native: true,
                }}
              >
                <option value="es">Español</option>
                <option value="en">Inglés</option>
                <option value="pt">Portugués</option>
              </TextField>
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={generalConfig.enableRegistration}
                    onChange={handleGeneralChange}
                    name="enableRegistration"
                    color="primary"
                  />
                }
                label="Permitir registro de usuarios"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={generalConfig.enablePublicProfiles}
                    onChange={handleGeneralChange}
                    name="enablePublicProfiles"
                    color="primary"
                  />
                }
                label="Perfiles públicos de usuario"
              />
            </Grid>
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<SaveIcon />}
                  onClick={handleSaveGeneral}
                  disabled={loading}
                >
                  {loading ? 'Guardando...' : 'Guardar cambios'}
                </Button>
              </Box>
            </Grid>
          </Grid>
        </TabPanel>

        {/* Panel de Notificaciones */}
        <TabPanel value={tabValue} index={1}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>
                Configuración de notificaciones
              </Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={notificationConfig.enableEmailNotifications}
                    onChange={handleNotificationChange}
                    name="enableEmailNotifications"
                    color="primary"
                  />
                }
                label="Habilitar notificaciones por email"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={notificationConfig.enablePushNotifications}
                    onChange={handleNotificationChange}
                    name="enablePushNotifications"
                    color="primary"
                  />
                }
                label="Habilitar notificaciones push"
              />
            </Grid>
            <Grid item xs={12}>
              <Divider sx={{ my: 2 }} />
              <Typography variant="subtitle1" gutterBottom>
                Notificar cuando:
              </Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={notificationConfig.notifyOnNewUser}
                    onChange={handleNotificationChange}
                    name="notifyOnNewUser"
                    color="primary"
                  />
                }
                label="Nuevo usuario registrado"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={notificationConfig.notifyOnNewPet}
                    onChange={handleNotificationChange}
                    name="notifyOnNewPet"
                    color="primary"
                  />
                }
                label="Nueva mascota registrada"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={notificationConfig.notifyOnNewRefugio}
                    onChange={handleNotificationChange}
                    name="notifyOnNewRefugio"
                    color="primary"
                  />
                }
                label="Nuevo refugio registrado"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={notificationConfig.notifyOnNewOrder}
                    onChange={handleNotificationChange}
                    name="notifyOnNewOrder"
                    color="primary"
                  />
                }
                label="Nuevo pedido realizado"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={notificationConfig.dailySummary}
                    onChange={handleNotificationChange}
                    name="dailySummary"
                    color="primary"
                  />
                }
                label="Resumen diario de actividad"
              />
            </Grid>
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<SaveIcon />}
                  onClick={handleSaveNotifications}
                  disabled={loading}
                >
                  {loading ? 'Guardando...' : 'Guardar cambios'}
                </Button>
              </Box>
            </Grid>
          </Grid>
        </TabPanel>

        {/* Panel de Seguridad */}
        <TabPanel value={tabValue} index={2}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>
                Cambiar contraseña
              </Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                name="currentPassword"
                label="Contraseña actual"
                fullWidth
                value={securityConfig.currentPassword}
                onChange={handleSecurityChange}
                margin="normal"
                type={showPassword ? 'text' : 'password'}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        aria-label="toggle password visibility"
                        onClick={() => setShowPassword(!showPassword)}
                        edge="end"
                      >
                        {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                name="adminEmail"
                label="Email de administrador"
                fullWidth
                value={securityConfig.adminEmail}
                onChange={handleSecurityChange}
                margin="normal"
                disabled
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                name="newPassword"
                label="Nueva contraseña"
                fullWidth
                value={securityConfig.newPassword}
                onChange={handleSecurityChange}
                margin="normal"
                type={showPassword ? 'text' : 'password'}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                name="confirmPassword"
                label="Confirmar nueva contraseña"
                fullWidth
                value={securityConfig.confirmPassword}
                onChange={handleSecurityChange}
                margin="normal"
                type={showPassword ? 'text' : 'password'}
              />
            </Grid>
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={handleChangePassword}
                  disabled={loading || !securityConfig.currentPassword || !securityConfig.newPassword || !securityConfig.confirmPassword}
                >
                  {loading ? 'Cambiando...' : 'Cambiar contraseña'}
                </Button>
              </Box>
            </Grid>
            <Grid item xs={12}>
              <Divider sx={{ my: 2 }} />
              <Typography variant="h6" gutterBottom>
                Configuración de seguridad
              </Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={securityConfig.requireStrongPasswords}
                    onChange={handleSecurityChange}
                    name="requireStrongPasswords"
                    color="primary"
                  />
                }
                label="Requerir contraseñas seguras"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                name="sessionTimeout"
                label="Tiempo de sesión (minutos)"
                fullWidth
                value={securityConfig.sessionTimeout}
                onChange={handleSecurityChange}
                margin="normal"
                type="number"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                name="maxLoginAttempts"
                label="Intentos máximos de inicio de sesión"
                fullWidth
                value={securityConfig.maxLoginAttempts}
                onChange={handleSecurityChange}
                margin="normal"
                type="number"
              />
            </Grid>
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<SaveIcon />}
                  onClick={handleSaveSecurity}
                  disabled={loading}
                >
                  {loading ? 'Guardando...' : 'Guardar cambios'}
                </Button>
              </Box>
            </Grid>
          </Grid>
        </TabPanel>
      </Paper>

      <Snackbar open={snackbar.open} autoHideDuration={6000} onClose={handleCloseSnackbar}>
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}