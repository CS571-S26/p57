import { useEffect, useMemo, useRef, useState } from 'react';
import {
  fetchVehiclePositions,
  fetchTripUpdates,
  fetchServiceAlerts,
  getRoutes,
  getStops,
} from '../services/metroTransitApi';
import LiveStats from '../components/LiveStats';
import LiveVehiclesTable from '../components/LiveVehiclesTable';
import TripUpdatesTable from '../components/TripUpdatesTable';
import RouteOccupancyTable from '../components/RouteOccupancyTable';

const REFRESH_INTERVAL = 15_000;

const allRoutes = getRoutes();
const allStops = getStops();

/**
 * "Live Data" — every datapoint the GTFS-RT feeds expose, organized as
 * a dashboard. Refreshes every 15 seconds with vehicles, trip updates,
 * and service alerts in parallel.
 */
function LiveData() {
  const [vehicles, setVehicles] = useState([]);
  const [trips, setTrips] = useState({});
  const [alerts, setAlerts] = useState([]);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [vehicleFilter, setVehicleFilter] = useState('');
  const liveRegionRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    async function refresh() {
      const [v, t, a] = await Promise.all([
        fetchVehiclePositions(),
        fetchTripUpdates(),
        fetchServiceAlerts(),
      ]);
      if (cancelled) return;
      setVehicles(v);
      setTrips(t);
      setAlerts(a);
      setLastUpdated(Date.now());
    }
    refresh();
    const id = setInterval(refresh, REFRESH_INTERVAL);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  const stats = useMemo(() => {
    const byRoute = new Set();
    let occupancyKnown = 0;
    let occupancyScore = 0; // Low=1, Medium=2, High=3
    vehicles.forEach((v) => {
      if (v.routeId) byRoute.add(v.routeId);
      if (v.occupancy === 'Low') {
        occupancyKnown++;
        occupancyScore += 1;
      } else if (v.occupancy === 'Medium') {
        occupancyKnown++;
        occupancyScore += 2;
      } else if (v.occupancy === 'High') {
        occupancyKnown++;
        occupancyScore += 3;
      }
    });
    const avg = occupancyKnown > 0 ? occupancyScore / occupancyKnown : 0;
    const avgOccupancyLabel =
      occupancyKnown === 0 ? '—' : avg < 1.5 ? 'Low' : avg < 2.5 ? 'Medium' : 'High';
    return {
      totalVehicles: vehicles.length,
      activeRoutes: byRoute.size,
      tripCount: Object.keys(trips).length,
      alertCount: alerts.length,
      occupancyKnown,
      avgOccupancyLabel,
    };
  }, [vehicles, trips, alerts]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Live Data
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Every datapoint the Madison Metro GTFS-RT feeds publish, refreshed every 15 seconds.
          </p>
        </div>
        <div
          ref={liveRegionRef}
          aria-live="polite"
          className="text-xs text-gray-600 dark:text-gray-400"
        >
          {lastUpdated
            ? `Updated ${new Date(lastUpdated).toLocaleTimeString()}`
            : 'Loading…'}
        </div>
      </header>

      <LiveStats stats={stats} />

      <RouteOccupancyTable vehicles={vehicles} routes={allRoutes} />

      <LiveVehiclesTable
        vehicles={vehicles}
        filter={vehicleFilter}
        onFilterChange={setVehicleFilter}
      />

      <TripUpdatesTable trips={trips} stops={allStops} />

      {alerts.length > 0 && (
        <section
          aria-labelledby="alerts-heading"
          className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden"
        >
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
            <h2
              id="alerts-heading"
              className="text-base font-bold text-gray-900 dark:text-white"
            >
              Service alerts ({alerts.length})
            </h2>
          </div>
          <ul className="divide-y divide-gray-100 dark:divide-gray-700 list-none p-0">
            {alerts.map((a) => (
              <li key={a.id} className="px-4 py-3">
                <p className="text-sm font-semibold text-gray-900 dark:text-white">
                  {a.header || 'Alert'}
                  {a.routeIds.length > 0 && (
                    <span className="ml-2 text-xs font-normal text-gray-600 dark:text-gray-400">
                      ({a.routeIds.join(', ')})
                    </span>
                  )}
                </p>
                {a.body && (
                  <p className="mt-1 text-sm text-gray-700 dark:text-gray-300">
                    {a.body}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

export default LiveData;
