import { useState } from 'react';
import { getRoutes, getStops } from '../services/metroTransitApi';
import ArrivalList from '../components/ArrivalList';

const allRoutes = getRoutes();

function RoutesGallery() {
  const [filter, setFilter] = useState('');
  const [expandedRoute, setExpandedRoute] = useState(null);

  const filtered = allRoutes.filter(
    (r) =>
      r.shortName.toLowerCase().includes(filter.toLowerCase()) ||
      r.longName.toLowerCase().includes(filter.toLowerCase()),
  );

  const handleExpand = (routeId) => {
    setExpandedRoute((prev) => (prev === routeId ? null : routeId));
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
        Routes
      </h1>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
        Browse all Madison Metro routes and their stops.
      </p>

      <input
        type="text"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        placeholder="Search routes..."
        className="w-full px-4 py-2.5 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-madison-red/40 mb-4 placeholder-gray-400"
        aria-label="Search routes"
      />

      <div className="space-y-2">
        {filtered.map((route) => {
          const isExpanded = expandedRoute === route.id;
          const stops = isExpanded ? getStops(route.id) : [];

          return (
            <div
              key={route.id}
              className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden"
            >
              <button
                onClick={() => handleExpand(route.id)}
                className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
              >
                <span
                  className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-lg text-white text-sm font-bold"
                  style={{ backgroundColor: route.color }}
                >
                  {route.shortName}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 dark:text-white text-sm">
                    Route {route.shortName}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {route.longName}
                  </p>
                </div>
                <svg
                  className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {isExpanded && (
                <div className="border-t border-gray-100 dark:border-gray-700 px-4 py-3 bg-gray-50 dark:bg-gray-900/30">
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
                    {stops.length} stop{stops.length !== 1 ? 's' : ''} on this route
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {stops.map((stop) => (
                      <div
                        key={stop.id}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800"
                      >
                        <span className="w-2 h-2 rounded-full bg-madison-red flex-shrink-0" />
                        {stop.name}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {filtered.length === 0 && (
          <p className="text-center text-gray-400 py-8 text-sm">
            No routes match your search.
          </p>
        )}
      </div>
    </div>
  );
}

export default RoutesGallery;
