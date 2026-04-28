import { useMemo } from 'react';

const PCT_BAR_COLORS = {
  Low: 'bg-green-500',
  Medium: 'bg-yellow-500',
  High: 'bg-red-500',
};

/**
 * Per-route breakdown — vehicle count, occupancy distribution, average
 * speed. Built from the live VehiclePositions feed.
 */
function RouteOccupancyTable({ vehicles, routes }) {
  const rows = useMemo(() => {
    const routeMeta = Object.fromEntries(routes.map((r) => [r.id, r]));
    const groups = new Map();
    vehicles.forEach((v) => {
      const r = v.routeId || 'unknown';
      if (!groups.has(r)) {
        groups.set(r, {
          routeId: r,
          route: routeMeta[r],
          count: 0,
          occupancy: { Low: 0, Medium: 0, High: 0, Unknown: 0 },
          speedSum: 0,
          speedCount: 0,
        });
      }
      const g = groups.get(r);
      g.count++;
      g.occupancy[v.occupancy || 'Unknown']++;
      if (v.speed > 0) {
        g.speedSum += v.speed;
        g.speedCount++;
      }
    });
    return Array.from(groups.values())
      .map((g) => ({
        ...g,
        avgSpeed: g.speedCount > 0 ? g.speedSum / g.speedCount : null,
      }))
      .sort((a, b) => b.count - a.count);
  }, [vehicles, routes]);

  return (
    <section
      aria-labelledby="routes-heading"
      className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden"
    >
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <h2 id="routes-heading" className="text-base font-bold text-gray-900 dark:text-white">
          By route ({rows.length})
        </h2>
        <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
          Live distribution of buses, occupancy, and speed.
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-900/50 text-xs uppercase tracking-wider text-gray-700 dark:text-gray-300">
            <tr>
              <th scope="col" className="px-3 py-2 text-left font-semibold">Route</th>
              <th scope="col" className="px-3 py-2 text-left font-semibold">Buses</th>
              <th scope="col" className="px-3 py-2 text-left font-semibold w-1/3">Occupancy mix</th>
              <th scope="col" className="px-3 py-2 text-left font-semibold">Avg speed</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {rows.map((r) => {
              const total = r.count;
              return (
                <tr
                  key={r.routeId}
                  className="hover:bg-gray-50 dark:hover:bg-gray-700/50"
                >
                  <td className="px-3 py-2">
                    <span
                      className="inline-block px-2 py-0.5 rounded font-bold text-xs text-white"
                      style={{ backgroundColor: r.route?.color || '#6b7280' }}
                    >
                      {r.routeId}
                    </span>
                    {r.route?.longName && (
                      <span className="ml-2 text-xs text-gray-600 dark:text-gray-400">
                        {r.route.longName}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 font-bold text-gray-900 dark:text-white">
                    {r.count}
                  </td>
                  <td className="px-3 py-2">
                    <div
                      className="flex h-3 w-full rounded overflow-hidden border border-gray-200 dark:border-gray-700"
                      role="img"
                      aria-label={`Low ${r.occupancy.Low}, Medium ${r.occupancy.Medium}, High ${r.occupancy.High}, Unknown ${r.occupancy.Unknown}`}
                    >
                      {['Low', 'Medium', 'High'].map((k) =>
                        r.occupancy[k] > 0 ? (
                          <div
                            key={k}
                            className={PCT_BAR_COLORS[k]}
                            style={{ width: `${(r.occupancy[k] / total) * 100}%` }}
                            title={`${k}: ${r.occupancy[k]}`}
                          />
                        ) : null,
                      )}
                      {r.occupancy.Unknown > 0 && (
                        <div
                          className="bg-gray-300 dark:bg-gray-600"
                          style={{ width: `${(r.occupancy.Unknown / total) * 100}%` }}
                          title={`Unknown: ${r.occupancy.Unknown}`}
                        />
                      )}
                    </div>
                    <div className="mt-1 text-[10px] text-gray-600 dark:text-gray-400 flex gap-2">
                      <span>L:{r.occupancy.Low}</span>
                      <span>M:{r.occupancy.Medium}</span>
                      <span>H:{r.occupancy.High}</span>
                      {r.occupancy.Unknown > 0 && <span>?:{r.occupancy.Unknown}</span>}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-gray-700 dark:text-gray-300">
                    {r.avgSpeed != null
                      ? `${(r.avgSpeed * 2.23694).toFixed(1)} mph`
                      : '—'}
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={4} className="px-3 py-6 text-center text-gray-600 dark:text-gray-400">
                  No active routes right now.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default RouteOccupancyTable;
