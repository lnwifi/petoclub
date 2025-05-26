import React from 'react';
import { View, StyleSheet } from 'react-native';
import MapView, { Marker } from 'react-native-maps';

interface Place {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  address?: string;
}

interface MapNativeProps {
  places: Place[];
}

export default function MapMobile({ places }: MapNativeProps) {
  return (
    <MapView
      style={{ width: '100%', height: 260, marginBottom: 20, borderRadius: 16 }}
      initialRegion={{
        latitude: places.length && places[0].latitude ? places[0].latitude : -34.6037,
        longitude: places.length && places[0].longitude ? places[0].longitude : -58.3816,
        latitudeDelta: 0.08,
        longitudeDelta: 0.08,
      }}
      showsUserLocation={false}
      showsMyLocationButton={false}
    >
      {places.filter((p) => p.latitude && p.longitude).map((place) => (
        <Marker
          key={place.id}
          coordinate={{ latitude: place.latitude, longitude: place.longitude }}
          title={place.name}
          description={place.address}
        />
      ))}
    </MapView>
  );
}
