import { useState, useCallback, useEffect, useRef, memo } from 'react';
import {
  MapContainer as LeafletMap,
  TileLayer,
  CircleMarker,
  Marker,
  Popup,
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  getStops,
  getRoutes,
  fetchVehiclePositions,
} from '../services/metroTransitApi';
import { useTheme } from '../context/ThemeContext';
import RouteOverlay from './RouteOverlay';

const MADISON_CENTER = [43.0731, -89.4012];
const POLL_INTERVAL = 20_000;

const routeColorMap = Object.fromEntries(
  getRoutes().map((r) => [r.id, r.color]),
);

function createBusIcon(color, label) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32">
    <circle cx="16" cy="16" r="14" fill="${color}" stroke="#fff" stroke-width="2"/>
    <text x="16" y="21" text-anchor="middle" fill="#fff" font-size="11" font-weight="bold" font-family="Inter,Arial">${label}</text>
  </svg>`;
  return L.divIcon({
    html: `<img src="data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}" width="32" height="32" />`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    className: '',
  });
}

const BusMarker = memo(function BusMarker({ vehicle, onClick }) {
  const color = routeColorMap[vehicle.routeId] || '#666';
  return (
    <Marker
      position={[vehicle.lat, vehicle.lng]}
      icon={createBusIcon(color, vehicle.routeId)}
      eventHandlers={{ click: () => onClick(vehicle) }}
    >
      <Popup>
        <strong>Route {vehicle.routeId}</strong>
        <br />
        Vehicle #{vehicle.vehicleId}
        {vehicle.occupancy && (
          <>
            <br />
            Occupancy: {vehicle.occupancy}
          </>
        )}
      </Popup>
    </Marker>
  );
});

const LIGHT_TILES = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const DARK_TILES =
  'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';

function MapContainer({
  selectedRoute,
  onSelectBus,
  tripFromStop = null,
  tripToStop = null,
  onClearRoute,
  className = '',
}) {
  const { dark } = useTheme();
  const [vehicles, setVehicles] = useState([]);
  const intervalRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    async function poll() {
      const data = await fetchVehiclePositions();
      if (!cancelled && data.length > 0) setVehicles(data);
    }
    poll();
    intervalRef.current = setInterval(poll, POLL_INTERVAL);
    return () => {
      cancelled = true;
      clearInterval(intervalRef.current);
    };
  }, []);

  const handleBusClick = useCallback(
    (vehicle) => {
      onSelectBus?.({
        route: vehicle.routeId,
        eta: null,
        direction: '',
        vehicleId: vehicle.vehicleId,
        occupancy: vehicle.occupancy,
      });
    },
    [onSelectBus],
  );

  // When a route overlay is active, hide the generic stop dots to avoid clutter
  const showGenericStops = !selectedRoute;
  const stops = showGenericStops ? getStops() : [];

  const visibleVehicles = selectedRoute
    ? vehicles.filter((v) => v.routeId === selectedRoute)
    : vehicles;

  return (
    <div className={`relative rounded-xl overflow-hidden shadow-lg ${className}`}>
      <LeafletMap
        center={MADISON_CENTER}
        zoom={14}
        style={{ width: '100%', height: '100%', minHeight: '400px' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url={dark ? DARK_TILES : LIGHT_TILES}
          key={dark ? 'dark' : 'light'}
        />

        {/* Route overlay (polyline + stops) */}
        {selectedRoute && (
          <RouteOverlay
            routeId={selectedRoute}
            fromStopId={tripFromStop}
            toStopId={tripToStop}
          />
        )}

        {/* Generic stop markers (only when no route is selected) */}
        {showGenericStops &&
          stops
            .filter((s) => s.landmark)
            .map((stop) => (
              <CircleMarker
                key={stop.id}
                center={[stop.lat, stop.lng]}
                radius={5}
                pathOptions={{
                  fillColor: '#c5050c',
                  fillOpacity: 0.9,
                  color: '#fff',
                  weight: 1.5,
                }}
              >
                <Popup>
                  <strong>{stop.name}</strong>
                  <br />
                  <small>Routes: {stop.routes.join(', ')}</small>
                </Popup>
              </CircleMarker>
            ))}

        {/* Live bus markers */}
        {visibleVehicles.map((v) => (
          <BusMarker key={v.vehicleId} vehicle={v} onClick={handleBusClick} />
        ))}
      </LeafletMap>

      {/* Clear route button */}
      {selectedRoute && onClearRoute && (
        <button
          onClick={onClearRoute}
          className="absolute top-3 right-3 z-[1000] flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white dark:bg-gray-800 shadow-lg text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors border border-gray-200 dark:border-gray-600"
          aria-label="Clear route overlay"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
          Clear Route
        </button>
      )}
    </div>
  );
}

export default MapContainer;
