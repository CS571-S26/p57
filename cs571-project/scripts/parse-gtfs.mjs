/**
 * Parse Madison Metro GTFS data into baked JSON assets.
 *
 * Usage: node scripts/parse-gtfs.mjs /path/to/gtfs/data
 *
 * Outputs:
 *   src/assets/routes.json  — route metadata
 *   src/assets/stops.json   — all stops with lat/lng and serving routes
 *   src/assets/shapes.json  — polyline coords + ordered stops per route
 */

import { readFileSync, writeFileSync } from 'fs';
import { join, resolve } from 'path';

const gtfsDir = process.argv[2] || '/tmp/gtfs/data';
const outDir = resolve(import.meta.dirname, '..', 'src', 'assets');

function parseCsv(filename) {
  const raw = readFileSync(join(gtfsDir, filename), 'utf-8');
  const lines = raw.replace(/\r/g, '').split('\n').filter(Boolean);
  const headers = lines[0].split(',');
  return lines.slice(1).map((line) => {
    const vals = line.split(',');
    const obj = {};
    headers.forEach((h, i) => (obj[h.trim()] = (vals[i] || '').trim()));
    return obj;
  });
}

// --- 1. Routes ---
console.log('Parsing routes.txt...');
const routesRaw = parseCsv('routes.txt');
const routes = routesRaw.map((r) => ({
  id: r.route_id,
  shortName: r.route_short_name,
  longName: r.route_long_name,
  color: '#' + (r.route_color || '888888'),
  textColor: '#' + (r.route_text_color || 'FFFFFF'),
}));
console.log(`  ${routes.length} routes`);

// --- 2. Trips: map route_id → shape_ids, collect trip→route mapping,
//        and collect direction_id → headsign for each route ---
console.log('Parsing trips.txt...');
const tripsRaw = parseCsv('trips.txt');

/**
 * "INGERSOLL VIA SHERMAN" → "Ingersoll via Sherman".
 * Only acts on inputs that look all-caps; leaves already-mixed-case
 * strings alone so we don't mangle stop names like "Observatory at N Charter".
 * Dotted abbreviations ("U.W.") stay uppercase.
 */
function titleCase(s) {
  if (!s) return '';
  const isAllCaps = s === s.toUpperCase() && /[A-Z]/.test(s);
  if (!isAllCaps) return s;
  const small = new Set(['via', 'and', 'the', 'of', 'on', 'to', 'at']);
  return s
    .toLowerCase()
    .split(/\s+/)
    .map((w, i) => {
      if (w.includes('.')) {
        return w.split('.').map((p) => p.toUpperCase()).join('.');
      }
      if (i > 0 && small.has(w)) return w;
      return w.charAt(0).toUpperCase() + w.slice(1);
    })
    .join(' ');
}

// For each route, pick one representative shape (the longest one)
const routeShapes = {}; // route_id → Set of shape_ids
const tripRoute = {};   // trip_id → route_id
const tripDirection = {}; // trip_id → direction_id ("0"/"1")
// route_id → directionId → { headsign → count, directionName → count }
const routeDirections = {};

tripsRaw.forEach((t) => {
  if (!routeShapes[t.route_id]) routeShapes[t.route_id] = new Set();
  routeShapes[t.route_id].add(t.shape_id);
  tripRoute[t.trip_id] = t.route_id;
  tripDirection[t.trip_id] = t.direction_id;

  if (!routeDirections[t.route_id]) routeDirections[t.route_id] = {};
  if (!routeDirections[t.route_id][t.direction_id]) {
    routeDirections[t.route_id][t.direction_id] = {
      headsigns: {},
      directionNames: {},
    };
  }
  const bucket = routeDirections[t.route_id][t.direction_id];
  if (t.trip_headsign) {
    bucket.headsigns[t.trip_headsign] = (bucket.headsigns[t.trip_headsign] || 0) + 1;
  }
  if (t.trip_direction_name) {
    bucket.directionNames[t.trip_direction_name] =
      (bucket.directionNames[t.trip_direction_name] || 0) + 1;
  }
});

/** Pick the most-frequently-used headsign for each route × direction. */
function topKey(counts) {
  let bestKey = null;
  let bestCount = 0;
  for (const [k, c] of Object.entries(counts)) {
    if (c > bestCount) {
      bestKey = k;
      bestCount = c;
    }
  }
  return bestKey;
}

