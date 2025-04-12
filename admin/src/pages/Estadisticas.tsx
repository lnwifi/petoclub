import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tabs,
  Tab,
  Tooltip,
  IconButton
} from '@mui/material';
import {
  PeopleAlt as UsersIcon,
  Pets as PetsIcon,
  Home as RefugiosIcon,
  CardMembership as MembershipIcon,
  LocalOffer as CouponIcon,
  Event as EventIcon,
  Refresh as RefreshIcon,
  Download as DownloadIcon
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { Line, Bar, Doughnut, Pie } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip as ChartTooltip,
  Legend,
  Filler
} from 'chart.js';

// Registrar los componentes de Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  ChartTooltip,
  Legend,
  Filler
);

// Componente de tarjeta de estadísticas
const StatCard = ({ title, value, icon, color, subtitle }: { title: string; value: number | string; icon: React.ReactNode; color: string; subtitle?: string }) => (
  <Card sx={{ height: '100%' }}>
    <CardContent sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <Box>
        <Typography variant="h6" color="text.secondary" gutterBottom>
          {title}
        </Typography>
        <Typography variant="h4" fontWeight="bold">
          {value}
        </Typography>
        {subtitle && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            {subtitle}
          </Typography>
        )}
      </Box>
      <Box sx={{ 
        backgroundColor: `${color}20`, 
        borderRadius: '50%', 
        width: 60, 
        height: 60, 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center' 
      }}>
        <Box sx={{ color }}>{icon}</Box>
      </Box>
    </CardContent>
  </Card>
);

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
      id={`stats-tabpanel-${index}`}
      aria-labelledby={`stats-tab-${index}`}
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
    id: `stats-tab-${index}`,
    'aria-controls': `stats-tabpanel-${index}`,
  };
}

