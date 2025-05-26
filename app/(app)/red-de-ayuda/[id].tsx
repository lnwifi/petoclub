import { Stack, useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';
import AvisoDetail from '../../../components/RedDeAyuda/AvisoDetail';

export default function AvisoDetailPage() {
  const { id } = useLocalSearchParams();
  
  return (
    <View style={{ flex: 1 }}>
      <Stack.Screen 
        options={{ 
          title: 'Detalle del Aviso',
          headerShown: true 
        }} 
      />
      <AvisoDetail avisoId={id as string} />
    </View>
  );
}