// Attach `directions: [{ id: 0, headsign, directionName }]` to each route
routes.forEach((r) => {
  const dirs = routeDirections[r.id];
  if (!dirs) {
    r.directions = [];
    return;
  }
  r.directions = Object.entries(dirs)
    .map(([dirId, b]) => ({
      id: Number(dirId),
      headsign: titleCase(topKey(b.headsigns) || ''),
      directionName: titleCase(topKey(b.directionNames) || ''),
    }))
    .sort((a, b) => a.id - b.id);
});

// Map each shape_id to the most-common direction_id of trips that use it.
// We need this so the trip planner can know which compass direction the
// baked shape represents (and therefore which direction_id to attach to
// a board → alight pair when querying live ETAs).
const shapeDirectionCounts = {}; // shape_id → { 0: n, 1: m }
tripsRaw.forEach((t) => {
  if (!t.shape_id || t.direction_id == null || t.direction_id === '') return;
  if (!shapeDirectionCounts[t.shape_id]) shapeDirectionCounts[t.shape_id] = {};
  const d = t.direction_id;
  shapeDirectionCounts[t.shape_id][d] = (shapeDirectionCounts[t.shape_id][d] || 0) + 1;
});
const shapeDirectionId = {}; // shape_id → 0 | 1
for (const [sid, counts] of Object.entries(shapeDirectionCounts)) {
  let best = null;
  let bestCount = 0;
  for (const [d, c] of Object.entries(counts)) {
    if (c > bestCount) {
      best = Number(d);
      bestCount = c;
    }
  }
  shapeDirectionId[sid] = best;
}

// --- 3. Shapes: parse all shape points ---
console.log('Parsing shapes.txt (this may take a moment)...');
const shapesRaw = parseCsv('shapes.txt');

// Group by shape_id, sort by sequence
const shapePoints = {}; // shape_id → [[lat, lng], ...]
shapesRaw.forEach((s) => {
  if (!shapePoints[s.shape_id]) shapePoints[s.shape_id] = [];
  shapePoints[s.shape_id].push({
    lat: parseFloat(s.shape_pt_lat),
    lng: parseFloat(s.shape_pt_lon),
    seq: parseInt(s.shape_pt_sequence, 10),
  });
});
// Sort each shape by sequence
Object.values(shapePoints).forEach((pts) => pts.sort((a, b) => a.seq - b.seq));

// For each route, pick the shape with the most points (most complete)
const routeBestShape = {};
routes.forEach((r) => {
  const sids = routeShapes[r.id];
  if (!sids) return;
  let best = null;
  let bestLen = 0;
  for (const sid of sids) {
    const pts = shapePoints[sid];
    if (pts && pts.length > bestLen) {
      best = sid;
      bestLen = pts.length;
    }
  }
  routeBestShape[r.id] = best;
});

// --- 4. Stop_times: find which stops each route serves and their order ---
console.log('Parsing stop_times.txt (large file)...');
const stopTimesRaw = parseCsv('stop_times.txt');

// For each route, find a representative trip (the one with the most stops)
const tripStops = {}; // trip_id → [{stop_id, seq}]
stopTimesRaw.forEach((st) => {
  if (!tripStops[st.trip_id]) tripStops[st.trip_id] = [];
  tripStops[st.trip_id].push({
    stopId: st.stop_id,
    seq: parseInt(st.stop_sequence, 10),
  });
});

// For each route, pick the trip with the most stops
const routeBestTrip = {};
Object.entries(tripStops).forEach(([tripId, stops]) => {
  const routeId = tripRoute[tripId];
  if (!routeId) return;
  if (!routeBestTrip[routeId] || stops.length > routeBestTrip[routeId].length) {
    routeBestTrip[routeId] = stops;
  }
});

// Sort each route's stops by sequence
Object.values(routeBestTrip).forEach((stops) => stops.sort((a, b) => a.seq - b.seq));

// Collect all stop IDs that serve each route
const routeStopIds = {}; // route_id → Set of stop_ids
Object.entries(tripStops).forEach(([tripId, stops]) => {
  const routeId = tripRoute[tripId];
  if (!routeId) return;
  if (!routeStopIds[routeId]) routeStopIds[routeId] = new Set();
  stops.forEach((s) => routeStopIds[routeId].add(s.stopId));
});

