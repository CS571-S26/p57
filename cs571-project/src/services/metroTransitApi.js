const BASE_URL = 'https://transport.wisc.edu/transit/routes';

/**
 * Fetches all available bus routes.
 */
export async function fetchRoutes() {
  const res = await fetch(`${BASE_URL}/routes`);
  if (!res.ok) throw new Error('Failed to fetch routes');
  return res.json();
}

/**
 * Fetches live vehicle positions for a given route.
 */
export async function fetchVehicles(routeId) {
  const res = await fetch(`${BASE_URL}/vehicles?routeId=${routeId}`);
  if (!res.ok) throw new Error('Failed to fetch vehicles');
  return res.json();
}

/**
 * Fetches trip details / ETAs for a specific stop.
 */
export async function fetchStopArrivals(stopId) {
  const res = await fetch(`${BASE_URL}/stops/${stopId}/arrivals`);
  if (!res.ok) throw new Error('Failed to fetch arrivals');
  return res.json();
}

/**
 * Searches for destinations / stops matching a query string.
 */
export async function searchDestinations(query) {
  const res = await fetch(`${BASE_URL}/stops?search=${encodeURIComponent(query)}`);
  if (!res.ok) throw new Error('Failed to search destinations');
  return res.json();
}
