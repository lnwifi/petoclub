import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { supabase } from '../lib/supabase';

interface Props {
  placeId: string;
}

export default function RedemptionsHistory({ placeId }: Props) {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [fromDate, setFromDate] = useState<string | null>(null);
  const [toDate, setToDate] = useState<string | null>(null);

  useEffect(() => {
    fetchHistory();
    // Opcional: suscripción en tiempo real
    const channel = supabase
      .channel('user_coupons')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_coupons', filter: `place_id=eq.${placeId}` }, fetchHistory)
      .subscribe();
    return () => { channel.unsubscribe(); };
  }, [placeId, fromDate, toDate]);

  const fetchHistory = async () => {
    setLoading(true);
    let query = supabase.from('user_coupons').select('id,user_id,coupon_id,redeem_code,redeemed_at,created_at,expires_at,place_id');
    if (placeId) query = query.eq('place_id', placeId);
    if (fromDate) query = query.gte('created_at', fromDate);
    if (toDate) query = query.lte('created_at', toDate);
    query = query.order('created_at', { ascending: false });
    const { data, error } = await query;
    setLoading(false);
    if (error) return;
    setHistory(data || []);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Historial de Canjes</Text>
      {/* Aquí puedes agregar un selector de fechas real, por ahora solo botones rápidos */}
      <View style={styles.filterRow}>
        <TouchableOpacity style={styles.filterBtn} onPress={() => { setFromDate(null); setToDate(null); }}><Text>Todos</Text></TouchableOpacity>
        <TouchableOpacity style={styles.filterBtn} onPress={() => { const d = new Date(); d.setHours(0,0,0,0); setFromDate(d.toISOString().slice(0,10)); setToDate(null); }}><Text>Hoy</Text></TouchableOpacity>
        {/* Aquí podrías agregar un datepicker real para más filtros */}
      </View>
      {loading ? (
        <ActivityIndicator />
      ) : (
        <FlatList
          data={history}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <View style={styles.row}>
              <Text style={styles.cell}><Text style={styles.cellLabel}>Cupón:</Text> {item.coupon_id}</Text>
              <Text style={styles.cell}><Text style={styles.cellLabel}>Usuario:</Text> {item.user_id}</Text>
              <Text style={styles.cell}><Text style={styles.cellLabel}>Código:</Text> {item.redeem_code}</Text>
              <Text style={styles.cell}><Text style={styles.cellLabel}>Canjeado:</Text> {item.redeemed_at ? new Date(item.redeemed_at).toLocaleString() : 'No'}</Text>
              <Text style={styles.cell}><Text style={styles.cellLabel}>Expira:</Text> {item.expires_at ? new Date(item.expires_at).toLocaleString() : '—'}</Text>
            </View>
          )}
          ListEmptyComponent={<Text style={{textAlign:'center', color:'#aaa', marginTop:30}}>No hay canjes registrados.</Text>}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: '#fff', borderRadius: 14, padding: 18, marginVertical: 22 },
  title: { fontWeight: 'bold', fontSize: 20, marginBottom: 12, color:'#222', textAlign:'center' },
  filterRow: { flexDirection: 'row', justifyContent: 'center', marginBottom: 10, gap: 8 },
  filterBtn: { backgroundColor: '#eee', borderRadius: 8, padding: 8, marginHorizontal: 6 },
  row: { borderBottomColor: '#eee', borderBottomWidth: 1, paddingVertical: 8 },
  cell: { fontSize: 13, color:'#333' },
  cellLabel: { fontWeight: 'bold', color:'#888' }
});