// --- 5. Stops: parse all stops ---
console.log('Parsing stops.txt...');
const stopsRaw = parseCsv('stops.txt');

// Build stop lookup
const stopMap = {};
stopsRaw.forEach((s) => {
  stopMap[s.stop_id] = {
    id: s.stop_id,
    name: s.stop_name,
    lat: parseFloat(s.stop_lat),
    lng: parseFloat(s.stop_lon),
  };
});

// Determine which routes serve each stop
const stopRoutes = {}; // stop_id → Set of route_ids
Object.entries(routeStopIds).forEach(([routeId, stopIds]) => {
  for (const sid of stopIds) {
    if (!stopRoutes[sid]) stopRoutes[sid] = new Set();
    stopRoutes[sid].add(routeId);
  }
});

// Per-stop direction map: { [stopId]: { [routeId]: [dirIds] } }
// Built by walking trip_stops and pairing each stop with its trip's direction.
const stopRoutesByDirection = {};
Object.entries(tripStops).forEach(([tripId, stops]) => {
  const routeId = tripRoute[tripId];
  const dirRaw = tripDirection[tripId];
  if (!routeId || dirRaw == null || dirRaw === '') return;
  const dirId = Number(dirRaw);
  for (const s of stops) {
    if (!stopRoutesByDirection[s.stopId]) stopRoutesByDirection[s.stopId] = {};
    if (!stopRoutesByDirection[s.stopId][routeId]) {
      stopRoutesByDirection[s.stopId][routeId] = new Set();
    }
    stopRoutesByDirection[s.stopId][routeId].add(dirId);
  }
});

// Build final stops array (only stops that have routes)
const LANDMARK_NAMES = [
  'Capitol', 'Memorial Union', 'Union South', 'Hospital', 'Hilldale',
  'Kohl Center', 'Camp Randall', 'East Towne', 'West Towne',
  'Transfer Point', 'Monona Terrace', 'Library Mall', 'State St',
];

const stops = Object.values(stopMap)
  .filter((s) => stopRoutes[s.id])
  .map((s) => {
    const dirs = stopRoutesByDirection[s.id] || {};
    const routesByDirection = {};
    for (const [rid, dirSet] of Object.entries(dirs)) {
      routesByDirection[rid] = [...dirSet].sort((a, b) => a - b);
    }
    return {
      id: s.id,
      name: titleCase(s.name),
      lat: s.lat,
      lng: s.lng,
      routes: [...(stopRoutes[s.id] || [])],
      routesByDirection,
      landmark: LANDMARK_NAMES.some((n) =>
        s.name.toLowerCase().includes(n.toLowerCase()),
      ),
    };
  });
console.log(`  ${stops.length} stops with routes`);

// --- 6. Build shapes.json ---
console.log('Building shapes.json...');
const shapes = {};
routes.forEach((r) => {
  const shapeId = routeBestShape[r.id];
  const pts = shapeId ? shapePoints[shapeId] : null;
  const tripStopList = routeBestTrip[r.id];

  if (!pts) return;

  // Simplify: keep every Nth point to reduce file size (target ~200 pts per route)
  const step = Math.max(1, Math.floor(pts.length / 200));
  const simplified = [];
  for (let i = 0; i < pts.length; i += step) {
    simplified.push([
      Math.round(pts[i].lat * 1000000) / 1000000,
      Math.round(pts[i].lng * 1000000) / 1000000,
    ]);
  }
  // Always include the last point
  const last = pts[pts.length - 1];
  const lastCoord = [
    Math.round(last.lat * 1000000) / 1000000,
    Math.round(last.lng * 1000000) / 1000000,
  ];
  if (
    simplified.length === 0 ||
    simplified[simplified.length - 1][0] !== lastCoord[0] ||
    simplified[simplified.length - 1][1] !== lastCoord[1]
  ) {
    simplified.push(lastCoord);
  }

  shapes[r.id] = {
    color: r.color,
    coords: simplified,
    stops: tripStopList ? tripStopList.map((s) => s.stopId) : [],
    // Which direction (0/1) does this shape's stop sequence run in?
    // Used by the trip planner to decide which direction_id to query
    // for live ETAs given a board → alight pair.
    shapeDirectionId: shapeDirectionId[shapeId] ?? null,
  };
});
console.log(`  ${Object.keys(shapes).length} route shapes`);

