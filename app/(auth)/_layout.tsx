import { Slot } from 'expo-router';
import { AuthRoute } from '@/lib/auth-route';
import { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';

export default function AuthLayout() {
  // Use a ref to track if the component is mounted
  const isMounted = useRef(true);
  
  // Set up the mounted state
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);
  
  return (
    <AuthRoute requireAuth={false}>
      <View style={styles.container}>
        <Slot />
      </View>
    </AuthRoute>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 20,
    alignItems: 'center',
  },
  logo: {
    width: 200,
    height: 200,
    marginBottom: 30,
  },
});