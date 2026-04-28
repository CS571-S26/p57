import { useEffect, useMemo, useState } from 'react';
import {
  fetchTripUpdates,
  getNearbyStops,
  getDirectionShort,
} from '../services/metroTransitApi';

const REFRESH_INTERVAL = 15_000;

function formatDistance(km) {
  const meters = km * 1000;
  if (meters < 100) return `${Math.round(meters / 10) * 10} m away`;
  if (meters < 1000) return `${Math.round(meters / 50) * 50} m away`;
  return `${km.toFixed(1)} km away`;
}

/**
 * "What's coming at the stops near me, right now?"
 *
 * Lists the closest stops to the user (default ¼ mile, top 5) and the
 * next 1–3 live arrivals at each. Refreshes the GTFS-RT TripUpdates
 * feed on a 15s interval. Tapping a stop selects it on the map.
 */
function NearbyStops({
  userLocation,
  onSelectStop,
  onRequestLocation,
  locationStatus,
  maxKm = 0.4,
  stopLimit = 5,
  arrivalsPerStop = 3,
}) {
  const [trips, setTrips] = useState({});
  const [loaded, setLoaded] = useState(false);

  const stops = useMemo(
    () => (userLocation ? getNearbyStops(userLocation, maxKm, stopLimit) : []),
    [userLocation, maxKm, stopLimit],
  );

  useEffect(() => {
    if (!userLocation) return;
    let cancelled = false;
    async function refresh() {
      const data = await fetchTripUpdates();
      if (!cancelled) {
        setTrips(data);
        setLoaded(true);
      }
    }
    refresh();
    const id = setInterval(refresh, REFRESH_INTERVAL);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [userLocation]);

  const arrivalsByStop = useMemo(() => {
    const map = new Map();
    Object.values(trips).forEach((tu) => {
      tu.stopUpdates.forEach((s) => {
        if (s.eta == null || s.eta < 0) return;
        if (!map.has(s.stopId)) map.set(s.stopId, []);
        map.get(s.stopId).push({
          routeId: tu.routeId,
          directionId: tu.directionId,
          eta: s.eta,
        });
      });
    });
    map.forEach((list) => list.sort((a, b) => a.eta - b.eta));
    return map;
  }, [trips]);

  // No location: show CTA
  if (!userLocation) {
    const denied = locationStatus === 'denied' || locationStatus === 'unavailable';
    return (
      <section
        aria-labelledby="nearby-heading"
        className="rounded-xl bg-white dark:bg-gray-800 ring-1 ring-gray-200 dark:ring-gray-700 shadow-lg p-3"
      >
        <h2
          id="nearby-heading"
          className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1"
        >
          Nearby stops
        </h2>
        <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
          {denied
            ? 'Location is blocked — enable it in your browser settings to see what’s near you.'
            : 'Share your location to see the closest stops and next arrivals.'}
        </p>
        {!denied && (
          <button
            type="button"
            onClick={onRequestLocation}
            className="w-full px-3 py-1.5 text-sm font-semibold rounded-lg bg-madison-red text-white hover:bg-madison-dark transition-colors"
          >
            Use my location
          </button>
        )}
      </section>
    );
  }

  if (stops.length === 0) {
    return (
      <section
        aria-labelledby="nearby-heading"
        className="rounded-xl bg-white dark:bg-gray-800 ring-1 ring-gray-200 dark:ring-gray-700 shadow-lg p-3"
      >
        <h2
          id="nearby-heading"
          className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1"
        >
          Nearby stops
        </h2>
        <p className="text-sm text-gray-700 dark:text-gray-300">
          No bus stops within {Math.round(maxKm * 1000)} m. Try moving the map or pick a route from the list.
        </p>
      </section>
    );
  }

  return (
    <section
      aria-labelledby="nearby-heading"
      className="rounded-xl bg-white dark:bg-gray-800 ring-1 ring-gray-200 dark:ring-gray-700 shadow-lg overflow-hidden"
    >
      <div className="flex items-baseline justify-between px-3 py-2 border-b border-gray-100 dark:border-gray-700">
        <h2
          id="nearby-heading"
          className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider"
        >
          Nearby stops
        </h2>
        {!loaded && (
          <span className="text-[10px] text-gray-500 dark:text-gray-400">
            Loading arrivals…
          </span>
        )}
      </div>
      <ul className="divide-y divide-gray-100 dark:divide-gray-700 list-none p-0 max-h-72 overflow-y-auto">
        {stops.map((stop) => {
          const arrivals = (arrivalsByStop.get(stop.id) || []).slice(0, arrivalsPerStop);
          return (
            <li key={stop.id}>
              <button
                type="button"
                onClick={() => onSelectStop(stop)}
                className="w-full text-left px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
              >
                <div className="flex items-baseline justify-between gap-2">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                    {stop.name}
                  </p>
                  <span className="flex-shrink-0 text-[10px] text-gray-600 dark:text-gray-400">
                    {formatDistance(stop.distanceKm)}
                  </span>
                </div>
                {arrivals.length > 0 ? (
                  <ul className="mt-1 space-y-0.5 list-none p-0">
                    {arrivals.map((a, i) => {
                      const headsign = getDirectionShort(a.routeId, a.directionId);
                      return (
                        <li
                          key={`${a.routeId}|${a.directionId ?? ''}|${i}`}
                          className="flex items-center gap-2 text-xs"
                        >
                          <span className="flex-shrink-0 inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-madison-red text-white">
                            {a.routeId}
                          </span>
                          <span className="flex-1 text-gray-700 dark:text-gray-300 truncate">
                            {headsign ? `Toward ${headsign}` : 'In service'}
                          </span>
                          <span className="flex-shrink-0 font-semibold text-madison-red dark:text-red-400">
                            {a.eta === 0 ? 'now' : `${a.eta} min`}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Routes:{' '}
                    {stop.routes.slice(0, 4).join(', ')}
                    {stop.routes.length > 4 && '…'}
                  </p>
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export default NearbyStops;
