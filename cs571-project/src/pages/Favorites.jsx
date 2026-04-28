import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFavorites } from '../context/FavoritesContext';
import { useDestination } from '../context/DestinationContext';
import {
  fetchTripUpdates,
  searchStops,
  getDirectionShort,
  getNextScheduled,
  formatTimeOfDay,
} from '../services/metroTransitApi';

const REFRESH_INTERVAL = 20_000;

function Favorites() {
  const { favorites, removeFavorite } = useFavorites();
  const { selectStop } = useDestination();
  const navigate = useNavigate();
  const [trips, setTrips] = useState({});
  const [loadedAt, setLoadedAt] = useState(null);

  // Pull live trip updates once + on a 20s interval.
  useEffect(() => {
    if (favorites.length === 0) return;
    let cancelled = false;
    async function refresh() {
      const data = await fetchTripUpdates();
      if (!cancelled) {
        setTrips(data);
        setLoadedAt(Date.now());
      }
    }
    refresh();
    const id = setInterval(refresh, REFRESH_INTERVAL);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [favorites.length]);

  // Project live ETAs onto each saved stop. For stops with no live data,
  // fall back to the next *scheduled* departure across any route×direction
  // serving that stop, so the row still gives a useful answer.
  const stopsWithArrivals = useMemo(() => {
    const arrivalsByStop = new Map();
    Object.values(trips).forEach((tu) => {
      tu.stopUpdates.forEach((s) => {
        if (s.eta == null || s.eta < 0) return;
        if (!arrivalsByStop.has(s.stopId)) arrivalsByStop.set(s.stopId, []);
        arrivalsByStop.get(s.stopId).push({
          routeId: tu.routeId,
          directionId: tu.directionId,
          eta: s.eta,
          live: true,
        });
      });
    });
    arrivalsByStop.forEach((list) => list.sort((a, b) => a.eta - b.eta));

    return favorites
      .map((fav) => {
        const live = arrivalsByStop.get(fav.id) || [];
        // Schedule fallback: pick the next scheduled departure across any
        // (route, direction) the stop is served by — purely a hint, not a
        // promise. Only used when no live ETA exists.
        let nextScheduled = null;
        if (live.length === 0) {
          for (const routeId of fav.routes || []) {
            for (const dirId of [0, 1]) {
              const sec = getNextScheduled(fav.id, routeId, dirId);
              if (sec != null && (!nextScheduled || sec < nextScheduled.sec)) {
                nextScheduled = { sec, routeId, directionId: dirId };
              }
            }
          }
        }
        // Sort key: live ETA in min, or scheduled-as-min-from-now,
        // or ∞ for "no info"
        const sortKey =
          live[0]?.eta != null
            ? live[0].eta
            : nextScheduled
              ? Math.max(
                  0,
                  Math.round(
                    (nextScheduled.sec - secondsSinceMidnight()) / 60,
                  ),
                )
              : Number.POSITIVE_INFINITY;
        return { fav, live: live.slice(0, 3), nextScheduled, sortKey };
      })
      .sort((a, b) => a.sortKey - b.sortKey);
  }, [favorites, trips]);

  const handleGoToStop = (fav) => {
    const stop = searchStops(fav.name, 1)[0];
    if (stop) {
      selectStop(stop);
      navigate(`/?stop=${encodeURIComponent(stop.id)}`);
    } else {
      navigate('/');
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2 mb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
            Saved Stops
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Live ETAs at every stop you've pinned, sorted by next bus.
          </p>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400" aria-live="polite">
          {favorites.length === 0
            ? ''
            : loadedAt
              ? `Updated ${new Date(loadedAt).toLocaleTimeString()}`
              : 'Loading…'}
        </p>
      </div>

      {favorites.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-5xl mb-4">
            <svg
              className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
              />
            </svg>
          </div>
          <p className="text-gray-700 dark:text-gray-300 font-medium mb-2">
            No saved stops yet
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400 max-w-xs mx-auto">
            Open the Live Map, tap a stop, and hit the star to pin it here.
          </p>
        </div>
      ) : (
        <ul className="space-y-2 list-none p-0">
          {stopsWithArrivals.map(({ fav, live, nextScheduled }) => (
            <li
              key={fav.id}
              className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden"
            >
              <div className="flex items-stretch">
                <button
                  type="button"
                  onClick={() => handleGoToStop(fav)}
                  className="flex-1 text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors min-w-0"
                >
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {fav.name}
                  </p>
                  {live.length > 0 ? (
                    <ul className="mt-1.5 space-y-0.5 list-none p-0">
                      {live.map((a, i) => {
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
                  ) : nextScheduled ? (
                    <p className="mt-1.5 text-xs text-gray-600 dark:text-gray-400">
                      <span className="font-medium">Next scheduled:</span>{' '}
                      {formatTimeOfDay(nextScheduled.sec)} on Route {nextScheduled.routeId}
                    </p>
                  ) : (
                    <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
                      No upcoming arrivals.
                    </p>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => removeFavorite(fav.id)}
                  className="flex-shrink-0 px-4 text-yellow-500 hover:bg-red-50 dark:hover:bg-red-900/30 hover:text-red-500 transition-colors border-l border-gray-100 dark:border-gray-700"
                  aria-label={`Remove ${fav.name} from saved stops`}
                  title="Remove from saved"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                  </svg>
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function secondsSinceMidnight() {
  const d = new Date();
  return d.getHours() * 3600 + d.getMinutes() * 60 + d.getSeconds();
}

export default Favorites;
