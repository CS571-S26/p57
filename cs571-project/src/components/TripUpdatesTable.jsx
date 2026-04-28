import { useMemo, useState } from 'react';

function formatDelay(seconds) {
  if (seconds == null || seconds === 0) return 'on time';
  const min = Math.round(seconds / 60);
  if (min === 0) return 'on time';
  return min > 0 ? `+${min} min late` : `${min} min early`;
}

const PAGE_SIZE = 30;

/**
 * Flattens GTFS-RT TripUpdates → next-stop predictions and renders them
 * as a paginated table. Each row is one upcoming stop with route, ETA,
 * and delay relative to schedule.
 */
function TripUpdatesTable({ trips, stops }) {
  const [filter, setFilter] = useState('');
  const [page, setPage] = useState(0);

  const stopNameById = useMemo(
    () => Object.fromEntries(stops.map((s) => [s.id, s.name])),
    [stops],
  );

  const rows = useMemo(() => {
    const out = [];
    Object.entries(trips).forEach(([tripId, tu]) => {
      tu.stopUpdates.forEach((s) => {
        if (s.eta == null) return;
        out.push({
          tripId,
          routeId: tu.routeId,
          stopId: s.stopId,
          stopName: stopNameById[s.stopId] || `Stop ${s.stopId}`,
          eta: s.eta,
          delay: s.delay,
        });
      });
    });
    out.sort((a, b) => a.eta - b.eta);
    return out;
  }, [trips, stopNameById]);

  const filtered = useMemo(() => {
    const f = filter.trim().toLowerCase();
    if (!f) return rows;
    return rows.filter(
      (r) =>
        String(r.routeId).toLowerCase().includes(f) ||
        r.stopName.toLowerCase().includes(f),
    );
  }, [rows, filter]);

  const visible = filtered.slice(0, (page + 1) * PAGE_SIZE);

  return (
    <section
      aria-labelledby="trips-heading"
      className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden"
    >
      <div className="flex flex-wrap items-center gap-3 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <h2 id="trips-heading" className="text-base font-bold text-gray-900 dark:text-white">
          Upcoming arrivals ({filtered.length})
        </h2>
        <label htmlFor="trips-filter" className="sr-only">
          Filter arrivals
        </label>
        <input
          id="trips-filter"
          type="text"
          value={filter}
          onChange={(e) => {
            setFilter(e.target.value);
            setPage(0);
          }}
          placeholder="Filter by route or stop…"
          className="ml-auto w-full sm:w-64 px-3 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-madison-red/40 placeholder-gray-500 dark:placeholder-gray-400"
        />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-900/50 text-xs uppercase tracking-wider text-gray-700 dark:text-gray-300">
            <tr>
              <th scope="col" className="px-3 py-2 text-left font-semibold">Route</th>
              <th scope="col" className="px-3 py-2 text-left font-semibold">Stop</th>
              <th scope="col" className="px-3 py-2 text-left font-semibold">ETA</th>
              <th scope="col" className="px-3 py-2 text-left font-semibold">Schedule</th>
              <th scope="col" className="px-3 py-2 text-left font-semibold">Trip</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {visible.map((r, i) => {
              const late = (r.delay || 0) > 60;
              const early = (r.delay || 0) < -60;
              return (
                <tr
                  key={`${r.tripId}-${r.stopId}-${i}`}
                  className="hover:bg-gray-50 dark:hover:bg-gray-700/50"
                >
                  <td className="px-3 py-2">
                    <span className="inline-block px-2 py-0.5 rounded font-bold text-xs bg-madison-red text-white">
                      {r.routeId || '—'}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-gray-800 dark:text-gray-200">
                    {r.stopName}
                  </td>
                  <td className="px-3 py-2 font-bold text-madison-red dark:text-red-400">
                    {r.eta === 0 ? 'arriving' : `${r.eta} min`}
                  </td>
                  <td
                    className={`px-3 py-2 text-xs ${
                      late
                        ? 'text-red-700 dark:text-red-400'
                        : early
                          ? 'text-blue-700 dark:text-blue-400'
                          : 'text-gray-600 dark:text-gray-400'
                    }`}
                  >
                    {formatDelay(r.delay)}
                  </td>
                  <td className="px-3 py-2 font-mono text-xs text-gray-600 dark:text-gray-400 truncate max-w-[12rem]">
                    {r.tripId}
                  </td>
                </tr>
              );
            })}
            {visible.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="px-3 py-6 text-center text-gray-600 dark:text-gray-400"
                >
                  No upcoming arrivals reported.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {visible.length < filtered.length && (
        <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700">
          <button
            type="button"
            onClick={() => setPage((p) => p + 1)}
            className="w-full px-3 py-1.5 text-sm rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 font-medium"
          >
            Show {Math.min(PAGE_SIZE, filtered.length - visible.length)} more
          </button>
        </div>
      )}
    </section>
  );
}

export default TripUpdatesTable;
