import { View, Text, StyleSheet, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function Store() {
  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Pet Store</Text>
      
      <View style={styles.comingSoonContainer}>
        <Ionicons name="paw" size={80} color="#ffbc4c" />
        <Text style={styles.comingSoonTitle}>¡Próximamente!</Text>
        <Text style={styles.comingSoonText}>
          Estamos trabajando para traerte los mejores productos para tu mascota.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontFamily: 'Inter_700Bold',
    marginTop: 20,
    marginBottom: 16,
    marginHorizontal: 16,
  },
  comingSoonContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  comingSoonTitle: {
    fontSize: 28,
    fontFamily: 'Inter_700Bold',
    color: '#333',
    marginTop: 24,
    marginBottom: 12,
  },
  comingSoonText: {
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
  },
});
