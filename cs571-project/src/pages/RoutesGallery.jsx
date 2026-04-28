import { useEffect, useState } from 'react';
import {
  getRoutes,
  getStops,
  fetchTripUpdates,
} from '../services/metroTransitApi';
import ArrivalList from '../components/ArrivalList';
import ScheduleTable from '../components/ScheduleTable';

const allRoutes = getRoutes();
const routesById = Object.fromEntries(allRoutes.map((r) => [r.id, r]));

function RoutesGallery() {
  const [filter, setFilter] = useState('');
  const [expandedRoute, setExpandedRoute] = useState(null);
  const [arrivals, setArrivals] = useState([]);
  const [loadingArrivals, setLoadingArrivals] = useState(false);
  const [view, setView] = useState('live'); // 'live' | 'schedule'

  const filtered = allRoutes.filter(
    (r) =>
      r.shortName.toLowerCase().includes(filter.toLowerCase()) ||
      r.longName.toLowerCase().includes(filter.toLowerCase()),
  );

  // When a route is expanded, fetch live arrivals from the GTFS-RT trips feed.
  useEffect(() => {
    if (!expandedRoute) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setArrivals([]);
      return;
    }
    let cancelled = false;
    setLoadingArrivals(true);
    setArrivals([]);
    fetchTripUpdates()
      .then((updates) => {
        if (cancelled) return;
        const stopsForRoute = getStops(expandedRoute);
        const stopNameById = Object.fromEntries(
          stopsForRoute.map((s) => [s.id, s.name]),
        );
        // Collect the next 5 imminent stop arrivals for this route
        const upcoming = [];
        Object.values(updates).forEach((tu) => {
          if (tu.routeId !== expandedRoute) return;
          tu.stopUpdates.forEach((s) => {
            if (s.eta != null && s.eta >= 0 && stopNameById[s.stopId]) {
              upcoming.push({
                route: routesById[expandedRoute],
                eta: s.eta,
                stopName: stopNameById[s.stopId],
              });
            }
          });
        });
        upcoming.sort((a, b) => a.eta - b.eta);
        setArrivals(upcoming.slice(0, 5));
      })
      .finally(() => {
        if (!cancelled) setLoadingArrivals(false);
      });
    return () => {
      cancelled = true;
    };
  }, [expandedRoute]);

  const handleExpand = (routeId) => {
    setExpandedRoute((prev) => (prev === routeId ? null : routeId));
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
        Routes
      </h1>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-5">
        Browse all Madison Metro routes, view stops, and see live upcoming arrivals.
      </p>

      <label htmlFor="route-search" className="sr-only">
        Search routes
      </label>
      <input
        id="route-search"
        type="text"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        placeholder="Search routes..."
        className="w-full px-4 py-2.5 text-sm rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-madison-red/40 mb-4 placeholder-gray-500 dark:placeholder-gray-400"
      />

      <ul className="space-y-2 list-none p-0">
        {filtered.map((route) => {
          const isExpanded = expandedRoute === route.id;
          const stops = isExpanded ? getStops(route.id) : [];

          return (
            <li
              key={route.id}
              className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden"
            >
              <button
                onClick={() => handleExpand(route.id)}
                className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                aria-expanded={isExpanded}
                aria-controls={`route-panel-${route.id}`}
              >
                <span
                  className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-lg text-white text-sm font-bold"
                  style={{ backgroundColor: route.color }}
                  aria-hidden="true"
                >
                  {route.shortName}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 dark:text-white text-sm">
                    Route {route.shortName}
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
                    {route.longName}
                  </p>
                </div>
                <svg
                  aria-hidden="true"
                  className={`w-5 h-5 text-gray-500 dark:text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {isExpanded && (
                <div
                  id={`route-panel-${route.id}`}
                  className="border-t border-gray-100 dark:border-gray-700 px-4 py-3 bg-gray-50 dark:bg-gray-900/30"
                >
                  {/* Live / Schedule toggle */}
                  <div role="tablist" aria-label="Arrivals view" className="flex rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden text-xs mb-3 w-fit">
                    <button
                      type="button"
                      role="tab"
                      aria-selected={view === 'live'}
                      onClick={() => setView('live')}
                      className={`px-3 py-1.5 font-semibold transition-colors ${
                        view === 'live'
                          ? 'bg-madison-red text-white'
                          : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                      }`}
                    >
                      Live (next 30 min)
                    </button>
                    <button
                      type="button"
                      role="tab"
                      aria-selected={view === 'schedule'}
                      onClick={() => setView('schedule')}
                      className={`px-3 py-1.5 font-semibold transition-colors ${
                        view === 'schedule'
                          ? 'bg-madison-red text-white'
                          : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                      }`}
                    >
                      Full schedule
                    </button>
                  </div>

                  {view === 'live' ? (
                    <>
                      <h2 className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-2">
                        Next arrivals
                      </h2>
                      {loadingArrivals ? (
                        <p className="text-sm text-gray-600 dark:text-gray-400 py-2">
                          Loading live arrivals…
                        </p>
                      ) : arrivals.length > 0 ? (
                        <ArrivalList arrivals={arrivals} />
                      ) : (
                        <p className="text-sm text-gray-600 dark:text-gray-400 py-2">
                          No live arrivals reported on this route right now. Switch to the full schedule to see today's departures.
                        </p>
                      )}
                    </>
                  ) : (
                    <ScheduleTable routeId={route.id} />
                  )}

                  <h2 className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mt-4 mb-2">
                    {stops.length} stop{stops.length !== 1 ? 's' : ''} on this route
                  </h2>
                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 list-none p-0">
                    {stops.map((stop) => (
                      <li
                        key={stop.id}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-800 dark:text-gray-200 bg-white dark:bg-gray-800"
                      >
                        <span
                          className="w-2 h-2 rounded-full bg-madison-red flex-shrink-0"
                          aria-hidden="true"
                        />
                        {stop.name}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </li>
          );
        })}

        {filtered.length === 0 && (
          <li className="text-center text-gray-600 dark:text-gray-400 py-8 text-sm list-none">
            No routes match your search.
          </li>
        )}
      </ul>
    </div>
  );
}

export default RoutesGallery;
