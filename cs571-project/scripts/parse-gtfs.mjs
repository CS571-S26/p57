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

// --- 2. Trips: map route_id → shape_ids, and collect trip→route mapping ---
console.log('Parsing trips.txt...');
const tripsRaw = parseCsv('trips.txt');

// For each route, pick one representative shape (the longest one)
const routeShapes = {}; // route_id → Set of shape_ids
const tripRoute = {};   // trip_id → route_id
tripsRaw.forEach((t) => {
  if (!routeShapes[t.route_id]) routeShapes[t.route_id] = new Set();
  routeShapes[t.route_id].add(t.shape_id);
  tripRoute[t.trip_id] = t.route_id;
});

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

// Build final stops array (only stops that have routes)
const LANDMARK_NAMES = [
  'Capitol', 'Memorial Union', 'Union South', 'Hospital', 'Hilldale',
  'Kohl Center', 'Camp Randall', 'East Towne', 'West Towne',
  'Transfer Point', 'Monona Terrace', 'Library Mall', 'State St',
];

const stops = Object.values(stopMap)
  .filter((s) => stopRoutes[s.id])
  .map((s) => ({
    id: s.id,
    name: s.name,
    lat: s.lat,
    lng: s.lng,
    routes: [...(stopRoutes[s.id] || [])],
    landmark: LANDMARK_NAMES.some((n) => s.name.toLowerCase().includes(n.toLowerCase())),
  }));
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
  };
});
console.log(`  ${Object.keys(shapes).length} route shapes`);

// --- Write output ---
writeFileSync(join(outDir, 'routes.json'), JSON.stringify(routes, null, 2));
console.log(`Wrote routes.json (${routes.length} routes)`);

writeFileSync(join(outDir, 'stops.json'), JSON.stringify(stops, null, 2));
console.log(`Wrote stops.json (${stops.length} stops)`);

writeFileSync(join(outDir, 'shapes.json'), JSON.stringify(shapes, null, 2));
console.log(`Wrote shapes.json (${Object.keys(shapes).length} shapes)`);

console.log('\nDone! All assets updated with real Madison Metro GTFS data.');