// --- 7. Build schedule.json ---
//
// For each (route_id, direction_id, day_type, stop_id), bake the sorted list
// of departure times (seconds since midnight). Powers the "next bus on
// Saturday" / "last bus tonight" features without a live feed.
//
// Day types are coarse buckets — weekday/saturday/sunday — derived from
// calendar.txt by checking which day-of-week columns each service_id covers.
// A service that runs Mon–Fri lands in `weekday`; one that runs only Saturday
// in `saturday`; if a service spans buckets we add it to each.
console.log('Parsing calendar.txt and building schedule.json...');
const calendarRaw = parseCsv('calendar.txt');
const serviceDayTypes = {}; // service_id → ['weekday'|'saturday'|'sunday']
calendarRaw.forEach((c) => {
  const dayTypes = new Set();
  if (
    c.monday === '1' ||
    c.tuesday === '1' ||
    c.wednesday === '1' ||
    c.thursday === '1' ||
    c.friday === '1'
  ) {
    dayTypes.add('weekday');
  }
  if (c.saturday === '1') dayTypes.add('saturday');
  if (c.sunday === '1') dayTypes.add('sunday');
  serviceDayTypes[c.service_id] = [...dayTypes];
});

// trip_id → service_id (parsed when we walked trips.txt earlier)
const tripService = {};
tripsRaw.forEach((t) => {
  tripService[t.trip_id] = t.service_id;
});

/** "08:30:45" → 30645 seconds. */
function hmsToSec(s) {
  if (!s) return null;
  const parts = s.split(':');
  if (parts.length !== 3) return null;
  return Number(parts[0]) * 3600 + Number(parts[1]) * 60 + Number(parts[2]);
}

const schedule = {}; // routeId → directionId → dayType → stopId → [sec...]

for (const st of stopTimesRaw) {
  const tripId = st.trip_id;
  const routeId = tripRoute[tripId];
  if (!routeId) continue;
  const dirRaw = tripDirection[tripId];
  const directionId = dirRaw == null || dirRaw === '' ? 0 : Number(dirRaw);
  const serviceId = tripService[tripId];
  const dayTypes = serviceDayTypes[serviceId];
  if (!dayTypes || dayTypes.length === 0) continue;
  const sec = hmsToSec(st.departure_time || st.arrival_time);
  if (sec == null) continue;
  for (const dt of dayTypes) {
    if (!schedule[routeId]) schedule[routeId] = {};
    if (!schedule[routeId][directionId]) schedule[routeId][directionId] = {};
    if (!schedule[routeId][directionId][dt]) schedule[routeId][directionId][dt] = {};
    if (!schedule[routeId][directionId][dt][st.stop_id]) {
      schedule[routeId][directionId][dt][st.stop_id] = [];
    }
    schedule[routeId][directionId][dt][st.stop_id].push(sec);
  }
}

// Sort + dedupe each list
let totalEntries = 0;
for (const dirs of Object.values(schedule)) {
  for (const dts of Object.values(dirs)) {
    for (const stops of Object.values(dts)) {
      for (const stopId of Object.keys(stops)) {
        const sorted = [...new Set(stops[stopId])].sort((a, b) => a - b);
        stops[stopId] = sorted;
        totalEntries += sorted.length;
      }
    }
  }
}
console.log(`  ${totalEntries} departure entries`);

// --- Write output ---
writeFileSync(join(outDir, 'routes.json'), JSON.stringify(routes, null, 2));
console.log(`Wrote routes.json (${routes.length} routes)`);

writeFileSync(join(outDir, 'stops.json'), JSON.stringify(stops, null, 2));
console.log(`Wrote stops.json (${stops.length} stops)`);

writeFileSync(join(outDir, 'shapes.json'), JSON.stringify(shapes, null, 2));
console.log(`Wrote shapes.json (${Object.keys(shapes).length} shapes)`);

// schedule.json gets no indentation — it's purely lookup data and indenting
// would balloon the gzip size by ~40%.
writeFileSync(join(outDir, 'schedule.json'), JSON.stringify(schedule));
console.log(`Wrote schedule.json (${Object.keys(schedule).length} routes)`);

console.log('\nDone! All assets updated with real Madison Metro GTFS data.');
