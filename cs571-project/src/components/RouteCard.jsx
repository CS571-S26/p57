const OCCUPANCY_STYLES = {
  Low: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400',
  Medium: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400',
  High: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400',
  Unknown: 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400',
};

function RouteCard({ route, eta, occupancy = 'Unknown', stopName, onClick, compact = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:shadow-md transition-shadow ${
        compact ? 'p-3' : 'p-4'
      }`}
    >
      <div className="flex items-center gap-3">
        {/* Route badge */}
        <span
          className="flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-lg text-white text-sm font-bold"
          style={{ backgroundColor: route.color || '#c5050c' }}
        >
          {route.shortName}
        </span>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
            {route.longName}
          </p>
          {stopName && (
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
              {stopName}
            </p>
          )}
        </div>

        {/* ETA + Occupancy */}
        <div className="flex-shrink-0 text-right space-y-1">
          {eta != null && (
            <span className="block text-lg font-bold text-madison-red">
              {eta}<span className="text-xs font-normal ml-0.5">min</span>
            </span>
          )}
          <span className={`inline-block text-[10px] font-medium px-2 py-0.5 rounded-full ${OCCUPANCY_STYLES[occupancy]}`}>
            {occupancy}
          </span>
        </div>
      </div>
    </button>
  );
}

export default RouteCard;
