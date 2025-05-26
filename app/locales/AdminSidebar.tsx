import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { MaterialIcons, FontAwesome5, Feather } from '@expo/vector-icons';

interface Props {
  business: {
    name: string;
    logo_url?: string;
    description?: string;
    featured?: boolean;
  };
  selectedSection: string;
  onSelectSection: (section: string) => void;
  onLogout: () => void;
}

export default function AdminSidebar({ business, selectedSection, onSelectSection, onLogout }: Props) {
  const sections = [
    { key: 'dashboard', label: 'Dashboard', icon: <MaterialIcons name="dashboard" size={22} color={selectedSection==='dashboard'?'#fbaa30':'#888'} /> },
    { key: 'coupons', label: 'Cupones', icon: <MaterialIcons name="confirmation-number" size={22} color={selectedSection==='coupons'?'#fbaa30':'#888'} /> },
    { key: 'history', label: 'Historial', icon: <MaterialIcons name="history" size={22} color={selectedSection==='history'?'#fbaa30':'#888'} /> },
    { key: 'validate', label: 'Validar cupón', icon: <FontAwesome5 name="barcode" size={20} color={selectedSection==='validate'?'#fbaa30':'#888'} /> },
    { key: 'destacar', label: 'Destacar', icon: <MaterialIcons name="star" size={22} color={selectedSection==='destacar'?'#fbaa30':'#888'} /> },
  ];

  return (
    <View style={styles.sidebar}>
      <View style={styles.logoBox}>
        {/* Logo de la app grande arriba del nombre del local */}
        <Image source={require('../../assets/images/petclub-logo.svg')} style={{width: 110, height: 110, marginBottom: 10, resizeMode: 'contain'}} />
        {/* Logo del local SOLO si existe, SIN círculo de placeholder */}
        {business.logo_url && (
          <Image source={{ uri: business.logo_url }} style={styles.logo} />
        )}
        <Text style={styles.businessName}>{business.name}</Text>
        {business.featured && <Text style={styles.featured}>⭐ Destacado</Text>}
        {business.description && <Text style={styles.description}>{business.description}</Text>}
      </View>
      <View style={styles.menu}>
        {sections.map((s) => (
          <TouchableOpacity
            key={s.key}
            style={[styles.menuItem, selectedSection === s.key && styles.menuItemActive]}
            onPress={() => onSelectSection(s.key)}
          >
            <View style={styles.iconBox}>{s.icon}</View>
            <Text style={[styles.menuLabel, selectedSection === s.key && styles.menuLabelActive]}>{s.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <TouchableOpacity style={styles.logoutBtn} onPress={onLogout}>
        <Feather name="log-out" size={20} color="#f00" />
        <Text style={styles.logoutText}>Cerrar sesión</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  sidebar: {
    width: 260,
    backgroundColor: '#fff',
    borderRightWidth: 1,
    borderColor: '#ececec',
    paddingTop: 32,
    paddingHorizontal: 18,
    flex: 1,
    maxWidth: 300,
    minHeight: '100%',
    justifyContent: 'flex-start',
  },
  logoBox: { alignItems: 'center', marginBottom: 32 },
  logo: { width: 72, height: 72, borderRadius: 36, marginBottom: 10, borderWidth:2, borderColor:'#fbaa30', resizeMode:'cover' },
  businessName: { fontWeight: 'bold', fontSize: 20, color: '#fbaa30', marginBottom: 2, textAlign:'center' },
  featured: { color:'#d48806', fontWeight:'bold', fontSize:13, marginBottom:2 },
  description: { color: '#666', fontSize: 13, textAlign:'center', marginTop:2 },
  menu: { gap: 6 },
  menuItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 8, borderRadius: 8 },
  menuItemActive: { backgroundColor: '#fffbe6' },
  iconBox: { marginRight: 14 },
  menuLabel: { fontSize: 16, color: '#444', fontWeight: '500' },
  menuLabelActive: { color: '#fbaa30', fontWeight: 'bold' },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', marginTop: 40, gap: 8, alignSelf:'center', backgroundColor:'#fffbe6', borderRadius:8, paddingVertical:10, paddingHorizontal:18, marginBottom: 18 },
  logoutText: { marginLeft: 6, color: '#f00', fontWeight: 'bold', fontSize: 15 },
});
