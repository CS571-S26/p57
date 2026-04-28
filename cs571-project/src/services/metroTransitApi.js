import GtfsRealtimeBindings from 'gtfs-realtime-bindings';
import routesData from '../assets/routes.json';
import stopsData from '../assets/stops.json';
import scheduleData from '../assets/schedule.json';
import { getMockVehicles } from './mockVehicles';
import { haversineKm } from '../utils/geo';

// ---------------------------------------------------------------------------
// Madison Metro GTFS-Realtime endpoints
// ---------------------------------------------------------------------------
// The City of Madison publishes three GTFS-RT feeds in Protocol Buffer format:
//   /gtfsrt/vehicles  — VehiclePositions
//   /gtfsrt/trips     — TripUpdates
//   /gtfsrt/alerts    — Alerts
// These do not send CORS headers, so a static (GitHub Pages) deployment must
// proxy them. CLAUDE.md prefers a serverless function at /api/ (Option A);
// when VITE_API_BASE_URL is set we use it. Otherwise we fall back through a
// chain of public CORS proxies (Option B). If everything fails we surface the
// realistic mock simulator so the UI never goes blank.
// ---------------------------------------------------------------------------

const FEED_BASE = 'https://metromap.cityofmadison.com/gtfsrt';

// Allow override at build time. If set, we trust this base for ALL feed paths
// (production deploy with serverless proxy → e.g. VITE_API_BASE_URL=/api).
const API_BASE_OVERRIDE = import.meta.env.VITE_API_BASE_URL || '';

// Public CORS proxies, tried in order. We prefer ones that pass through binary
// bodies untouched (allorigins/raw, codetabs) since GTFS-RT is protobuf.
const CORS_PROXIES = [
  (url) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
  (url) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
  (url) => `https://api.codetabs.com/v1/proxy/?quest=${encodeURIComponent(url)}`,
];

/** Resolve a feed path to a list of candidate URLs to try in order. */
function feedUrlCandidates(path) {
  if (API_BASE_OVERRIDE) {
    return [`${API_BASE_OVERRIDE}/${path}`];
  }
  const direct = `${FEED_BASE}/${path}`;
  return [direct, ...CORS_PROXIES.map((p) => p(direct))];
}

/**
 * Fetch a GTFS-RT FeedMessage as decoded protobuf, walking through the proxy
 * candidates until one succeeds. Returns null if none work.
 */
