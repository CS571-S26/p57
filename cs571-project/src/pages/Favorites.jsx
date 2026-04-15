import { useFavorites } from '../context/FavoritesContext';
import { getRoutesForStop, searchStops } from '../services/metroTransitApi';
import { useDestination } from '../context/DestinationContext';
import { useNavigate } from 'react-router-dom';

function Favorites() {
  const { favorites, removeFavorite } = useFavorites();
  const { selectStop } = useDestination();
  const navigate = useNavigate();

  const handleGoToStop = (fav) => {
    const stop = searchStops(fav.name, 1)[0];
    if (stop) {
      selectStop(stop);
      navigate('/');
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
        Saved Stops
      </h1>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
        Your pinned stops for quick access. Tap the star on any stop to save it.
      </p>

      {favorites.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-5xl mb-4">
            <svg className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
            </svg>
          </div>
          <p className="text-gray-500 dark:text-gray-400 font-medium mb-2">
            No saved stops yet
          </p>
          <p className="text-sm text-gray-400 dark:text-gray-500 max-w-xs mx-auto">
            Search for a stop on the Live Map and tap the star icon to pin it here for quick access.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {favorites.map((fav) => {
            const routes = getRoutesForStop(fav.id);
            return (
              <div
                key={fav.id}
                className="flex items-center gap-3 px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
              >
                <button
                  onClick={() => handleGoToStop(fav)}
                  className="flex-1 text-left min-w-0"
                >
                  <p className="font-semibold text-gray-900 dark:text-white text-sm">
                    {fav.name}
                  </p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {routes.map((r) => (
                      <span
                        key={r.id}
                        className="text-[10px] font-bold px-1.5 py-0.5 rounded text-white"
                        style={{ backgroundColor: r.color }}
                      >
                        {r.shortName}
                      </span>
                    ))}
                  </div>
                </button>

                <button
                  onClick={() => removeFavorite(fav.id)}
                  className="flex-shrink-0 p-2 rounded-lg text-yellow-500 hover:bg-red-50 dark:hover:bg-red-900/30 hover:text-red-500 transition-colors"
                  aria-label={`Remove ${fav.name} from favorites`}
                  title="Remove from saved"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                  </svg>
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default Favorites;
