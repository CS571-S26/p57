import { useState } from 'react';
import { getRoutes } from '../services/metroTransitApi';

const routes = getRoutes();

function RouteFilter({ selectedRoute, onSelectRoute }) {
  const [filter, setFilter] = useState('');

  const filtered = routes.filter(
    (r) =>
      r.shortName.toLowerCase().includes(filter.toLowerCase()) ||
      r.longName.toLowerCase().includes(filter.toLowerCase()),
  );

  return (
    <div className="space-y-2">
      <input
        type="text"
        placeholder="Filter routes..."
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 outline-none focus:ring-2 focus:ring-madison-red/40 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
        aria-label="Filter bus routes"
      />
      <ul className="space-y-1 max-h-[420px] overflow-y-auto pr-1">
        {filtered.map((route) => (
          <li key={route.id}>
            <button
              onClick={() => onSelectRoute(route.id)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors text-left ${
                selectedRoute === route.id
                  ? 'bg-madison-red text-white'
                  : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
              }`}
            >
              <span
                className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-md text-xs font-bold text-white"
                style={{
                  backgroundColor:
                    selectedRoute === route.id ? '#fff3' : route.color,
                }}
              >
                {route.shortName}
              </span>
              <span className="truncate">{route.longName}</span>
            </button>
          </li>
        ))}
        {filtered.length === 0 && (
          <li className="text-sm text-gray-400 px-3 py-2">No routes match.</li>
        )}
      </ul>
    </div>
  );
}

export default RouteFilter;
