import shapesData from '../assets/shapes.json';
import stopsData from '../assets/stops.json';
import routesData from '../assets/routes.json';
import { fetchTripUpdates } from './metroTransitApi';
import { haversineKm } from '../utils/geo';

// ---------------------------------------------------------------------------
// Tunables
// ---------------------------------------------------------------------------
const WALK_SPEED_KMH = 4.5;          // ~2.8 mph leisurely walk
const BUS_SPEED_KMH = 22;            // honest city-bus avg incl. stops
const WALK_DETOUR_FACTOR = 1.3;      // crow-flies → road distance
const MAX_WALK_KM = 0.6;             // ~⅜ mile, the typical "willing to walk" radius
const DEFAULT_WAIT_MIN = 12;         // when live ETAs aren't available
const TOP_N = 3;                     // how many candidate plans to surface

// ---------------------------------------------------------------------------
// Lookups (built once)
// ---------------------------------------------------------------------------
const stopById = Object.fromEntries(stopsData.map((s) => [s.id, s]));
const routeById = Object.fromEntries(routesData.map((r) => [r.id, r]));

// Madison Metro is hub-and-spoke. When no direct route exists between two
// stops, we suggest planning via one of the four transfer points. Pre-filter
// at module load so the suggestion search is just a sort.
const TRANSFER_POINTS = stopsData.filter((s) => /transfer\s*point/i.test(s.name));

function walkMinutes(p1, p2) {
  const km = haversineKm(p1, p2) * WALK_DETOUR_FACTOR;
  return (km / WALK_SPEED_KMH) * 60;
}

/**
 * Distance along a route's shape between two stops in the shape's stop order.
 * Reuses the proportional stop-index → coord-index mapping that RouteOverlay
 * already relies on.
 */
function rideKmBetween(shape, fromIdx, toIdx) {
  const coords = shape.coords;
  const totalCoords = coords.length;
  const totalStops = shape.stops.length;
  if (totalCoords < 2 || totalStops < 2) return 0;
  const startCoord = Math.round((fromIdx / (totalStops - 1)) * (totalCoords - 1));
  const endCoord = Math.round((toIdx / (totalStops - 1)) * (totalCoords - 1));
  let km = 0;
  for (let i = startCoord; i < endCoord; i++) {
    km += haversineKm(
      { lat: coords[i][0], lng: coords[i][1] },
      { lat: coords[i + 1][0], lng: coords[i + 1][1] },
    );
  }
  return km;
}

/** Live ETA at boardStop for a given route × direction, in minutes. */
function findLiveEta(tripUpdates, routeId, directionId, stopId) {
  for (const tu of Object.values(tripUpdates)) {
    if (tu.routeId !== routeId) continue;
    // Accept the update if the directionId matches, or if the feed didn't
    // populate a directionId (some trips do that — better a slightly fuzzy
    // ETA than none).
    if (tu.directionId != null && tu.directionId !== directionId) continue;
    const hit = tu.stopUpdates.find(
      (s) => s.stopId === stopId && s.eta != null && s.eta >= 0,
    );
    if (hit) return hit.eta;
  }
  return null;
}

/**
 * Within walk distance of `loc`, intersected with `routeStopIds`.
 * Returns an array sorted by distance, capped at the closest few candidates
 * so the inner loop stays small.
 */
function walkableRouteStops(loc, routeStopIds, capN = 3) {
  const out = [];
  for (const id of routeStopIds) {
    const stop = stopById[id];
    if (!stop) continue;
    const dist = haversineKm(loc, stop);
    if (dist <= MAX_WALK_KM) out.push({ stop, dist });
  }
  out.sort((a, b) => a.dist - b.dist);
  return out.slice(0, capN);
}

/**
 * Pick the transfer-point hubs that look most promising for a given trip,
 * ranked by total origin → hub → destination crow-flies distance.
 * Returns up to 3 candidates.
 */
function suggestHubs(origin, destination) {
  if (TRANSFER_POINTS.length === 0) return [];
  return TRANSFER_POINTS.map((hub) => {
    const distFromOrigin = haversineKm(origin, hub);
    const distFromDest = haversineKm(destination, hub);
    return {
      stop: hub,
      distFromOriginKm: distFromOrigin,
      distFromDestinationKm: distFromDest,
      // Lower = better placement between origin and destination
      detourKm: distFromOrigin + distFromDest,
    };
  })
    .sort((a, b) => a.detourKm - b.detourKm)
    .slice(0, 3);
}

/**
 * Plan a single-leg trip from `origin` to `destination`.
 *
 * Returns `{ plans, noDirectRoute, hubSuggestions }`:
 *  - plans: up to TOP_N candidate plans, sorted by total time
 *  - noDirectRoute: true if `plans` is empty
 *  - hubSuggestions: when no direct route, transfer points ranked by detour
 *    distance so callers can offer "plan via {hub}" follow-ups
 *
 * @param origin       { lat, lng }
 * @param destination  { lat, lng, name?, id? }
 */
