import routesData from '../assets/routes.json';
import stopsData from '../assets/stops.json';
import { getMockVehicles } from './mockVehicles';

// ---------------------------------------------------------------------------
// Madison Metro GTFS-RT endpoints
// The CORS proxy prefix is used in production (serverless function at /api/).
// In dev mode we fall back to a public CORS proxy or direct access.
// ---------------------------------------------------------------------------
const GTFS_RT_BASE =
  import.meta.env.VITE_API_BASE_URL ||
  'https://metromap.cityofmadison.com/gtfsrt';

// ---------------------------------------------------------------------------
// Static data helpers (baked-in JSON — no network needed)
// ---------------------------------------------------------------------------

/** Return all Madison Metro routes from the baked JSON. */
export function getRoutes() {
  return routesData;
}

/** Return all stops, optionally filtered by route ID. */
export function getStops(routeId) {
  if (!routeId) return stopsData;
  return stopsData.filter((s) => s.routes.includes(routeId));
}

/** Return only landmark / major-hub stops. */
export function getLandmarkStops() {
  return stopsData.filter((s) => s.landmark);
}

/**
 * Search stops by name.  Case-insensitive substring match.
 * Returns max `limit` results (default 10).
 */
export function searchStops(query, limit = 10) {
  if (!query || !query.trim()) return [];
  const q = query.toLowerCase();
  return stopsData
    .filter((s) => s.name.toLowerCase().includes(q))
    .slice(0, limit);
}

/**
 * Given a stop, return the routes that serve it along with the route metadata.
 */
export function getRoutesForStop(stopId) {
  const stop = stopsData.find((s) => s.id === stopId);
  if (!stop) return [];
  return routesData.filter((r) => stop.routes.includes(r.id));
}

// ---------------------------------------------------------------------------
// GTFS-Realtime helpers (dynamic data — requires network)
// ---------------------------------------------------------------------------

/**
 * Fetch live vehicle positions.
 * Returns an array of { vehicleId, routeId, lat, lng, bearing, speed, timestamp }.
 */
export async function fetchVehiclePositions() {
  try {
    const res = await fetch(`${GTFS_RT_BASE}/vehicles`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = await res.text();
    // BusTime sometimes returns "ERROR: ..." with HTTP 200 — treat as failure
    if (!text || text.startsWith('ERROR')) throw new Error('upstream BusTime error');
    const data = JSON.parse(text);
    const entities = data.entity || data.entities || data || [];
    const parsed = entities
      .map((e) => {
        const vp = e.vehicle || e;
        const pos = vp.position || {};
        const trip = vp.trip || {};
        return {
          vehicleId: vp.vehicle?.id || e.id,
          routeId: trip.routeId || trip.route_id || '',
          lat: pos.latitude,
          lng: pos.longitude,
          bearing: pos.bearing || 0,
          speed: pos.speed || 0,
          timestamp: vp.timestamp || null,
          occupancy: vp.occupancyStatus || vp.occupancy_status || null,
        };
      })
      .filter((v) => Number.isFinite(v.lat) && Number.isFinite(v.lng));
    if (parsed.length === 0) throw new Error('empty feed');
    return parsed;
  } catch {
    // Fall back to simulated vehicles so the UI stays useful when the feed is down
    return getMockVehicles();
  }
}

/**
 * Fetch trip updates (ETAs at stops).
 * Returns raw entities — consumers can filter by route/stop.
 */
export async function fetchTripUpdates() {
  try {
    const res = await fetch(`${GTFS_RT_BASE}/trips`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return data.entity || data.entities || data || [];
  } catch {
    return [];
  }
}

/**
 * Fetch active service alerts.
 */
export async function fetchServiceAlerts() {
  try {
    const res = await fetch(`${GTFS_RT_BASE}/alerts`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return data.entity || data.entities || data || [];
  } catch {
    return [];
  }
}

/**
 * Quick health check — pings the vehicle positions endpoint.
 * Returns 'green' | 'yellow' | 'red'.
 */
export async function checkApiHealth() {
  try {
    const start = Date.now();
    const res = await fetch(`${GTFS_RT_BASE}/vehicles`, {
      signal: AbortSignal.timeout(5000),
    });
    const elapsed = Date.now() - start;
    if (!res.ok) return 'red';
    return elapsed < 2000 ? 'green' : 'yellow';
  } catch {
    return 'red';
  }
}

// ---------------------------------------------------------------------------
// LocalStorage helpers — recent destinations
// ---------------------------------------------------------------------------
const RECENT_KEY = 'metro_recent_destinations';

export function getRecentDestinations() {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY)) || [];
  } catch {
    return [];
  }
}

export function saveRecentDestination(stop) {
  const recent = getRecentDestinations().filter((s) => s.id !== stop.id);
  recent.unshift({ id: stop.id, name: stop.name });
  localStorage.setItem(RECENT_KEY, JSON.stringify(recent.slice(0, 5)));
}
