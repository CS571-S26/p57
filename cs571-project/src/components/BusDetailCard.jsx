import { getDirectionLabel } from '../services/metroTransitApi';

const OCCUPANCY_STYLES = {
  Low: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400',
  Medium: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400',
  High: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400',
  Unknown: 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400',
};

function BusDetailCard({ bus }) {
  if (!bus) {
    return (
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 text-center text-sm text-gray-500 dark:text-gray-400">
        Select a bus or stop to view details.
      </div>
    );
  }

  const occ = bus.occupancy || 'Unknown';
  // Prefer the live GTFS-RT direction headsign; fall back to whatever caller
  // passed (e.g. a long-name fragment) for backward compatibility.
  const direction =
    getDirectionLabel(bus.routeId || bus.route, bus.directionId) ||
    bus.direction ||
    '';

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
        <div className="min-w-0">
          <p className="font-semibold text-gray-900 dark:text-white">
            Route {bus.route}
          </p>
          {direction && (
            <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
              {direction}
            </p>
          )}
        </div>
        <span className={`flex-shrink-0 text-xs font-medium px-2.5 py-0.5 rounded-full ${OCCUPANCY_STYLES[occ]}`}>
          {occ}
        </span>
      </div>
      <div className="px-4 py-3 space-y-1.5 text-sm">
        <p className="dark:text-gray-300">
          <span className="font-medium text-gray-700 dark:text-gray-400">Next stop:</span>{' '}
          {bus.nextStop}
        </p>
        {bus.eta != null && (
          <p className="dark:text-gray-300">
            <span className="font-medium text-gray-700 dark:text-gray-400">ETA:</span>{' '}
            <span className="text-madison-red font-bold">{bus.eta} min</span>
          </p>
        )}
        {bus.vehicleId && (
          <p className="dark:text-gray-300">
            <span className="font-medium text-gray-700 dark:text-gray-400">Vehicle:</span>{' '}
            <span className="font-mono text-xs">#{bus.vehicleId}</span>
          </p>
        )}
      </div>
    </div>
  );
}

export default BusDetailCard;