async function fetchFeedMessage(path) {
  const { FeedMessage } = GtfsRealtimeBindings.transit_realtime;
  for (const url of feedUrlCandidates(path)) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
      if (!res.ok) continue;
      const buf = new Uint8Array(await res.arrayBuffer());
      // GTFS-RT protobuf messages start with field 1 (header) tag = 0x0a.
      // If the first byte is '<' or '{' we got an error page or JSON — skip.
      if (buf.length === 0 || buf[0] === 0x3c || buf[0] === 0x7b) continue;
      return FeedMessage.decode(buf);
    } catch {
      // Try next proxy
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Static data helpers (baked-in JSON — no network needed)
// ---------------------------------------------------------------------------

export function getRoutes() {
  return routesData;
}

export function getStops(routeId) {
  if (!routeId) return stopsData;
  return stopsData.filter((s) => s.routes.includes(routeId));
}

export function getLandmarkStops() {
  return stopsData.filter((s) => s.landmark);
}

export function searchStops(query, limit = 10) {
  if (!query || !query.trim()) return [];
  const q = query.toLowerCase();
  return stopsData
    .filter((s) => s.name.toLowerCase().includes(q))
    .slice(0, limit);
}

/** Direct lookup by stop ID. Used for deep links like `#/?stop=2847`. */
export function getStopById(stopId) {
  if (stopId == null) return null;
  return stopsData.find((s) => s.id === String(stopId)) || null;
}

export function getRoutesForStop(stopId) {
  const stop = stopsData.find((s) => s.id === stopId);
  if (!stop) return [];
  return routesData.filter((r) => stop.routes.includes(r.id));
}

const routeById = Object.fromEntries(routesData.map((r) => [r.id, r]));

/**
 * Human label for a route direction.
 *   getDirectionLabel("28", 0) => "Toward Whitney via Sherman"
 *   getDirectionLabel("28", 1) => "Toward Sherman"
 * Falls back gracefully when direction metadata is missing.
 */
export function getDirectionLabel(routeId, directionId) {
  if (routeId == null || directionId == null) return '';
  const route = routeById[routeId];
  if (!route?.directions) return '';
  const dir = route.directions.find((d) => d.id === Number(directionId));
  if (!dir) return '';
  if (dir.headsign) return `Toward ${dir.headsign}`;
  if (dir.directionName) return dir.directionName;
  return '';
}

/** Compact label without the "Toward" prefix — for tight columns. */
export function getDirectionShort(routeId, directionId) {
  if (routeId == null || directionId == null) return '';
  const route = routeById[routeId];
  if (!route?.directions) return '';
  const dir = route.directions.find((d) => d.id === Number(directionId));
  return dir?.headsign || dir?.directionName || '';
}

/** All directions a route runs in. */
export function getDirections(routeId) {
  return routeById[routeId]?.directions || [];
}

// ---------------------------------------------------------------------------
// Static schedule helpers — backed by schedule.json (per route × direction
// × day-type × stop → list of departure seconds-since-midnight).
// ---------------------------------------------------------------------------

/** Maps a Date to one of the bucketed day types we baked. */
export function dayTypeFor(date = new Date()) {
  const d = date.getDay();
  if (d === 0) return 'sunday';
  if (d === 6) return 'saturday';
  return 'weekday';
}

function nowSecondsSinceMidnight(date = new Date()) {
  return date.getHours() * 3600 + date.getMinutes() * 60 + date.getSeconds();
}

/**
 * All scheduled departure seconds at a stop for one route × direction
 * on a given day-type. Returns [] if nothing is baked.
 */
export function getScheduleAt(stopId, routeId, directionId, dayType) {
  if (stopId == null || routeId == null) return [];
  const dt = dayType ?? dayTypeFor();
  return (
    scheduleData?.[routeId]?.[directionId ?? 0]?.[dt]?.[stopId] || []
  );
}

/** Same but flattened across both directions (handy for "all departures here"). */
export function getScheduleAcrossDirections(stopId, routeId, dayType) {
  const route = routeById[routeId];
  if (!route) return [];
  const dirs = route.directions?.length ? route.directions.map((d) => d.id) : [0];
  const out = [];
  for (const did of dirs) {
    for (const sec of getScheduleAt(stopId, routeId, did, dayType)) {
      out.push({ directionId: did, sec });
    }
  }
  out.sort((a, b) => a.sec - b.sec);
  return out;
}

/**
 * Next scheduled departure at this stop on this route × direction,
 * relative to `now` (or right now). Returns null if none remain today.
 */
export function getNextScheduled(stopId, routeId, directionId, now = new Date()) {
  const departures = getScheduleAt(stopId, routeId, directionId, dayTypeFor(now));
  const cur = nowSecondsSinceMidnight(now);
  return departures.find((s) => s >= cur) ?? null;
}

/**
 * Last bus of the current service day at a stop (across all routes &
 * directions baked for that day-type). Returns { sec, routeId, directionId } | null.
 */
export function getLastBusToday(stopId, now = new Date()) {
  const dt = dayTypeFor(now);
  const stop = stopsData.find((s) => s.id === stopId);
  if (!stop) return null;
  let best = null;
  for (const routeId of stop.routes) {
    const route = routeById[routeId];
    const dirs = route?.directions?.length ? route.directions.map((d) => d.id) : [0];
    for (const did of dirs) {
      const list = getScheduleAt(stopId, routeId, did, dt);
      if (list.length === 0) continue;
      const last = list[list.length - 1];
      if (!best || last > best.sec) best = { sec: last, routeId, directionId: did };
    }
  }
  return best;
}

/** "31920" → "8:52 AM"  (handles GTFS's >24:00 next-day suffix). */
export function formatTimeOfDay(sec) {
  if (sec == null) return '';
  let s = sec;
  const overnight = s >= 86400;
  if (overnight) s -= 86400;
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const h12 = ((h + 11) % 12) + 1;
  const ampm = h < 12 ? 'AM' : 'PM';
  const mm = String(m).padStart(2, '0');
  return `${h12}:${mm} ${ampm}${overnight ? ' (next day)' : ''}`;
}

/**
 * Stops within `maxKm` of the user's location, sorted by distance.
 * Each result is annotated with `distanceKm` so callers can render
 * "120 m away."
 */
export function getNearbyStops(userLoc, maxKm = 0.4, limit = 5) {
  if (!userLoc || !Number.isFinite(userLoc.lat) || !Number.isFinite(userLoc.lng)) {
    return [];
  }
  const annotated = [];
  for (const s of stopsData) {
    const distanceKm = haversineKm(userLoc, s);
    if (distanceKm <= maxKm) annotated.push({ ...s, distanceKm });
  }
  annotated.sort((a, b) => a.distanceKm - b.distanceKm);
  return annotated.slice(0, limit);
}

// ---------------------------------------------------------------------------
// GTFS-Realtime helpers (live data over the network)
// ---------------------------------------------------------------------------

const routeIdSet = new Set(routesData.map((r) => r.id));

/**
 * Fetch live vehicle positions from Madison Metro's GTFS-RT VehiclePositions
 * feed. Returns an array of normalized vehicle objects.
 */
export async function fetchVehiclePositions() {
  const feed = await fetchFeedMessage('vehicles');
  if (!feed || !feed.entity || feed.entity.length === 0) {
    // Upstream is down or proxy chain failed — fall back to simulator
    return getMockVehicles();
  }

  const parsed = feed.entity
    .map((e) => {
      const vp = e.vehicle;
      if (!vp || !vp.position) return null;
      const trip = vp.trip || {};
      const rid = trip.routeId || '';
      return {
        vehicleId: vp.vehicle?.id || vp.vehicle?.label || e.id,
        routeId: routeIdSet.has(rid) ? rid : rid,
        lat: vp.position.latitude,
        lng: vp.position.longitude,
        bearing: vp.position.bearing || 0,
        speed: vp.position.speed || 0,
        timestamp: Number(vp.timestamp) || null,
        occupancy: occupancyLabel(vp.occupancyStatus),
        directionId: trip.directionId != null ? trip.directionId : null,
      };
    })
    .filter((v) => v && Number.isFinite(v.lat) && Number.isFinite(v.lng));

  return parsed.length > 0 ? parsed : getMockVehicles();
}

const OCCUPANCY_MAP = {
  0: 'Low',         // EMPTY
  1: 'Low',         // MANY_SEATS_AVAILABLE
  2: 'Medium',      // FEW_SEATS_AVAILABLE
  3: 'Medium',      // STANDING_ROOM_ONLY
  4: 'High',        // CRUSHED_STANDING_ROOM_ONLY
  5: 'High',        // FULL
  6: 'High',        // NOT_ACCEPTING_PASSENGERS
};

function occupancyLabel(status) {
  if (status == null) return null;
  return OCCUPANCY_MAP[status] || null;
}

/**
 * Fetch live trip updates (per-stop arrival/departure predictions).
 * Returns a map: { tripId: { routeId, stopUpdates: [{ stopId, eta, delay }] } }
 */
export async function fetchTripUpdates() {
  const feed = await fetchFeedMessage('trips');
  if (!feed || !feed.entity) return {};

  const out = {};
  for (const e of feed.entity) {
    const tu = e.tripUpdate;
    if (!tu) continue;
    const tripId = tu.trip?.tripId || e.id;
    const routeId = tu.trip?.routeId || '';
    const directionId =
      tu.trip?.directionId != null ? Number(tu.trip.directionId) : null;
    const stopUpdates = (tu.stopTimeUpdate || []).map((s) => {
      const arrivalSec = Number(s.arrival?.time) || Number(s.departure?.time);
      return {
        stopId: s.stopId,
        eta: arrivalSec ? Math.max(0, Math.round((arrivalSec * 1000 - Date.now()) / 60000)) : null,
        delay: s.arrival?.delay || s.departure?.delay || 0,
      };
    });
    out[tripId] = { routeId, directionId, stopUpdates };
  }
  return out;
}

/**
 * Get live ETAs for a given stop, sorted ascending. Each entry is
 * { routeId, route, eta, occupancy }.
 */
export async function fetchStopArrivals(stopId) {
  const updates = await fetchTripUpdates();
  const routesById = Object.fromEntries(routesData.map((r) => [r.id, r]));
  const arrivals = [];
  for (const tu of Object.values(updates)) {
    const hit = tu.stopUpdates.find((s) => s.stopId === stopId && s.eta != null);
    if (hit) {
      arrivals.push({
        routeId: tu.routeId,
        directionId: tu.directionId,
        route: routesById[tu.routeId],
        eta: hit.eta,
        delay: hit.delay,
      });
    }
  }
  return arrivals.sort((a, b) => a.eta - b.eta);
}

/** Fetch active service alerts. Returns lightweight summaries. */
export async function fetchServiceAlerts() {
  const feed = await fetchFeedMessage('alerts');
  if (!feed || !feed.entity) return [];
  return feed.entity
    .map((e) => {
      const a = e.alert;
      if (!a) return null;
      const header = a.headerText?.translation?.[0]?.text || '';
      const body = a.descriptionText?.translation?.[0]?.text || '';
      const routeIds = (a.informedEntity || [])
        .map((ie) => ie.routeId)
        .filter(Boolean);
      return { id: e.id, header, body, routeIds };
    })
    .filter(Boolean);
}

/**
 * Quick health check on the vehicles feed.
 * Returns 'green' | 'yellow' | 'red'.
 */
export async function checkApiHealth() {
  const start = Date.now();
  const feed = await fetchFeedMessage('vehicles');
  const elapsed = Date.now() - start;
  if (!feed || !feed.entity || feed.entity.length === 0) return 'red';
  return elapsed < 3000 ? 'green' : 'yellow';
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
