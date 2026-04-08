import { useState, useCallback } from 'react';
import { GoogleMap, useJsApiLoader, Marker, InfoWindow } from '@react-google-maps/api';

const MADISON_CENTER = { lat: 43.0731, lng: -89.4012 };

const MAP_STYLES = {
  width: '100%',
  height: '500px',
  borderRadius: '8px',
};

const SAMPLE_BUSES = [
  { id: 1, route: '80', position: { lat: 43.0766, lng: -89.4125 }, direction: 'Eastbound', eta: 3 },
  { id: 2, route: '02', position: { lat: 43.0695, lng: -89.3990 }, direction: 'Westbound', eta: 7 },
  { id: 3, route: '28', position: { lat: 43.0720, lng: -89.4080 }, direction: 'Northbound', eta: 5 },
  { id: 4, route: '01', position: { lat: 43.0810, lng: -89.3870 }, direction: 'Southbound', eta: 10 },
];

function MapContainer({ selectedRoute, onSelectBus }) {
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
  });

  const [activeMarker, setActiveMarker] = useState(null);

  const handleMarkerClick = useCallback((bus) => {
    setActiveMarker(bus.id);
    if (onSelectBus) onSelectBus(bus);
  }, [onSelectBus]);

  const visibleBuses = selectedRoute
    ? SAMPLE_BUSES.filter((b) => b.route === selectedRoute)
    : SAMPLE_BUSES;

  if (loadError) {
    return (
      <div className="map-placeholder d-flex align-items-center justify-content-center bg-light border rounded">
        <p className="text-danger">Failed to load Google Maps. Check your API key.</p>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="map-placeholder d-flex align-items-center justify-content-center bg-light border rounded">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading map...</span>
        </div>
      </div>
    );
  }

  return (
    <GoogleMap
      mapContainerStyle={MAP_STYLES}
      center={MADISON_CENTER}
      zoom={14}
    >
      {visibleBuses.map((bus) => (
        <Marker
          key={bus.id}
          position={bus.position}
          label={bus.route}
          onClick={() => handleMarkerClick(bus)}
        >
          {activeMarker === bus.id && (
            <InfoWindow onCloseClick={() => setActiveMarker(null)}>
              <div>
                <strong>Route {bus.route}</strong>
                <br />
                {bus.direction} — ETA {bus.eta} min
              </div>
            </InfoWindow>
          )}
        </Marker>
      ))}
    </GoogleMap>
  );
}

export default MapContainer;
