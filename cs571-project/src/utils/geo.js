/** Haversine distance in kilometers between two {lat, lng} points. */
export function haversineKm(a, b) {
  const R = 6371;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.asin(Math.sqrt(x));
}

/**
 * Pick the closest vehicle in each direction relative to a location.
 * Buses with no directionId are grouped under "unknown" so a route with
 * no direction metadata still surfaces one nearest bus.
 */
export function closestPerDirection(vehicles, userLoc) {
  if (!userLoc || !vehicles?.length) return [];
  const best = new Map();
  for (const v of vehicles) {
    if (!Number.isFinite(v.lat) || !Number.isFinite(v.lng)) continue;
    const dir = v.directionId != null ? v.directionId : 'unknown';
    const dist = haversineKm(userLoc, v);
    const cur = best.get(dir);
    if (!cur || dist < cur.dist) best.set(dir, { vehicle: v, dist });
  }
  return Array.from(best.values()).map((b) => ({
    ...b.vehicle,
    distanceKm: b.dist,
  }));
}
