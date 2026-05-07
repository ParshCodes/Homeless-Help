import { useMemo } from 'react';
import { MapContainer, TileLayer, CircleMarker, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { SAN_DIEGO_COORDS } from '../hooks/useDeviceLocation';

const SAN_DIEGO_CENTER = [SAN_DIEGO_COORDS.lat, SAN_DIEGO_COORDS.lng];

const MapClickHandler = ({ onSelect }) => {
  useMapEvents({
    click(event) {
      if (typeof onSelect === 'function') {
        onSelect({ lat: event.latlng.lat, lng: event.latlng.lng });
      }
    },
  });

  return null;
};

const LocationPicker = ({ value, onChange, defaultCenter }) => {
  const center = useMemo(() => {
    if (value?.lat != null && value?.lng != null) {
      return [value.lat, value.lng];
    }
    if (Array.isArray(defaultCenter) && defaultCenter.length === 2) {
      return defaultCenter;
    }
    return SAN_DIEGO_CENTER;
  }, [value, defaultCenter]);

  return (
    <div className="h-64 w-full overflow-hidden rounded-2xl border border-white/10 shadow-inner shadow-black/20">
      <MapContainer center={center} zoom={12} scrollWheelZoom style={{ height: '100%', width: '100%' }}>
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution="&copy; <a href='https://www.openstreetmap.org/copyright'>OpenStreetMap</a> contributors"
        />
        <MapClickHandler onSelect={onChange} />
        {value?.lat != null && value?.lng != null ? (
          <CircleMarker
            center={[value.lat, value.lng]}
            radius={10}
            pathOptions={{ color: '#38bdf8', fillColor: '#38bdf8', fillOpacity: 0.85 }}
          />
        ) : null}
      </MapContainer>
    </div>
  );
};

export default LocationPicker;
