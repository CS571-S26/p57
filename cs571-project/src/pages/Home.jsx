import { useState } from 'react';
import MapContainer from '../components/MapContainer';
import SearchBar from '../components/SearchBar';
import QuickButtons from '../components/QuickButtons';
import BusDetailCard from '../components/BusDetailCard';
import RouteFilter from '../components/RouteFilter';
import { useDestination } from '../context/DestinationContext';
import { useFavorites } from '../context/FavoritesContext';
import { getRoutesForStop } from '../services/metroTransitApi';
import shapesData from '../assets/shapes.json';

function Home() {
  const { selectedRoute, selectRoute, selectStop, clear } = useDestination();
  const { addFavorite, removeFavorite, isFavorite } = useFavorites();
  const [selectedBus, setSelectedBus] = useState(null);
  const [stopRoutes, setStopRoutes] = useState([]);
  const [currentStop, setCurrentStop] = useState(null);
  const [tripFrom, setTripFrom] = useState(null);
  const [tripTo, setTripTo] = useState(null);

  const handleSelectStop = (stop) => {
    selectStop(stop);
    setCurrentStop(stop);
    const routes = getRoutesForStop(stop.id);
    setStopRoutes(
      routes.map((r) => ({
        route: r.shortName,
        routeId: r.id,
        longName: r.longName,
        color: r.color,
        nextStop: stop.name,
        eta: Math.floor(Math.random() * 15) + 2,
        occupancy: ['Low', 'Medium', 'High'][Math.floor(Math.random() * 3)],
        direction: r.longName.split('–')[0]?.trim() || 'Outbound',
      })),
    );
    setSelectedBus(null);
    // Select the first route and set up a trip highlight to this stop
    if (routes.length > 0) {
      selectRoute(routes[0].id);
      setTripTo(stop.id);
      // Pick a reasonable "from" stop — the first stop on this route
      const shapeStops =
        shapesData[routes[0].id]?.stops || [];
      setTripFrom(shapeStops[0] || null);
    }
  };

  const handleSelectBus = (bus) => {
    setSelectedBus({
      route: bus.route,
      nextStop: 'Live tracking',
      eta: bus.eta,
      occupancy: bus.occupancy || 'Unknown',
      direction: bus.direction || 'In service',
    });
  };

  const handleRouteSelect = (routeId) => {
    selectRoute(routeId);
    // Clear trip highlighting when manually picking routes
    setTripFrom(null);
    setTripTo(null);
    setStopRoutes([]);
    setCurrentStop(null);
    setSelectedBus(null);
  };

  const handleSelectRouteFromList = (bus) => {
    selectRoute(bus.routeId);
    setTripTo(currentStop?.id || null);
    const shapeStops =
      shapesData[bus.routeId]?.stops || [];
    setTripFrom(shapeStops[0] || null);
    setSelectedBus(bus);
  };

  const handleClear = () => {
    clear();
    setSelectedBus(null);
    setStopRoutes([]);
    setCurrentStop(null);
    setTripFrom(null);
    setTripTo(null);
  };

  const favToggle = currentStop
    ? () => {
        if (isFavorite(currentStop.id)) {
          removeFavorite(currentStop.id);
        } else {
          addFavorite(currentStop);
        }
      }
    : null;

  return (
    <div className="relative flex flex-col lg:flex-row h-[calc(100vh-3.5rem)]">
      {/* Sidebar */}
      <aside className="hidden lg:block w-72 border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 overflow-y-auto">
        <h2 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
          Routes
        </h2>
        <RouteFilter
          selectedRoute={selectedRoute}
          onSelectRoute={handleRouteSelect}
        />
      </aside>

      {/* Map */}
      <main className="flex-1 relative">
        <MapContainer
          selectedRoute={selectedRoute}
          onSelectBus={handleSelectBus}
          tripFromStop={tripFrom}
          tripToStop={tripTo}
          onClearRoute={selectedRoute ? handleClear : null}
          className="h-full"
        />

        {/* Floating search */}
        <div className="absolute top-4 left-4 right-4 lg:right-auto lg:w-96 z-10">
          <SearchBar onSelectStop={handleSelectStop} />
          <div className="mt-2">
            <QuickButtons onSelect={handleSelectStop} />
          </div>
        </div>

        {/* Floating details panel */}
        {(selectedBus || stopRoutes.length > 0) && (
          <div className="absolute bottom-0 left-0 right-0 lg:bottom-auto lg:top-4 lg:right-4 lg:left-auto lg:w-80 z-10">
            <div className="bg-white dark:bg-gray-800 rounded-t-2xl lg:rounded-xl shadow-2xl p-4 max-h-80 lg:max-h-[60vh] overflow-y-auto">
              {/* Stop name + favorite star */}
              {currentStop && (
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white truncate">
                    {currentStop.name}
                  </h3>
                  {favToggle && (
                    <button
                      onClick={favToggle}
                      className="flex-shrink-0 p-1"
                      aria-label={
                        isFavorite(currentStop.id)
                          ? 'Remove from saved'
                          : 'Save this stop'
                      }
                    >
                      <svg
                        className={`w-5 h-5 ${
                          isFavorite(currentStop.id)
                            ? 'text-yellow-400 fill-yellow-400'
                            : 'text-gray-300 dark:text-gray-600'
                        }`}
                        fill={isFavorite(currentStop.id) ? 'currentColor' : 'none'}
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
                        />
                      </svg>
                    </button>
                  )}
                </div>
              )}

              {selectedBus ? (
                <BusDetailCard bus={selectedBus} />
              ) : (
                <div className="space-y-1.5">
                  <p className="text-xs text-gray-400 mb-2">
                    Select a route to see details
                  </p>
                  {stopRoutes.map((bus, i) => (
                    <button
                      key={i}
                      onClick={() => handleSelectRouteFromList(bus)}
                      className={`w-full text-left flex items-center justify-between px-3 py-2.5 rounded-lg transition-colors ${
                        selectedRoute === bus.routeId
                          ? 'bg-madison-red/10 dark:bg-red-900/30'
                          : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className="w-8 h-8 flex items-center justify-center rounded-md text-white text-xs font-bold"
                          style={{ backgroundColor: bus.color }}
                        >
                          {bus.route}
                        </span>
                        <span className="text-sm text-gray-700 dark:text-gray-300 truncate max-w-[140px]">
                          {bus.longName}
                        </span>
                      </div>
                      <span className="text-madison-red font-bold text-sm">
                        {bus.eta} min
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default Home;
