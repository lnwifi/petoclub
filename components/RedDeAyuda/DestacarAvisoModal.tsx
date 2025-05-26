import React, { useState, useEffect, useRef } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import { supabase } from '../../app/lib/supabase';

interface DestacarAvisoModalProps {
  visible: boolean;
  avisoId: string;
  onClose: () => void;
}

export default function DestacarAvisoModal({ visible, avisoId, onClose }: DestacarAvisoModalProps) {
  const [loading, setLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [planEndDate, setPlanEndDate] = useState<Date | null>(null);
  const [waitingPayment, setWaitingPayment] = useState(false);
  const [isFeatured, setIsFeatured] = useState(false);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  const plans = [
    { key: '7d', label: '7 días', price: 1500, days: 7 },
    { key: '15d', label: '15 días', price: 3200, days: 15 },
    { key: '1m', label: '1 mes', price: 5000, days: 30 },
  ];

  // Consulta el estado del aviso en Supabase
  const fetchFeaturedStatus = async () => {
    if (!avisoId) return;
    const { data, error } = await supabase
      .from('red_de_ayuda')
      .select('destacado, destacado_hasta')
      .eq('id', avisoId)
      .single();
    if (!error && data) {
      setIsFeatured(!!data.destacado);
      if (data.destacado_hasta) setPlanEndDate(new Date(data.destacado_hasta));
      if (data.destacado) setWaitingPayment(false);
    }
  };

  useEffect(() => {
    if (visible) fetchFeaturedStatus();
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [visible, avisoId]);

  useEffect(() => {
    if (waitingPayment) {
      pollingRef.current = setInterval(fetchFeaturedStatus, 5000);
    } else {
      if (pollingRef.current) clearInterval(pollingRef.current);
    }
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [waitingPayment]);

  const handlePayment = async () => {
    if (!selectedPlan) {
      Alert.alert('Selecciona un plan', 'Por favor selecciona un plan para destacar tu aviso.');
      return;
    }
    setLoading(true);
    const planObj = plans.find(p => p.key === selectedPlan);
    if (!planObj) {
      Alert.alert('Error', 'No se encontró el plan seleccionado.');
      setLoading(false);
      return;
    }
    try {
      // Obtener la sesión actual
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No se encontró la sesión del usuario');
      }

      const res = await fetch('https://cbrxgjksefmgtoatkbbs.supabase.co/functions/v1/create_payment_preference', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          tipo: 'aviso',
          id: avisoId,
          days: planObj.days,
          price: planObj.price,
          title: `Destacar aviso: ${avisoId}`
        })
      });
      const text = await res.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        data = text;
      }
      if (res.ok && data.init_point) {
        setWaitingPayment(true);
        await WebBrowser.openBrowserAsync(data.init_point);
        Alert.alert('¡Listo!', 'Cuando se confirme el pago, tu aviso será destacado automáticamente.');
      } else {
        Alert.alert('Error', `Respuesta inesperada: ${JSON.stringify(data)}`);
      }
    } catch (e) {
      Alert.alert('Error', 'Ocurrió un error al conectar con el backend');
    }
    setLoading(false);
  };

  function formatDate(date: Date) {
    return date.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <MaterialIcons name="star" size={60} color="#ffbc4c" style={{marginBottom: 18}} />
          <Text style={styles.title}>Destaca tu aviso</Text>
          <Text style={styles.description}>
            Elige uno de los planes para destacar tu aviso y aumentar su visibilidad en la app.
          </Text>
          <View style={styles.plansRow}>
            {plans.map(plan => (
              <TouchableOpacity
                key={plan.key}
                style={[
                  styles.planCard,
                  selectedPlan === plan.key && styles.planCardSelected
                ]}
                onPress={() => setSelectedPlan(plan.key)}
                disabled={loading || waitingPayment || isFeatured}
                activeOpacity={0.85}
              >
                <MaterialIcons name="star" size={30} color={selectedPlan === plan.key ? '#ffbc4c' : '#ffd700'} style={{marginBottom: 6}} />
                <Text style={styles.planPriceBig}>${plan.price}</Text>
                <Text style={styles.planLabelBig}>{plan.label}</Text>
                <Text style={styles.planDuration}>{plan.key === '7d' ? 'Plan Básico' : plan.key === '15d' ? 'Plan Plus' : 'Plan Premium'}</Text>
              </TouchableOpacity>
            ))}
          </View>
          {isFeatured && planEndDate && (
            <View style={{marginBottom:18, alignItems:'center'}}>
              <Text style={{color:'#388e3c', fontWeight:'bold', fontSize:16, marginBottom:2}}>¡Tu aviso está destacado!</Text>
              <Text style={{color:'#888', fontSize:15}}>Vence el {formatDate(planEndDate)}</Text>
            </View>
          )}
          <TouchableOpacity
            style={[styles.button, (loading || waitingPayment || isFeatured) && { opacity: 0.6 }]}
            onPress={handlePayment}
            disabled={loading || waitingPayment || isFeatured}
          >
            {loading ? <ActivityIndicator color="#fff" /> : waitingPayment ? <Text style={styles.buttonText}>Esperando confirmación...</Text> : isFeatured ? <Text style={styles.buttonText}>¡Ya eres destacado!</Text> : <Text style={styles.buttonText}>Destacar mi aviso</Text>}
          </TouchableOpacity>
          <TouchableOpacity style={styles.cancelBtn} onPress={onClose} disabled={loading || waitingPayment}>
            <Text style={{color:'#f00', fontWeight:'bold', fontSize:16}}>Cerrar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center' },
  container: { width: '92%', backgroundColor: '#fff', borderRadius: 20, padding: 28, elevation: 10 },
  title: { fontSize: 26, fontWeight: 'bold', color: '#ffbc4c', marginBottom: 14, textAlign: 'center' },
  description: { fontSize: 15, color: '#555', marginBottom: 18, textAlign: 'center', lineHeight: 22 },
  plansRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'stretch', gap: 16, marginBottom: 24, width: '100%' },
  planCard: { backgroundColor: '#fff', borderWidth: 2, borderColor: '#ffe0b2', borderRadius: 18, paddingVertical: 22, paddingHorizontal: 22, alignItems: 'center', flex: 1, marginHorizontal: 2, shadowColor: '#ffbc4c', shadowOpacity: 0.08, shadowRadius: 8, elevation: 2, minWidth: 100 },
  planCardSelected: { borderColor: '#ffbc4c', backgroundColor: '#fffbe6', elevation: 6, shadowOpacity: 0.22 },
  planPriceBig: { fontSize: 30, color: '#ffbc4c', fontWeight: 'bold', marginBottom: 2 },
  planLabelBig: { fontSize: 18, color: '#222', fontWeight: 'bold', marginBottom: 2 },
  planDuration: { fontSize: 13, color: '#888', fontWeight: '500', marginTop: 2 },
  button: { backgroundColor: '#ffbc4c', paddingVertical: 14, paddingHorizontal: 38, borderRadius: 25, marginTop: 10, shadowColor: '#ffbc4c', shadowOpacity: 0.18, shadowRadius: 9, elevation: 3 },
  buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 18, textAlign: 'center' },
  cancelBtn: { marginTop: 18, alignSelf: 'center' }
});
