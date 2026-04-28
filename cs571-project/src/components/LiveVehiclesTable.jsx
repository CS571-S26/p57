import { useMemo, useState } from 'react';
import { getDirectionShort } from '../services/metroTransitApi';

const OCCUPANCY_STYLES = {
  Low: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
  Medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300',
  High: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
};

function formatTimestamp(ts) {
  if (!ts) return '—';
  const ms = ts > 1e12 ? ts : ts * 1000;
  const ageSec = Math.round((Date.now() - ms) / 1000);
  if (ageSec < 60) return `${ageSec}s ago`;
  if (ageSec < 3600) return `${Math.round(ageSec / 60)}m ago`;
  return new Date(ms).toLocaleTimeString();
}

function formatSpeed(metersPerSec) {
  if (!metersPerSec || metersPerSec <= 0) return '—';
  return `${(metersPerSec * 2.23694).toFixed(1)} mph`;
}

function formatBearing(deg) {
  if (deg == null) return '—';
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const d = dirs[Math.round(deg / 45) % 8];
  return `${Math.round(deg)}° ${d}`;
}

const COLUMNS = [
  { key: 'vehicleId', label: 'Vehicle' },
  { key: 'routeId', label: 'Route' },
  { key: 'directionId', label: 'Direction' },
  { key: 'occupancy', label: 'Occupancy' },
  { key: 'speed', label: 'Speed' },
  { key: 'bearing', label: 'Heading' },
  { key: 'lat', label: 'Lat' },
  { key: 'lng', label: 'Lng' },
  { key: 'timestamp', label: 'Updated' },
];

/**
 * Sortable, filterable table of every active vehicle. All fields the
 * GTFS-RT VehiclePositions feed exposes are shown — this is the "data
 * lover's dream" view of buses on the road right now.
 */
function LiveVehiclesTable({ vehicles, filter, onFilterChange }) {
  const [sortKey, setSortKey] = useState('routeId');
  const [sortDir, setSortDir] = useState('asc');

  const sorted = useMemo(() => {
    const f = filter.trim().toLowerCase();
    const filtered = f
      ? vehicles.filter(
          (v) =>
            String(v.routeId).toLowerCase().includes(f) ||
            String(v.vehicleId).toLowerCase().includes(f),
        )
      : vehicles;
    const arr = [...filtered];
    arr.sort((a, b) => {
      const va = a[sortKey];
      const vb = b[sortKey];
      if (va == null && vb == null) return 0;
      if (va == null) return 1;
      if (vb == null) return -1;
      if (typeof va === 'number' && typeof vb === 'number') {
        return sortDir === 'asc' ? va - vb : vb - va;
      }
      return sortDir === 'asc'
        ? String(va).localeCompare(String(vb))
        : String(vb).localeCompare(String(va));
    });
    return arr;
  }, [vehicles, filter, sortKey, sortDir]);

  const toggleSort = (key) => {
    if (key === sortKey) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  return (
    <section
      aria-labelledby="vehicles-heading"
      className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden"
    >
      <div className="flex flex-wrap items-center gap-3 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <h2 id="vehicles-heading" className="text-base font-bold text-gray-900 dark:text-white">
          Active vehicles ({sorted.length})
        </h2>
        <label htmlFor="vehicles-filter" className="sr-only">
          Filter vehicles
        </label>
        <input
          id="vehicles-filter"
          type="text"
          value={filter}
          onChange={(e) => onFilterChange(e.target.value)}
          placeholder="Filter by route or vehicle ID…"
          className="ml-auto w-full sm:w-64 px-3 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-madison-red/40 placeholder-gray-500 dark:placeholder-gray-400"
        />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-900/50 text-xs uppercase tracking-wider text-gray-700 dark:text-gray-300">
            <tr>
              {COLUMNS.map((c) => {
                const active = sortKey === c.key;
                return (
                  <th
                    key={c.key}
                    scope="col"
                    className="px-3 py-2 text-left font-semibold"
                  >
                    <button
                      type="button"
                      onClick={() => toggleSort(c.key)}
                      className="flex items-center gap-1 hover:text-gray-900 dark:hover:text-white"
                      aria-sort={
                        active ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'
                      }
                    >
                      {c.label}
                      {active && (
                        <span aria-hidden="true">{sortDir === 'asc' ? '▲' : '▼'}</span>
                      )}
                    </button>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {sorted.map((v) => (
              <tr
                key={v.vehicleId}
                className="hover:bg-gray-50 dark:hover:bg-gray-700/50"
              >
                <td className="px-3 py-2 font-mono text-xs text-gray-700 dark:text-gray-300">
                  {v.vehicleId}
                </td>
                <td className="px-3 py-2">
                  <span className="inline-block px-2 py-0.5 rounded font-bold text-xs bg-madison-red text-white">
                    {v.routeId || '—'}
                  </span>
                </td>
                <td className="px-3 py-2 text-gray-700 dark:text-gray-300">
                  {(() => {
                    const headsign = getDirectionShort(v.routeId, v.directionId);
                    if (headsign) return <>Toward {headsign}</>;
                    return v.directionId == null ? '—' : `Dir ${v.directionId}`;
                  })()}
                </td>
                <td className="px-3 py-2">
                  {v.occupancy ? (
                    <span
                      className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${OCCUPANCY_STYLES[v.occupancy] || ''}`}
                    >
                      {v.occupancy}
                    </span>
                  ) : (
                    <span className="text-gray-500 dark:text-gray-400">—</span>
                  )}
                </td>
                <td className="px-3 py-2 text-gray-700 dark:text-gray-300">
                  {formatSpeed(v.speed)}
                </td>
                <td className="px-3 py-2 text-gray-700 dark:text-gray-300">
                  {formatBearing(v.bearing)}
                </td>
                <td className="px-3 py-2 font-mono text-xs text-gray-700 dark:text-gray-300">
                  {v.lat?.toFixed(5)}
                </td>
                <td className="px-3 py-2 font-mono text-xs text-gray-700 dark:text-gray-300">
                  {v.lng?.toFixed(5)}
                </td>
                <td className="px-3 py-2 text-gray-700 dark:text-gray-300">
                  {formatTimestamp(v.timestamp)}
                </td>
              </tr>
            ))}
            {sorted.length === 0 && (
              <tr>
                <td
                  colSpan={COLUMNS.length}
                  className="px-3 py-6 text-center text-gray-600 dark:text-gray-400"
                >
                  No vehicles match.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default LiveVehiclesTable;
