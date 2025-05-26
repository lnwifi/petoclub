import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import { supabase } from '../lib/supabase';

export default function DestacarScreen({ navigation, route }: any) {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [planEndDate, setPlanEndDate] = useState<Date | null>(null);
  const [waitingPayment, setWaitingPayment] = useState(false);
  const [isFeatured, setIsFeatured] = useState(false);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  // Recibe el id del local por props o route
  const placeId = route?.params?.placeId || navigation?.getParam?.('placeId');

  const plans = [
    { key: '7d', label: '7 días', price: 2000, days: 7 },
    { key: '15d', label: '15 días', price: 4500, days: 15 },
    { key: '1m', label: '1 mes', price: 7500, days: 30 },
  ];

  // Consulta el estado del local en Supabase
  const fetchFeaturedStatus = async () => {
    if (!placeId) return;
    const { data, error } = await supabase
      .from('places')
      .select('featured, featured_until')
      .eq('id', placeId)
      .single();
    if (!error && data) {
      setIsFeatured(!!data.featured);
      if (data.featured_until) setPlanEndDate(new Date(data.featured_until));
      if (data.featured) setWaitingPayment(false);
    }
  };

  useEffect(() => {
    fetchFeaturedStatus();
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [placeId]);

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
      Alert.alert('Selecciona un plan', 'Por favor selecciona un plan para destacar tu local.');
      return;
    }
    if (!placeId) {
      Alert.alert('Error', 'No se encontró el ID del local.');
      return;
    }
    setLoading(true);
    try {
      const planObj = plans.find(p => p.key === selectedPlan);
      if (!planObj) {
        Alert.alert('Error', 'No se encontró el plan seleccionado.');
        setLoading(false);
        return;
      }
      const res = await fetch('https://cbrxgjksefmgtoatkbbs.supabase.co/functions/v1/create_payment_preference', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNicnhnamtzZWZtZ3RvYXRrYmJzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM1MjgzNDgsImV4cCI6MjA1OTEwNDM0OH0.Y4yPbBgtkFNekGyaJ9njdMecgdwEznECoivKz12F2Hc',
        },
        body: JSON.stringify({
          tipo: 'local',
          id: placeId,
          days: planObj.days,
          price: planObj.price,
          title: `Destacar local: ${placeId}`
        })
      });

      const text = await res.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        data = text;
      }
      console.log('Respuesta de la función:', data);

      if (res.ok && data.init_point) {
        setWaitingPayment(true);
        await WebBrowser.openBrowserAsync(data.init_point);
        Alert.alert('¡Listo!', 'Cuando se confirme el pago, tu local será destacado automáticamente.');
      } else {
        Alert.alert('Error', `Respuesta inesperada: ${JSON.stringify(data)}`);
      }
    } catch (e) {
      console.error('Error en fetch:', e);
      Alert.alert('Error', 'Ocurrió un error al conectar con el backend');
    }
    setLoading(false);
  };

  function formatDate(date: Date) {
    return date.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  return (
    <View style={styles.container}>
      <MaterialIcons name="star" size={60} color="#fbaa30" style={{marginBottom: 18}} />
      <Text style={styles.title}>Destaca tu local</Text>
      <Text style={styles.description}>
        Elige uno de los planes para destacar tu local y aumentar su visibilidad en la app.
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
            <MaterialIcons name="star" size={30} color={selectedPlan === plan.key ? '#fbaa30' : '#ffd700'} style={{marginBottom: 6}} />
            <Text style={styles.planPriceBig}>${plan.price}</Text>
            <Text style={styles.planLabelBig}>{plan.label}</Text>
            <Text style={styles.planDuration}>{plan.key === '7d' ? 'Plan Básico' : plan.key === '15d' ? 'Plan Plus' : 'Plan Premium'}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {isFeatured && planEndDate && (
        <View style={{marginBottom:18, alignItems:'center'}}>
          <Text style={{color:'#388e3c', fontWeight:'bold', fontSize:16, marginBottom:2}}>¡Tu local está destacado!</Text>
          <Text style={{color:'#888', fontSize:15}}>Vence el {formatDate(planEndDate)}</Text>
        </View>
      )}
      <TouchableOpacity
        style={[styles.button, (loading || waitingPayment || isFeatured) && { opacity: 0.6 }]}
        onPress={handlePayment}
        disabled={loading || waitingPayment || isFeatured}
      >
        {loading ? <ActivityIndicator color="#fff" /> : waitingPayment ? <Text style={styles.buttonText}>Esperando confirmación...</Text> : isFeatured ? <Text style={styles.buttonText}>¡Ya eres destacado!</Text> : <Text style={styles.buttonText}>Destacar mi local</Text>}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
    backgroundColor: '#fffbe6',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fbaa30',
    marginBottom: 14,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    color: '#555',
    marginBottom: 18,
    textAlign: 'center',
    lineHeight: 22,
  },
  plansRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'stretch',
    gap: 16,
    marginBottom: 24,
    width: '100%',
  },
  planCard: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#ffe0b2',
    borderRadius: 18,
    paddingVertical: 22,
    paddingHorizontal: 22,
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 2,
    shadowColor: '#fbaa30',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
    minWidth: 100,
  },
  planCardSelected: {
    borderColor: '#fbaa30',
    backgroundColor: '#fffbe6',
    elevation: 6,
    shadowOpacity: 0.22,
  },
  planPriceBig: {
    fontSize: 30,
    color: '#fbaa30',
    fontWeight: 'bold',
    marginBottom: 2,
  },
  planLabelBig: {
    fontSize: 18,
    color: '#222',
    fontWeight: 'bold',
    marginBottom: 2,
  },
  planDuration: {
    fontSize: 13,
    color: '#888',
    fontWeight: '500',
    marginTop: 2,
  },
  button: {
    backgroundColor: '#fbaa30',
    paddingVertical: 14,
    paddingHorizontal: 38,
    borderRadius: 25,
    marginTop: 10,
    shadowColor: '#fbaa30',
    shadowOpacity: 0.18,
    shadowRadius: 9,
    elevation: 3,
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 18,
    textAlign: 'center',
  },
});
