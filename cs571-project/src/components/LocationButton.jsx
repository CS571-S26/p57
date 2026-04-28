/**
 * Floating "Use my location" control. When the user grants permission,
 * MapContainer/Map3D use the location to show only the closest bus in each
 * direction on the selected route, plus a blue "you are here" marker.
 *
 * Props:
 *   status     — from useUserLocation: 'idle' | 'loading' | 'granted' | 'denied' | 'unavailable'
 *   onRequest  — fired when the user clicks the idle/denied state
 *   showHint   — surface a small tooltip nudge (e.g., when a route is picked
 *                but location hasn't been requested yet)
 */
function LocationButton({ status, onRequest, showHint = false }) {
  const isGranted = status === 'granted';
  const isLoading = status === 'loading';

  const label = (() => {
    switch (status) {
      case 'granted':
        return 'Tracking your location';
      case 'loading':
        return 'Getting your location…';
      case 'denied':
        return 'Location blocked — enable in browser settings';
      case 'unavailable':
        return 'Location not available in this browser';
      default:
        return 'Use my location';
    }
  })();

  const disabled = isLoading || status === 'unavailable';

  return (
    <div className="absolute bottom-4 left-4 z-10 flex flex-col gap-2 items-start">
      {showHint && status !== 'granted' && (
        <div
          role="status"
          className="px-3 py-1.5 rounded-lg text-xs font-medium bg-madison-red text-white shadow-lg max-w-[14rem]"
        >
          Share your location to see the nearest bus in each direction (e.g. "Toward Capitol" vs "Toward Hilldale").
        </div>
      )}
      <button
        type="button"
        onClick={onRequest}
        disabled={disabled}
        aria-pressed={isGranted}
        aria-label={label}
        title={label}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg shadow-lg text-sm font-semibold border transition-colors ${
          isGranted
            ? 'bg-blue-600 text-white border-blue-700 hover:bg-blue-700'
            : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
        } ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
      >
        <svg
          aria-hidden="true"
          className={`w-4 h-4 ${isLoading ? 'animate-pulse' : ''}`}
          fill="currentColor"
          viewBox="0 0 24 24"
        >
          <path d="M12 2a1 1 0 011 1v1.06A8.003 8.003 0 0119.94 11H21a1 1 0 110 2h-1.06A8.003 8.003 0 0113 19.94V21a1 1 0 11-2 0v-1.06A8.003 8.003 0 014.06 13H3a1 1 0 110-2h1.06A8.003 8.003 0 0111 4.06V3a1 1 0 011-1zm0 4a6 6 0 100 12 6 6 0 000-12zm0 3a3 3 0 110 6 3 3 0 010-6z" />
        </svg>
        {isGranted ? 'Location on' : isLoading ? 'Locating…' : 'Use my location'}
      </button>
    </div>
  );
}

export default LocationButton;
