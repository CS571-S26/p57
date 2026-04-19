import shapesData from '../assets/shapes.json';

// Stateful mock bus simulator: each bus walks along a real route polyline.
// Used as a fallback when the upstream Madison Metro GTFS-RT feed is down.

const BUSES_PER_ROUTE = 2;
const SPEED_PER_POLL = 0.08; // fraction of total route traversed per 20s poll

// Initialize buses: pick a handful of routes with enough coords
const ACTIVE_ROUTES = Object.entries(shapesData)
  .filter(([, v]) => Array.isArray(v.coords) && v.coords.length > 20)
  .slice(0, 12); // cap number of visible routes to keep the screen readable

const state = ACTIVE_ROUTES.flatMap(([routeId, data]) =>
  Array.from({ length: BUSES_PER_ROUTE }, (_, i) => ({
    vehicleId: `mock-${routeId}-${i}`,
    routeId,
    progress: (i / BUSES_PER_ROUTE + Math.random() * 0.1) % 1, // stagger along polyline
    direction: i % 2 === 0 ? 1 : -1,
    coords: data.coords,
  })),
);

function bearing([lat1, lng1], [lat2, lng2]) {
  const toRad = (d) => (d * Math.PI) / 180;
  const toDeg = (r) => (r * 180) / Math.PI;
  const y = Math.sin(toRad(lng2 - lng1)) * Math.cos(toRad(lat2));
  const x =
    Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
    Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(toRad(lng2 - lng1));
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

export function getMockVehicles() {
  return state.map((bus) => {
    // Advance progress; bounce at the endpoints
    bus.progress += bus.direction * SPEED_PER_POLL;
    if (bus.progress > 1) {
      bus.progress = 1 - (bus.progress - 1);
      bus.direction = -1;
    } else if (bus.progress < 0) {
      bus.progress = -bus.progress;
      bus.direction = 1;
    }
    const idx = Math.min(
      bus.coords.length - 2,
      Math.floor(bus.progress * (bus.coords.length - 1)),
    );
    const [lat, lng] = bus.coords[idx];
    const [lat2, lng2] = bus.coords[idx + 1];
    return {
      vehicleId: bus.vehicleId,
      routeId: bus.routeId,
      lat,
      lng,
      bearing: bearing([lat, lng], [lat2, lng2]),
      speed: 0,
      timestamp: Math.floor(Date.now() / 1000),
      occupancy: ['Low', 'Medium', 'High'][Math.floor(Math.random() * 3)],
      // Internal fields used by the interpolator to walk the polyline
      // instead of linearly interpolating lat/lng (which cuts corners).
      _polyline: bus.coords,
      _progress: bus.progress,
      _direction: bus.direction,
    };
  });
}
