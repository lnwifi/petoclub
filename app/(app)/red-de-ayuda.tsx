import React, { useEffect } from 'react';
import { useLocalSearchParams } from 'expo-router';
import AvisosList from '../../components/RedDeAyuda/AvisosList';

export default function RedDeAyudaPage() {
  const params = useLocalSearchParams();
  const avisoId = params.avisoId as string | undefined;

  return <AvisosList avisoIdToShow={avisoId} />;
}
