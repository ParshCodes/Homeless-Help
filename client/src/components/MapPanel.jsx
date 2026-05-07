import { useMemo } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { SAN_DIEGO_COORDS } from '../hooks/useDeviceLocation';

const SAN_DIEGO_LAT_RANGE = [32.4, 33.1];
const SAN_DIEGO_LON_RANGE = [-117.6, -116.4];

const isWithinSanDiego = (lat, lon) => {
  if (typeof lat !== 'number' || typeof lon !== 'number') {
    return false;
  }

  return lat >= SAN_DIEGO_LAT_RANGE[0] && lat <= SAN_DIEGO_LAT_RANGE[1] && lon >= SAN_DIEGO_LON_RANGE[0] && lon <= SAN_DIEGO_LON_RANGE[1];
};

const MapPanel = ({ events = [], registrations = [] }) => {
  const defaultCenter = [SAN_DIEGO_COORDS.lat, SAN_DIEGO_COORDS.lng];
  const markers = useMemo(() => [...registrations, ...events], [events, registrations]);

  const center = useMemo(() => {
    if (!Array.isArray(markers) || markers.length === 0) {
      return defaultCenter;
    }

    const validMarkers = markers
      .map((event) => ({ lat: event.coords?.lat, lon: event.coords?.lon }))
      .filter((coords) => typeof coords.lat === 'number' && typeof coords.lon === 'number');

    if (!validMarkers.length) {
      return defaultCenter;
    }

    const sanDiegoMarkers = validMarkers.filter((coords) => isWithinSanDiego(coords.lat, coords.lon));
    const markersForCenter = sanDiegoMarkers.length ? sanDiegoMarkers : validMarkers;

    const avgLat =
      markersForCenter.reduce((sum, coords) => sum + coords.lat, 0) / markersForCenter.length;
    const avgLon =
      markersForCenter.reduce((sum, coords) => sum + coords.lon, 0) / markersForCenter.length;

    if (!isWithinSanDiego(avgLat, avgLon)) {
      return defaultCenter;
    }

    return [avgLat, avgLon];
  }, [markers, defaultCenter]);

  return (
    <div className="map-panel">
      <MapContainer
        center={center}
        zoom={12}
        scrollWheelZoom={false}
        style={{ height: '400px', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {markers.map((event) => {
          const isRegistration = (event.type || '').toLowerCase() === 'registration';
          const color = isRegistration ? '#10b981' : '#ef4444';
          const lat = event.coords?.lat;
          const lon = event.coords?.lon;

          if (typeof lat !== 'number' || typeof lon !== 'number') {
            return null;
          }

          return (
            <CircleMarker
              key={`${event._id}-${event.type}`}
              center={[lat, lon]}
              radius={10}
              pathOptions={{ color, fillOpacity: 0.6 }}
            >
              <Popup>
                <strong>{event.type || 'Event'}</strong>
                <br />
                {event.name ? (
                  <>
                    {event.name}
                    <br />
                  </>
                ) : null}
                {event.address ? (
                  <>
                    {event.address}
                    <br />
                  </>
                ) : null}
                {event.timestamp ? new Date(event.timestamp).toLocaleString() : null}
              </Popup>
            </CircleMarker>
          );
        })}
      </MapContainer>
    </div>
  );
};

export default MapPanel;