export default function Estadisticas() {
  const { supabase } = useAuth();
  const [loading, setLoading] = useState(true);
  const [tabValue, setTabValue] = useState(0);
  const [timeRange, setTimeRange] = useState('30');
  
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalPets: 0,
    totalRefugios: 0,
    totalMemberships: 0,
    totalCoupons: 0,
    totalEvents: 0,
    activeUsers: 0,
    newUsers: 0,
    premiumUsers: 0
  });
  
  const [chartData, setChartData] = useState({
    userRegistrations: {
      labels: [] as string[],
      data: [] as number[]
    },
    petsBySpecies: {
      labels: [] as string[],
      data: [] as number[]
    },
    membershipDistribution: {
      labels: [] as string[],
      data: [] as number[],
      colors: [] as string[]
    },
    eventParticipation: {
      labels: [] as string[],
      data: [] as number[]
    },
    couponUsage: {
      labels: [] as string[],
      data: [] as number[]
    },
    refugioAdoptions: {
      labels: [] as string[],
      data: [] as number[]
    }
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        
        // Obtener estadísticas de usuarios
        const { count: totalUsers } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true });

        const { count: activeUsers } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .gte('last_sign_in_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

        const { count: newUsers } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

        // Obtener estadísticas de mascotas
        const { count: totalPets } = await supabase
          .from('pets')
          .select('*', { count: 'exact', head: true });

        // Obtener estadísticas de refugios
        const { count: totalRefugios } = await supabase
          .from('refugios')
          .select('*', { count: 'exact', head: true });

        // Obtener estadísticas de membresías
        const { count: totalMemberships } = await supabase
          .from('user_memberships')
          .select('*', { count: 'exact', head: true });

        const { count: premiumUsers } = await supabase
          .from('user_memberships')
          .select('*', { count: 'exact', head: true })
          .eq('is_active', true)
          .eq('type', 'premium');

        // Obtener estadísticas de cupones y eventos
        const { count: totalCoupons } = await supabase
          .from('coupons')
          .select('*', { count: 'exact', head: true });

        const { count: totalEvents } = await supabase
          .from('events')
          .select('*', { count: 'exact', head: true });

        setStats({
          totalUsers: totalUsers || 0,
          totalPets: totalPets || 0,
          totalRefugios: totalRefugios || 0,
          totalMemberships: totalMemberships || 0,
          totalCoupons: totalCoupons || 0,
          totalEvents: totalEvents || 0,
          activeUsers: activeUsers || 0,
          newUsers: newUsers || 0,
          premiumUsers: premiumUsers || 0
        });
        
        generateChartData(timeRange);
        setLoading(false);
      } catch (error) {
        console.error('Error al cargar estadísticas:', error);
        setLoading(false);
      }
    };

    fetchStats();
  }, [timeRange]);

  const generateChartData = (range: string) => {
    // Simulación de datos para los gráficos
    setChartData({
      userRegistrations: {
        labels: ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'],
        data: [65, 59, 80, 81, 56, 55, 40]
      },
      petsBySpecies: {
        labels: ['Perros', 'Gatos', 'Aves', 'Roedores', 'Otros'],
        data: [2000, 1200, 150, 80, 26]
      },
      membershipDistribution: {
        labels: ['Gratuito', 'Premium', 'Pro'],
        data: [670, 320, 260],
        colors: ['#90caf9', '#ffb74d', '#4db6ac']
      },
      eventParticipation: {
        labels: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun'],
        data: [30, 45, 35, 50, 40, 60]
      },
      couponUsage: {
        labels: ['General', 'PetShop', 'Alimentos', 'Accesorios', 'Servicios'],
        data: [25, 40, 30, 20, 10]
      },
      refugioAdoptions: {
        labels: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun'],
        data: [12, 19, 15, 22, 18, 25]
      }
    });
  };

  const handleTimeRangeChange = (event: any) => {
    setTimeRange(event.target.value);
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleRefresh = () => {
    generateChartData(timeRange);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Typography>Cargando estadísticas...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ flexGrow: 1 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" gutterBottom fontWeight="600">
          Estadísticas
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <FormControl sx={{ minWidth: 150, mr: 2 }}>
            <InputLabel id="time-range-label">Periodo</InputLabel>
            <Select
              labelId="time-range-label"
              value={timeRange}
              label="Periodo"
              onChange={handleTimeRangeChange}
              size="small"
            >
              <MenuItem value="7">Última semana</MenuItem>
              <MenuItem value="30">Último mes</MenuItem>
              <MenuItem value="90">Últimos 3 meses</MenuItem>
              <MenuItem value="180">Últimos 6 meses</MenuItem>
              <MenuItem value="365">Último año</MenuItem>
            </Select>
          </FormControl>
          <Tooltip title="Actualizar datos">
            <IconButton onClick={handleRefresh}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Exportar datos">
            <IconButton>
              <DownloadIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={4} lg={2}>
          <StatCard 
            title="Usuarios" 
            value={stats.totalUsers} 
            icon={<UsersIcon fontSize="large" />} 
            color="#1976d2"
            subtitle={`+${stats.newUsers} nuevos`}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4} lg={2}>
          <StatCard 
            title="Mascotas" 
            value={stats.totalPets} 
            icon={<PetsIcon fontSize="large" />} 
            color="#2e7d32"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4} lg={2}>
          <StatCard 
            title="Refugios" 
            value={stats.totalRefugios} 
            icon={<RefugiosIcon fontSize="large" />} 
            color="#ed6c02"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4} lg={2}>
          <StatCard 
            title="Membresías" 
            value={stats.totalMemberships} 
            icon={<MembershipIcon fontSize="large" />} 
            color="#9c27b0"
            subtitle={`${stats.premiumUsers} premium`}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4} lg={2}>
          <StatCard 
            title="Cupones" 
            value={stats.totalCoupons} 
            icon={<CouponIcon fontSize="large" />} 
            color="#d32f2f"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4} lg={2}>
          <StatCard 
            title="Eventos" 
            value={stats.totalEvents} 
            icon={<EventIcon fontSize="large" />} 
            color="#0288d1"
          />
        </Grid>
      </Grid>

      <Paper sx={{ width: '100%', mb: 2 }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs 
            value={tabValue} 
            onChange={handleTabChange} 
            aria-label="estadísticas tabs"
            variant="scrollable"
            scrollButtons="auto"
          >
            <Tab label="Usuarios" {...a11yProps(0)} />
            <Tab label="Mascotas" {...a11yProps(1)} />
            <Tab label="Membresías" {...a11yProps(2)} />
            <Tab label="Eventos" {...a11yProps(3)} />
            <Tab label="Cupones" {...a11yProps(4)} />
            <Tab label="Refugios" {...a11yProps(5)} />
          </Tabs>
        </Box>

        <TabPanel value={tabValue} index={0}>
          <Grid container spacing={3}>
            <Grid item xs={12} lg={8}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Registro de usuarios
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Nuevos usuarios registrados por día
                </Typography>
                <Box sx={{ height: 300, mt: 2 }}>
                  <Line 
                    data={{
                      labels: chartData.userRegistrations.labels,
                      datasets: [
                        {
                          label: 'Nuevos usuarios',
                          data: chartData.userRegistrations.data,
                          borderColor: '#1976d2',
                          backgroundColor: 'rgba(25, 118, 210, 0.1)',
                          fill: true,
                          tension: 0.4
                        }
                      ]
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: {
                          position: 'bottom'
                        }
                      }
                    }}
                  />
                </Box>
              </Paper>
            </Grid>
          </Grid>
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Mascotas por especie
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Distribución de mascotas registradas por tipo
                </Typography>
                <Box sx={{ height: 300, mt: 2 }}>
                  <Pie 
                    data={{
                      labels: chartData.petsBySpecies.labels,
                      datasets: [
                        {
                          data: chartData.petsBySpecies.data,
                          backgroundColor: [
                            '#42a5f5',
                            '#ff9800',
                            '#4caf50',
                            '#f44336',
                            '#9c27b0'
                          ],
                          borderWidth: 1,
                          borderColor: '#fff'
                        }
                      ]
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: {
                          position: 'bottom'
                        }
                      }
                    }}
                  />
                </Box>
              </Paper>
            </Grid>
          </Grid>
        </TabPanel>
      </Paper>
    </Box>
  );
}