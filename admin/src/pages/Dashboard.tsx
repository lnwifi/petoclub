import { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Paper,
  Typography,
  Card,
  CardContent,
  CardHeader,
  Divider,
  CircularProgress
} from '@mui/material';
import {
  PeopleAlt as UsersIcon,
  Pets as PetsIcon,
  Home as RefugiosIcon,
  CardMembership as MembershipIcon
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
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
  Tooltip,
  Legend
);

// Componente de tarjeta de estadísticas
const StatCard = ({ title, value, icon, color }: { title: string; value: number | string; icon: React.ReactNode; color: string }) => (
  <Card sx={{ height: '100%' }}>
    <CardContent sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <Box>
        <Typography variant="h6" color="text.secondary" gutterBottom>
          {title}
        </Typography>
        <Typography variant="h4" fontWeight="bold">
          {value}
        </Typography>
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

export default function Dashboard() {
  const { supabase } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalPets: 0,
    totalRefugios: 0,
    totalMemberships: 0
  });
  
  // Datos para los gráficos
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
      data: [] as number[]
    }
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Obtener total de usuarios
        const { count: userCount, error: userError } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true });
        
        if (userError) throw userError;
        
        // Obtener total de mascotas
        const { count: petCount, error: petError } = await supabase
          .from('pets')
          .select('*', { count: 'exact', head: true });
        
        if (petError) throw petError;
        
        // Obtener total de refugios (manejo de tabla que podría no existir)
        let refugiosCount = 0;
        try {
          const { count, error } = await supabase
            .from('refugios')
            .select('*', { count: 'exact', head: true });
          
          if (!error) {
            refugiosCount = count || 0;
          }
        } catch (error) {
          console.log('La tabla refugios podría no existir:', error);
          // No lanzamos el error para que la aplicación siga funcionando
          refugiosCount = 0;
        }
        
        // Obtener total de membresías activas
        const { count: membershipCount, error: membershipError } = await supabase
          .from('user_memberships')
          .select('*', { count: 'exact', head: true })
          .eq('is_active', true);
        
        if (membershipError) throw membershipError;
        
        // Actualizar estadísticas
        setStats({
          totalUsers: userCount || 0,
          totalPets: petCount || 0,
          totalRefugios: refugiosCount || 0,
          totalMemberships: membershipCount || 0
        });
        
        // Obtener registros de usuarios por mes
        const lastSixMonths = Array.from({ length: 6 }, (_, i) => {
          const date = new Date();
          date.setMonth(date.getMonth() - i);
          return {
            month: date.toLocaleString('es', { month: 'short' }),
            startDate: new Date(date.getFullYear(), date.getMonth(), 1).toISOString(),
            endDate: new Date(date.getFullYear(), date.getMonth() + 1, 0).toISOString()
          };
        }).reverse();
    
        const userRegistrationsPromises = lastSixMonths.map(async ({ startDate, endDate }) => {
          const { count } = await supabase
            .from('profiles')
            .select('*', { count: 'exact', head: true })
            .gte('created_at', startDate)
            .lt('created_at', endDate);
          return count || 0;
        });
    
        const userRegistrationsData = await Promise.all(userRegistrationsPromises);
    
        // Obtener distribución de mascotas por especie
        const { data: petsBySpecies, error: speciesError } = await supabase
          .from('pets')
          .select('species, name')
          .not('species', 'is', null);
    
        if (speciesError) throw speciesError;
        
        // Verificar que los datos existen y tienen el formato esperado
        console.log('Datos de mascotas obtenidos:', petsBySpecies);
        
        // Procesar los datos de especies asegurando que sean válidos
        const speciesCount = {};
        if (petsBySpecies && Array.isArray(petsBySpecies)) {
          petsBySpecies.forEach(pet => {
            if (pet && pet.species) {
              const speciesName = pet.species.trim();
              if (speciesName) {
                speciesCount[speciesName] = (speciesCount[speciesName] || 0) + 1;
              }
            }
          });
        }
        
        // Si no hay datos, agregar un valor por defecto
        if (Object.keys(speciesCount).length === 0) {
          speciesCount['Sin datos'] = 0;
        }
    
        // Obtener distribución de membresías
        const { data: memberships, error: membershipsError } = await supabase
          .from('user_memberships')
          .select('type')
          .eq('is_active', true);
    
        if (membershipsError) throw membershipsError;
    
        const membershipTypeCount = memberships.reduce((acc, { type }) => {
          acc[type] = (acc[type] || 0) + 1;
          return acc;
        }, {});
    
        setChartData({
          userRegistrations: {
            labels: lastSixMonths.map(m => m.month),
            data: userRegistrationsData
          },
          petsBySpecies: {
            labels: Object.keys(speciesCount),
            data: Object.values(speciesCount)
          },
          membershipDistribution: {
            labels: Object.keys(membershipTypeCount),
            data: Object.values(membershipTypeCount)
          }
        });
      } catch (error) {
        console.error('Error al cargar datos del dashboard:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [supabase]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ flexGrow: 1 }}>
      <Typography variant="h4" gutterBottom fontWeight="600">
        Dashboard
      </Typography>
      
      {/* Tarjetas de estadísticas */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard 
            title="Usuarios" 
            value={stats.totalUsers} 
            icon={<UsersIcon fontSize="large" />} 
            color="#2196f3" 
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard 
            title="Mascotas" 
            value={stats.totalPets} 
            icon={<PetsIcon fontSize="large" />} 
            color="#4caf50" 
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard 
            title="Refugios" 
            value={stats.totalRefugios} 
            icon={<RefugiosIcon fontSize="large" />} 
            color="#ff9800" 
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard 
            title="Membresías" 
            value={stats.totalMemberships} 
            icon={<MembershipIcon fontSize="large" />} 
            color="#f44336" 
          />
        </Grid>
      </Grid>
      
      {/* Gráficos */}
      <Grid container spacing={3}>
        {/* Gráfico de línea - Registros de usuarios */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Typography variant="h6" gutterBottom>Registros de usuarios</Typography>
            <Divider sx={{ mb: 2 }} />
            <Box sx={{ height: 300 }}>
              <Line 
                data={{
                  labels: chartData.userRegistrations.labels,
                  datasets: [
                    {
                      label: 'Nuevos usuarios',
                      data: chartData.userRegistrations.data,
                      borderColor: '#2196f3',
                      backgroundColor: 'rgba(33, 150, 243, 0.1)',
                      tension: 0.3,
                      fill: true
                    }
                  ]
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      position: 'top',
                    },
                  },
                  scales: {
                    y: {
                      beginAtZero: true
                    }
                  }
                }}
              />
            </Box>
          </Paper>
        </Grid>
        
        {/* Gráfico circular - Distribución de membresías */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Typography variant="h6" gutterBottom>Membresías</Typography>
            <Divider sx={{ mb: 2 }} />
            <Box sx={{ height: 300, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              <Doughnut 
                data={{
                  labels: chartData.membershipDistribution.labels,
                  datasets: [
                    {
                      data: chartData.membershipDistribution.data,
                      backgroundColor: [
                        '#4caf50',
                        '#ffbc4c',
                        '#f44336'
                      ],
                      borderWidth: 1
                    }
                  ]
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      position: 'bottom',
                    },
                  }
                }}
              />
            </Box>
          </Paper>
        </Grid>
        
        {/* Gráfico de barras - Mascotas por especie */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>Mascotas por especie</Typography>
            <Divider sx={{ mb: 2 }} />
            <Box sx={{ height: 300 }}>
              <Bar 
                data={{
                  labels: chartData.petsBySpecies.labels,
                  datasets: [
                    {
                      label: 'Cantidad',
                      data: chartData.petsBySpecies.data,
                      backgroundColor: [
                        'rgba(33, 150, 243, 0.7)',
                        'rgba(76, 175, 80, 0.7)',
                        'rgba(255, 188, 76, 0.7)',
                        'rgba(244, 67, 54, 0.7)'
                      ],
                    }
                  ]
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      display: false
                    },
                  },
                  scales: {
                    y: {
                      beginAtZero: true
                    }
                  }
                }}
              />
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}