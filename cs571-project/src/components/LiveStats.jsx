/**
 * Top-of-page stat tiles. Compact, dense — built to read like a dashboard.
 */
function StatTile({ label, value, sub }) {
  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
      <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
        {label}
      </p>
      <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">
        {value}
      </p>
      {sub && (
        <p className="mt-0.5 text-xs text-gray-600 dark:text-gray-400">{sub}</p>
      )}
    </div>
  );
}

function LiveStats({ stats }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <StatTile
        label="Vehicles in service"
        value={stats.totalVehicles}
        sub={`${stats.activeRoutes} active routes`}
      />
      <StatTile
        label="Live trip updates"
        value={stats.tripCount}
        sub="ETAs being broadcast"
      />
      <StatTile
        label="Service alerts"
        value={stats.alertCount}
        sub={stats.alertCount === 0 ? 'No disruptions' : 'See alerts banner'}
      />
      <StatTile
        label="Avg occupancy"
        value={stats.avgOccupancyLabel}
        sub={`${stats.occupancyKnown}/${stats.totalVehicles} reporting`}
      />
    </div>
  );
}

export default LiveStats;
