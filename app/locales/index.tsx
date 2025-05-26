import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { View, Text, Button, FlatList, TouchableOpacity, StyleSheet, useWindowDimensions, Platform, Image, Animated, PanResponder } from 'react-native';
import CreateCouponForm from './CreateCouponForm';
import LocalesLogin from './Login';
import ManualCouponValidationModal from './ManualCouponValidationModal';
import RedemptionsHistory from './RedemptionsHistory';
import AdminSidebar from './AdminSidebar';
import DestacarScreen from './Destacar';
import { MaterialIcons, FontAwesome5, Feather } from '@expo/vector-icons';

interface Coupon {
  id: string;
  title: string;
  description: string;
  discount_percentage?: number;
  discount_amount?: number;
  valid_from?: string;
  valid_until?: string;
  expires_at?: string;
}

export default function LocalesDashboard() {
  const [user, setUser] = useState<any>(null);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [places, setPlaces] = useState<any[]>([]);
  const [selectedPlace, setSelectedPlace] = useState<any>(null);
  const [showManualValidation, setShowManualValidation] = useState(false);
  const [selectedSection, setSelectedSection] = useState('dashboard');
  const [sidebarVisible, setSidebarVisible] = useState(false);

  const [sidebarX] = useState(new Animated.Value(-260));
  const [dragging, setDragging] = useState(false);

  const fadeAnim = React.useRef(new Animated.Value(1)).current;

  const animateSectionChange = () => {
    Animated.sequence([
      Animated.timing(fadeAnim, { toValue: 0, duration: 120, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 160, useNativeDriver: true }),
    ]).start();
  };

  const handleSelectSection = (section: string) => {
    animateSectionChange();
    setSelectedSection(section);
    if (isMobile) setSidebarVisible(false);
  };

  const { width } = useWindowDimensions();
  const isMobile = width < 900;

  // PanResponder para deslizar el sidebar
  const panResponder = PanResponder.create({
    onMoveShouldSetPanResponder: (e, gestureState) => {
      // Solo activar si el sidebar está abierto o el gesto inicia desde el borde
      if (isMobile && (!sidebarVisible && gestureState.moveX < 30)) return true;
      if (isMobile && sidebarVisible) return true;
      return false;
    },
    onPanResponderMove: (e, gestureState) => {
      if (!isMobile) return;
      let newX = gestureState.dx;
      if (!sidebarVisible) newX = Math.min(newX, 0); // Solo permitir arrastrar desde la izquierda
      else newX = Math.max(newX, -260); // Solo permitir cerrar hacia la izquierda
      sidebarX.setValue(sidebarVisible ? newX : -260 + newX);
      setDragging(true);
    },
    onPanResponderRelease: (e, gestureState) => {
      if (!isMobile) return;
      setDragging(false);
      if (sidebarVisible && gestureState.dx < -80) {
        // cerrar
        Animated.timing(sidebarX, { toValue: -260, duration: 180, useNativeDriver: true }).start(() => setSidebarVisible(false));
      } else if (!sidebarVisible && gestureState.dx > 80) {
        // abrir
        setSidebarVisible(true);
        Animated.timing(sidebarX, { toValue: 0, duration: 180, useNativeDriver: true }).start();
      } else {
        Animated.timing(sidebarX, { toValue: sidebarVisible ? 0 : -260, duration: 180, useNativeDriver: true }).start();
      }
    },
  });

  React.useEffect(() => {
    if (isMobile) {
      Animated.timing(sidebarX, {
        toValue: sidebarVisible ? 0 : -260,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [sidebarVisible, isMobile]);

  // Buscar todos los locales cuyo owner_id coincide con el usuario logueado
  React.useEffect(() => {
    if (user) {
      (async () => {
        const { data, error } = await supabase
          .from('places')
          .select('id, name, description, address, category, photo_url, rating, hours, phone, whatsapp, qr_url, owner_id, featured, featured_until')
          .eq('owner_id', user.id);
        console.log('user.id:', user.id);
        console.log('places encontrados:', data);
        console.log('error places:', error);
        setPlaces(data || []);
        if (data && data.length === 1) setSelectedPlace(data[0]);
        else setSelectedPlace(null);
      })();
    }
  }, [user]);

  // REFRESH AUTOMÁTICO DEL DASHBOARD ---
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(async () => {
      const { data, error } = await supabase
        .from('places')
        .select('*')
        .eq('owner_id', user.id);
      if (!error && data) setPlaces(data);
    }, 5000); // refresca cada 5 segundos
    return () => clearInterval(interval);
  }, [user]);
  // --- FIN REFRESH ---

  // Usar el place_id del local seleccionado
  const localId = selectedPlace?.id;

  const fetchCoupons = async () => {
    if (!localId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('coupons')
      .select('*')
      .eq('place_id', localId);
    if (error) setError(error.message);
    else setCoupons(data || []);
    setLoading(false);
  };

  React.useEffect(() => {
    if (user && localId) fetchCoupons();
  }, [user, localId]);

  // Función para formatear el campo hours
  const renderHours = (hours: any) => {
    if (!hours) return '-';
    if (typeof hours === 'string') return hours;
    if (typeof hours === 'object') {
      // Si es un objeto tipo {open, close, closed}
      let str = '';
      if (hours.open) str += hours.open;
      if (hours.close) str += ` - ${hours.close}`;
      if (hours.closed) str += ' (Cerrado)';
      return str || '-';
    }
    return '-';
  };

  // Utilidad para formatear fecha
  function formatDate(dateStr: string | Date) {
    const date = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
    return date.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  if (!user) {
    return <LocalesLogin onLogin={setUser} />;
  }

  if (!places.length) {
    return <View style={styles.container}><Text>No tienes un local asignado. Contacta al administrador.</Text></View>;
  }

  // Si hay varios locales, mostrar selector
  if (places.length > 1 && !selectedPlace) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Selecciona un local para administrar:</Text>
        {places.map((p) => (
          <TouchableOpacity key={p.id} style={styles.addBtn} onPress={() => setSelectedPlace(p)}>
            <Text style={styles.addBtnText}>{p.name}</Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  }

  const mobileSections = [
    { key: 'dashboard', label: 'Dashboard', icon: <MaterialIcons name="dashboard" size={22} color={selectedSection==='dashboard' ? '#fbaa30' : '#888'} /> },
    { key: 'coupons', label: 'Cupones', icon: <MaterialIcons name="confirmation-number" size={22} color={selectedSection==='coupons' ? '#fbaa30' : '#888'} /> },
    { key: 'history', label: 'Historial', icon: <MaterialIcons name="history" size={22} color={selectedSection==='history' ? '#fbaa30' : '#888'} /> },
    { key: 'validate', label: 'Validar cupón', icon: <FontAwesome5 name="barcode" size={20} color={selectedSection==='validate' ? '#fbaa30' : '#888'} /> },
    { key: 'destacar', label: 'Destacar', icon: <MaterialIcons name="star" size={22} color={selectedSection==='destacar' ? '#fbaa30' : '#888'} /> },
  ];

  const dashboardBg = { backgroundColor: '#f8f8fb', minHeight: 0, flex: 1 };

  return (
    <View style={dashboardBg}>
      {/* SIDEBAR y/o MENÚ DE PÁGINAS */}
      {/* Desktop: Sidebar, Mobile: Menú inferior fijo */}
      {!isMobile && (
        <Animated.View
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            zIndex: 30,
            width: 260,
            height: '100%',
            backgroundColor: '#fff',
            shadowColor: '#000',
            shadowOpacity: 0.10,
            shadowRadius: 8,
            elevation: 10,
          }}
        >
          <AdminSidebar
            business={selectedPlace}
            selectedSection={selectedSection}
            onSelectSection={handleSelectSection}
            onLogout={async () => {
              await supabase.auth.signOut();
              setUser(null);
            }}
          />
        </Animated.View>
      )}
      {/* Menú inferior para mobile */}
      {isMobile && (
        <View style={{
          position: 'fixed',
          left: 0,
          right: 0,
          bottom: 0,
          flexDirection: 'row',
          backgroundColor: '#fff',
          borderTopWidth: 1,
          borderTopColor: '#eee',
          justifyContent: 'space-around',
          alignItems: 'center',
          height: 60,
          zIndex: 99,
          shadowColor: '#000',
          shadowOpacity: 0.08,
          shadowRadius: 8,
          elevation: 8,
        }}>
          {mobileSections.map((section) => (
            <TouchableOpacity
              key={section.key}
              onPress={() => handleSelectSection(section.key)}
              style={{alignItems:'center', flex:1, paddingVertical:6, opacity: selectedSection===section.key ? 1 : 0.6}}
            >
              {section.icon}
              <Text style={{fontSize:12, color: selectedSection===section.key ? '#fbaa30' : '#888', fontWeight: selectedSection===section.key ? 'bold' : 'normal'}}>{section.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
      <View style={{width:'100%', backgroundColor:'#fff', paddingVertical:18, paddingHorizontal:28, borderBottomWidth:1, borderBottomColor:'#eee', alignItems:'center', marginBottom:18, elevation:2}}>
      </View>
      <View style={[styles.container, {
        paddingHorizontal: isMobile ? 16 : 40,
        paddingTop: 10,
        flex: 1,
        position: 'relative',
        minHeight: 0,
        marginLeft: !isMobile ? 260 : 0 // Deja espacio para el sidebar en desktop
      }]} >
        <View style={styles.adminPanel}>
          {/* NUEVO DISEÑO MODULAR: logo, nombre y categoría arriba, datos en "chips" separados */}
          {selectedPlace && selectedSection === 'dashboard' && (
            <View style={{alignItems:'center', marginBottom:28, marginTop:12}}>
              <Text style={{ fontSize: 25, fontWeight: 'bold', color: '#111', letterSpacing: 0.5, textAlign: 'center', marginBottom: 18 }}>
                Panel de Administración
              </Text>
              {/* Logo grande arriba (usar photo_url si logo_url no existe) */}
              {(selectedPlace.logo_url || selectedPlace.photo_url) && (
                <Image
                  source={{ uri: selectedPlace.logo_url || selectedPlace.photo_url }}
                  style={{ width: 110, height: 110, borderRadius: 24, borderWidth: 2.5, borderColor: '#fbaa30', backgroundColor: '#fffbe6', marginBottom: 10, resizeMode: 'cover' }}
                />
              )}
              {/* Nombre y categoría */}
              <Text style={{ fontWeight: 'bold', fontSize: 30, color: '#fbaa30', textAlign: 'center' }}>{selectedPlace.name}</Text>
              {selectedPlace.category && (
                <Text style={{ fontSize: 16, color: '#888', textAlign: 'center', marginBottom: 10, marginTop: 2, fontWeight:'bold', letterSpacing:0.5 }}>{selectedPlace.category}</Text>
              )}
              {/* Botones de datos clave */}
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 14, marginTop: 10 }}>
                {selectedPlace.address && (
                  <TouchableOpacity style={styles.infoButton} activeOpacity={0.85}>
                    <MaterialIcons name="location-on" size={21} color="#fbaa30" style={styles.infoButtonIcon} />
                    <Text style={styles.infoButtonText}>{selectedPlace.address}</Text>
                  </TouchableOpacity>
                )}
                {selectedPlace.phone && (
                  <TouchableOpacity style={styles.infoButton} activeOpacity={0.85}>
                    <Feather name="phone" size={20} color="#fbaa30" style={styles.infoButtonIcon} />
                    <Text style={styles.infoButtonText}>{selectedPlace.phone}</Text>
                  </TouchableOpacity>
                )}
                {selectedPlace.whatsapp && (
                  <TouchableOpacity style={styles.infoButton} activeOpacity={0.85}>
                    <FontAwesome5 name="whatsapp" size={19} color="#25d366" style={styles.infoButtonIcon} />
                    <Text style={[styles.infoButtonText, { color: '#25d366', fontWeight:'bold' }]}>WhatsApp: {selectedPlace.whatsapp}</Text>
                  </TouchableOpacity>
                )}
                {selectedPlace.email && (
                  <TouchableOpacity style={styles.infoButton} activeOpacity={0.85}>
                    <MaterialIcons name="email" size={20} color="#fbaa30" style={styles.infoButtonIcon} />
                    <Text style={styles.infoButtonText}>{selectedPlace.email}</Text>
                  </TouchableOpacity>
                )}
                {selectedPlace.website && (
                  <TouchableOpacity style={styles.infoButton} activeOpacity={0.85}>
                    <Feather name="globe" size={20} color="#fbaa30" style={styles.infoButtonIcon} />
                    <Text style={[styles.infoButtonText, { color: '#2980ff', fontWeight:'bold' }]}>{selectedPlace.website.replace(/^https?:\/\//, '')}</Text>
                  </TouchableOpacity>
                )}
                {selectedPlace.hours && (
                  <TouchableOpacity style={styles.infoButton} activeOpacity={0.85}>
                    <MaterialIcons name="access-time" size={20} color="#fbaa30" style={styles.infoButtonIcon} />
                    <Text style={styles.infoButtonText}>Horario: {renderHours(selectedPlace.hours)}</Text>
                  </TouchableOpacity>
                )}
                {selectedPlace.rating !== undefined && (
                  <TouchableOpacity style={styles.infoButton} activeOpacity={0.85}>
                    <MaterialIcons name="star-rate" size={20} color="#fbaa30" style={styles.infoButtonIcon} />
                    <Text style={styles.infoButtonText}>Rating: {selectedPlace.rating ?? '-'}</Text>
                  </TouchableOpacity>
                )}
                {/* Botón destacado con vencimiento */}
                {selectedPlace.featured && selectedPlace.featured_until && (
                  <TouchableOpacity style={[styles.infoButton, { borderColor: '#ffd700', borderWidth: 2 }]} activeOpacity={0.85}>
                    <MaterialIcons name="star" size={20} color="#ffd700" style={styles.infoButtonIcon} />
                    <Text style={[styles.infoButtonText, { color: '#d48806', fontWeight: 'bold' }]}>Destacado hasta el {formatDate(selectedPlace.featured_until)}</Text>
                  </TouchableOpacity>
                )}
                {/* Botón solo destacado si no hay fecha */}
                {selectedPlace.featured && !selectedPlace.featured_until && (
                  <TouchableOpacity style={[styles.infoButton, { borderColor: '#ffd700', borderWidth: 2 }]} activeOpacity={0.85}>
                    <MaterialIcons name="star" size={20} color="#ffd700" style={styles.infoButtonIcon} />
                    <Text style={[styles.infoButtonText, { color: '#d48806', fontWeight: 'bold' }]}>Destacado</Text>
                  </TouchableOpacity>
                )}
              </View>
              {/* Botón para destacar local */}
              {selectedPlace && !selectedPlace.featured && (
                <TouchableOpacity
                  style={{
                    backgroundColor: '#fbaa30',
                    borderRadius: 12,
                    paddingVertical: 12,
                    paddingHorizontal: 30,
                    alignSelf: 'center',
                    marginBottom: 16,
                    marginTop: 6,
                    shadowColor: '#fbaa30',
                    shadowOpacity: 0.13,
                    shadowRadius: 6,
                    elevation: 2,
                  }}
                  activeOpacity={0.85}
                  onPress={() => {
                    setSelectedSection('destacar');
                  }}
                >
                  <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 18 }}>Destacar mi local</Text>
                </TouchableOpacity>
              )}
              {/* <View style={{alignItems:'center', marginTop:20}}>
                <Text style={{fontSize:14, color:'#888', marginBottom:7}}>QR del local:</Text>
                <Image source={{uri: selectedPlace.qr_url}} style={{width:100, height:100, borderRadius:10, borderWidth:1, borderColor:'#ececec'}} />
              </View> */}
            </View>
          )}
          {/* PÁGINA DESTACAR: visible cuando selectedSection === 'destacar' */}
          {selectedSection === 'destacar' && selectedPlace && (
            <DestacarScreen route={{ params: { placeId: selectedPlace.id } }} navigation={navigation} />
          )}
          {/* Divisor visual solo en dashboard */}
          {selectedSection === 'dashboard' && (
            <View style={{height:1, backgroundColor:'#eee', width:'100%', marginVertical:18, alignSelf:'center'}} />
          )}
          {/* SECCIONES DEL PANEL CON ANIMACIÓN */}
          <Animated.View style={{opacity: fadeAnim, width:'100%'}}>
            {selectedSection === 'dashboard' && (
              null
            )}
            {selectedSection === 'validate' && (
              <View style={styles.section}>
                <Text style={styles.sectionHeader}>Validar cupón</Text>
                <TouchableOpacity style={[styles.addBtn, {backgroundColor:'#388e3c', alignSelf: 'center', marginTop:0, marginBottom:12}]} onPress={() => setShowManualValidation(true)}>
                  <Text style={[styles.addBtnText, {color:'#fff'}]}>Validar cupón manualmente</Text>
                </TouchableOpacity>
                <ManualCouponValidationModal
                  visible={showManualValidation}
                  placeId={selectedPlace?.id}
                  onClose={() => setShowManualValidation(false)}
                />
              </View>
            )}
            {selectedSection === 'history' && (
              <View style={styles.section}>
                <RedemptionsHistory placeId={selectedPlace?.id} />
              </View>
            )}
            {selectedSection === 'coupons' && (
              <View style={styles.section}>
                <Text style={styles.sectionHeader}>Cupones</Text>
                {showForm ? (
                  <CreateCouponForm
                    placeId={localId}
                    onCreated={() => {
                      setShowForm(false);
                      fetchCoupons();
                    }}
                    onCancel={() => setShowForm(false)}
                  />
                ) : (
                  <>
                    {loading ? (
                      <Text style={{textAlign:'center'}}>Cargando...</Text>
                    ) : error ? (
                      <Text style={{ color: 'red', textAlign:'center' }}>{error}</Text>
                    ) : (
                      <FlatList
                        data={coupons}
                        keyExtractor={(item) => item.id}
                        renderItem={({ item }) => (
                          <View style={styles.couponCard}> 
                            <Text style={styles.couponTitle}>{item.title}</Text>
                            <Text style={{fontSize:16, color:'#444', marginBottom:2}}>{item.description}</Text>
                            {item.discount_percentage && (
                              <Text style={{color:'#388e3c', fontWeight:'bold', fontSize:16}}>
                                {item.discount_percentage}% OFF
                              </Text>
                            )}
                            {item.discount_amount && (
                              <Text style={{color:'#388e3c', fontWeight:'bold', fontSize:16}}>
                                ${item.discount_amount} de descuento
                              </Text>
                            )}
                            <Text style={{fontSize:14, color:'#888', marginTop:4}}>
                              Expira: {item.expires_at ? new Date(item.expires_at).toLocaleDateString() : 'Sin fecha'}
                            </Text>
                          </View>
                        )}
                        contentContainerStyle={{paddingBottom:40}}
                        ListEmptyComponent={<Text style={{textAlign:'center', color:'#aaa', marginTop:30}}>No hay cupones creados aún.</Text>}
                      />
                    )}
                    <TouchableOpacity style={styles.addBtn} onPress={() => setShowForm(true)}>
                      <Text style={styles.addBtnText}>+ Crear nuevo cupón</Text>
                    </TouchableOpacity>
                    {places.length > 1 && (
                      <TouchableOpacity style={styles.changePlaceBtn} onPress={() => setSelectedPlace(null)}>
                        <Text style={styles.changePlaceBtnText}>Cambiar de local</Text>
                      </TouchableOpacity>
                    )}
                  </>
                )}
              </View>
            )}
          </Animated.View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f4f6fa',
    minHeight: '100%',
    paddingBottom: 32,
  },
  adminPanel: {
    backgroundColor: '#fff',
    borderRadius: 20,
    marginTop: 16,
    padding: 28,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#ececec',
    flex: 1,
  },
  title: {
    fontWeight: 'bold',
    marginBottom: 18,
    letterSpacing: 0.5,
    fontSize: 32,
    color: '#24292f',
    textAlign: 'center',
  },
  subtitle: {
    fontWeight: '600',
    fontSize: 18,
    color: '#fbaa30',
    marginBottom: 10,
    textAlign: 'center',
  },
  couponCard: {
    borderRadius: 12,
    padding: 18,
    marginBottom: 18,
    width: '100%',
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#ececec',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 1,
  },
  couponTitle: {
    fontWeight: 'bold',
    marginBottom: 4,
    fontSize: 18,
    color: '#222',
  },
  addBtn: {
    backgroundColor: '#fbaa30',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 18,
    shadowColor: '#fbaa30',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 2,
  },
  addBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 18,
    letterSpacing: 0.5,
  },
  section: {
    marginBottom: 32,
  },
  sectionHeader: {
    fontWeight: 'bold',
    fontSize: 20,
    color: '#222',
    marginBottom: 14,
    borderBottomWidth: 1,
    borderColor: '#ececec',
    paddingBottom: 6,
    paddingLeft: 2,
  },
  logoutBtn: {
    alignSelf: 'flex-end',
    marginBottom: 10,
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: '#fbaa30',
  },
  logoutBtnText: {
    color: '#f00',
    fontWeight: 'bold',
    textAlign: 'center',
    fontSize: 15,
  },
  changePlaceBtn: {
    marginTop: 18,
    backgroundColor: '#eee',
    alignSelf: 'center',
    borderRadius: 8,
    padding: 16,
  },
  changePlaceBtnText: {
    color: '#222',
    fontWeight: 'bold',
    fontSize: 18,
  },
  infoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fffbe6',
    borderRadius: 22,
    paddingVertical: 10,
    paddingHorizontal: 18,
    marginBottom: 8,
    marginRight: 0,
    shadowColor: '#fbaa30',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
    borderWidth: 0,
  },
  infoButtonIcon: {
    marginRight: 8,
  },
  infoButtonText: {
    fontSize: 16,
    color: '#222',
  },
});
