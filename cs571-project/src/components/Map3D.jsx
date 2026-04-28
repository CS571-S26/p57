import { useEffect, useRef, memo } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { MapboxOverlay } from '@deck.gl/mapbox';
import { IconLayer, ScatterplotLayer } from '@deck.gl/layers';
import { SimpleMeshLayer } from '@deck.gl/mesh-layers';
import { getRoutes } from '../services/metroTransitApi';
import { useTheme } from '../context/ThemeContext';
import { useInterpolatedVehicles } from '../hooks/useInterpolatedVehicles';
import { closestPerDirection } from '../utils/geo';
import { BUS_MESH } from '../utils/busMesh';

const MADISON_CENTER = [-89.4012, 43.0731]; // [lng, lat] for MapLibre
// OpenFreeMap "liberty" uses the OpenMapTiles schema (source: openmaptiles,
// source-layer: building) which we rely on for the 3D extrusion layer.
// Carto's dark-matter uses a different schema, so 3D buildings won't render
// over it — but the basemap still loads cleanly in dark mode.
// Use OpenFreeMap "liberty" (OpenMapTiles schema) for both modes so the
// 3D fill-extrusion building layer works regardless of theme.
const LIGHT_STYLE = 'https://tiles.openfreemap.org/styles/liberty';
const DARK_STYLE = LIGHT_STYLE;

const routeColorMap = Object.fromEntries(
  getRoutes().map((r) => [r.id, r.color]),
);

