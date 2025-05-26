import React from 'react';

interface Place {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  address?: string;
}

interface MapWebProps {
  places: Place[];
}


export default function MapWeb({ places }: MapWebProps) {
  const { MapContainer, TileLayer, Marker, Popup } = require('react-leaflet');
  const center = places.length && places[0].latitude && places[0].longitude
    ? [places[0].latitude, places[0].longitude]
    : [-34.6037, -58.3816];
  return (
    <div style={{ width: '100%', height: 260, marginBottom: 20, borderRadius: 16, overflow: 'hidden' }}>
      <MapContainer center={center} zoom={13} style={{ width: '100%', height: '100%' }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {places.filter((p) => p.latitude && p.longitude).map((place) => (
          <Marker key={place.id} position={[place.latitude, place.longitude]}>
            <Popup>
              <b>{place.name}</b><br />{place.address}
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