export async function planTrip({ origin, destination }) {
  if (
    !origin ||
    !destination ||
    !Number.isFinite(origin.lat) ||
    !Number.isFinite(destination.lat)
  ) {
    return { plans: [], noDirectRoute: false, hubSuggestions: [] };
  }

  // Fetch live ETAs once and reuse across all candidates.
  const tripUpdates = await fetchTripUpdates();

  const candidates = [];

  for (const route of routesData) {
    const shape = shapesData[route.id];
    if (!shape || !shape.stops || shape.stops.length < 2) continue;
    if (!route.directions || route.directions.length === 0) continue;

    // Eligible board/alight stops on this route within walking distance.
    const boards = walkableRouteStops(origin, shape.stops);
    const alights = walkableRouteStops(destination, shape.stops);
    if (boards.length === 0 || alights.length === 0) continue;

    // Try both compass directions: shape's natural order, and reverse.
    // The shape was baked in `shape.shapeDirectionId`; the other direction
    // is whichever route direction != that.
    const naturalDirId = shape.shapeDirectionId;
    const otherDirId =
      route.directions.find((d) => d.id !== naturalDirId)?.id ??
      (naturalDirId === 0 ? 1 : 0);

    for (const dirId of [naturalDirId, otherDirId]) {
      if (dirId == null) continue;
      const directionMeta = route.directions.find((d) => d.id === dirId);
      if (!directionMeta) continue;

      const orderedStops =
        dirId === naturalDirId ? shape.stops : [...shape.stops].reverse();

      let bestPlan = null;
      for (const b of boards) {
        const bIdx = orderedStops.indexOf(b.stop.id);
        if (bIdx === -1) continue;
        for (const a of alights) {
          if (a.stop.id === b.stop.id) continue;
          const aIdx = orderedStops.indexOf(a.stop.id);
          // alight must be downstream of board in this direction
          if (aIdx === -1 || aIdx <= bIdx) continue;

          // Map back to the shape's natural-order indices for distance calc
          const naturalFromIdx =
            dirId === naturalDirId ? bIdx : shape.stops.length - 1 - bIdx;
          const naturalToIdx =
            dirId === naturalDirId ? aIdx : shape.stops.length - 1 - aIdx;
          const rideKm = rideKmBetween(
            shape,
            Math.min(naturalFromIdx, naturalToIdx),
            Math.max(naturalFromIdx, naturalToIdx),
          );
          const rideMin = (rideKm / BUS_SPEED_KMH) * 60;

          const walkStartMin = walkMinutes(origin, b.stop);
          const walkEndMin = walkMinutes(a.stop, destination);

          const liveEta = findLiveEta(tripUpdates, route.id, dirId, b.stop.id);
          const waitMin = liveEta != null ? liveEta : DEFAULT_WAIT_MIN;

          const totalMin = walkStartMin + waitMin + rideMin + walkEndMin;

          if (!bestPlan || totalMin < bestPlan.totalMin) {
            bestPlan = {
              route,
              direction: directionMeta,
              boardStop: b.stop,
              alightStop: a.stop,
              boardWalkKm: b.dist,
              alightWalkKm: a.dist,
              walkStartMin,
              waitMin,
              rideMin,
              walkEndMin,
              totalMin,
              hasLiveEta: liveEta != null,
              numStops: aIdx - bIdx,
            };
          }
        }
      }

      if (bestPlan) candidates.push(bestPlan);
    }
  }

  candidates.sort((a, b) => a.totalMin - b.totalMin);
  const plans = candidates.slice(0, TOP_N);
  const noDirectRoute = plans.length === 0;
  // Only spend cycles on hub suggestions when we actually need them.
  // Skip suggestions whose hub is the origin/destination itself (e.g. user
  // is asking "how do I get from NTP to STP?" — different problem).
  const hubSuggestions = noDirectRoute
    ? suggestHubs(origin, destination).filter(
        (h) =>
          (!destination.id || h.stop.id !== destination.id) &&
          (!origin.id || h.stop.id !== origin.id),
      )
    : [];

  return { plans, noDirectRoute, hubSuggestions };
}

/**
 * "It's a 5-minute walk; no bus needed."
 * Use this to short-circuit the planner when the destination is so close
 * that walking is faster than waiting for any bus.
 */
export function walkOnlyMinutes(origin, destination) {
  if (!origin || !destination) return null;
  return walkMinutes(origin, destination);
}

export const PLANNER_CONSTANTS = {
  MAX_WALK_KM,
  WALK_SPEED_KMH,
  BUS_SPEED_KMH,
};