/** "#c5050c" → [197, 5, 12] for deck.gl color accessors. */
function hexToRgb(hex) {
  const h = (hex || '#888').replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function makeBusIconUrl(color, label) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64">
    <circle cx="32" cy="32" r="26" fill="${color}" stroke="#fff" stroke-width="4"/>
    <text x="32" y="40" text-anchor="middle" fill="#fff" font-size="22" font-weight="bold" font-family="Inter,Arial">${label}</text>
  </svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function add3DBuildings(map) {
  const layers = map.getStyle().layers || [];
  // Insert beneath the topmost label layer if possible
  let beforeId;
  for (const l of layers) {
    if (l.type === 'symbol') {
      beforeId = l.id;
      break;
    }
  }
  if (map.getLayer('3d-buildings')) return;
  // OpenFreeMap uses the OpenMapTiles schema: source "openmaptiles", source-layer "building"
  if (!map.getSource('openmaptiles')) return;
  map.addLayer(
    {
      id: '3d-buildings',
      source: 'openmaptiles',
      'source-layer': 'building',
      type: 'fill-extrusion',
      minzoom: 13,
      paint: {
        'fill-extrusion-color': [
          'case',
          ['has', 'colour'],
          ['get', 'colour'],
          '#aab',
        ],
        'fill-extrusion-height': [
          'case',
          ['has', 'render_height'],
          ['get', 'render_height'],
          ['has', 'height'],
          ['get', 'height'],
          5,
        ],
        'fill-extrusion-base': [
          'case',
          ['has', 'render_min_height'],
          ['get', 'render_min_height'],
          0,
        ],
        'fill-extrusion-opacity': 0.8,
      },
    },
    beforeId,
  );
}

function Map3D({
  selectedRoute,
  onSelectBus,
  followVehicleId = null,
  userLocation = null,
  className = '',
  pitch = 60,
  zoom = 15,
  center = MADISON_CENTER,
}) {
  const { dark } = useTheme();
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const overlayRef = useRef(null);
  const { vehicles } = useInterpolatedVehicles();

  // Initialize map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: dark ? DARK_STYLE : LIGHT_STYLE,
      center,
      zoom,
      pitch,
      bearing: -20,
      antialias: true,
    });
    mapRef.current = map;

    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'top-right');

    map.on('style.load', () => add3DBuildings(map));
    map.on('error', (e) => {
      console.warn('[Map3D] map error:', e?.error?.message || e);
    });

    const overlay = new MapboxOverlay({ interleaved: true, layers: [] });
    overlayRef.current = overlay;
    map.addControl(overlay);

    return () => {
      map.remove();
      mapRef.current = null;
      overlayRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Swap basemap when theme changes
  useEffect(() => {
    if (!mapRef.current) return;
    mapRef.current.setStyle(dark ? DARK_STYLE : LIGHT_STYLE);
    // Re-add 3D buildings after style swap
    mapRef.current.once('style.load', () => add3DBuildings(mapRef.current));
  }, [dark]);

  // Camera follow for selected vehicle
  useEffect(() => {
    if (!mapRef.current || !followVehicleId) return;
    const v = vehicles.find((x) => x.vehicleId === followVehicleId);
    if (!v) return;
    mapRef.current.easeTo({
      center: [v.lng, v.lat],
      zoom: 17,
      pitch: 67,
      bearing: v.bearing || 0,
      duration: 800,
    });
    // We intentionally only ease when the followed vehicle changes, not every frame
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [followVehicleId]);

  // Smooth follow on every frame when following
  useEffect(() => {
    if (!mapRef.current || !followVehicleId) return;
    const v = vehicles.find((x) => x.vehicleId === followVehicleId);
    if (!v) return;
    mapRef.current.jumpTo({ center: [v.lng, v.lat] });
  }, [vehicles, followVehicleId]);

  // Fly to the user's location the first time it's granted
  const flownToUserRef = useRef(false);
  useEffect(() => {
    if (!mapRef.current || !userLocation || flownToUserRef.current) return;
    mapRef.current.easeTo({
      center: [userLocation.lng, userLocation.lat],
      zoom: 16.5,
      pitch: 60,
      duration: 1000,
    });
    flownToUserRef.current = true;
  }, [userLocation]);

  // Update deck.gl bus layers (3D scenegraph model + floating route label icon)
  useEffect(() => {
    if (!overlayRef.current) return;
    const onRoute = selectedRoute
      ? vehicles.filter((v) => v.routeId === selectedRoute)
      : vehicles;
    // When the user has shared their location AND picked a route, narrow to
    // closest-per-direction (matches the 2D behavior).
    const visible =
      selectedRoute && userLocation
        ? closestPerDirection(onRoute, userLocation)
        : onRoute;

    // 3D bus — procedural cuboid sized like a real bus, route-colored,
    // rotated to face the GTFS-RT bearing. Mesh +X = bus front; rotate
    // around vertical axis (roll) by (90 - bearing) so 0° points north.
    const vehiclesLayer = new SimpleMeshLayer({
      id: 'buses-3d',
      data: visible,
      mesh: BUS_MESH,
      pickable: true,
      sizeScale: 4,
      _lighting: 'pbr',
      material: { ambient: 0.5, diffuse: 0.8, shininess: 32 },
      getPosition: (d) => [d.lng, d.lat, 0],
      getOrientation: (d) => [0, 0, 90 - (d.bearing || 0)],
      getColor: (d) => hexToRgb(routeColorMap[d.routeId] || '#666'),
      onClick: ({ object }) => object && onSelectBus?.(object),
      updateTriggers: {
        getPosition: visible,
        getOrientation: visible,
        getColor: selectedRoute,
      },
    });

    // Floating route label above each bus so you can identify them at a glance
    const labelsLayer = new IconLayer({
      id: 'bus-labels',
      data: visible,
      pickable: false,
      sizeUnits: 'pixels',
      getIcon: (d) => ({
        url: makeBusIconUrl(routeColorMap[d.routeId] || '#666', d.routeId || '?'),
        width: 64,
        height: 64,
        anchorY: 64,
      }),
      getPosition: (d) => [d.lng, d.lat, 25],
      getSize: 28,
      getColor: () => [255, 255, 255, 255],
      updateTriggers: { getIcon: [selectedRoute] },
    });

    // "You are here" — a soft halo + solid blue dot pinned at ground level.
    const userLayers = userLocation
      ? [
          new ScatterplotLayer({
            id: 'user-location-halo',
            data: [userLocation],
            pickable: false,
            stroked: false,
            filled: true,
            radiusUnits: 'pixels',
            getRadius: 22,
            getFillColor: [37, 99, 235, 60],
            getPosition: (d) => [d.lng, d.lat, 0],
          }),
          new ScatterplotLayer({
            id: 'user-location-dot',
            data: [userLocation],
            pickable: false,
            stroked: true,
            filled: true,
            radiusUnits: 'pixels',
            getRadius: 8,
            getFillColor: [37, 99, 235, 255],
            getLineColor: [255, 255, 255, 255],
            getLineWidth: 2,
            lineWidthUnits: 'pixels',
            getPosition: (d) => [d.lng, d.lat, 0],
          }),
        ]
      : [];

    overlayRef.current.setProps({
      layers: [vehiclesLayer, labelsLayer, ...userLayers],
    });
  }, [vehicles, selectedRoute, onSelectBus, userLocation]);

  return (
    <div className={`relative rounded-xl overflow-hidden shadow-lg ${className}`}>
      <div ref={containerRef} style={{ width: '100%', height: '100%', minHeight: '400px' }} />
    </div>
  );
}

export default memo(Map3D);
