import { useState } from 'react';
import MapContainer from '../components/MapContainer';
import Map3D from '../components/Map3D';
import BusFollowView from '../components/BusFollowView';
import SearchBar from '../components/SearchBar';
import QuickButtons from '../components/QuickButtons';
import BusDetailCard from '../components/BusDetailCard';
import RouteFilter from '../components/RouteFilter';
import LocationButton from '../components/LocationButton';
import NearbyStops from '../components/NearbyStops';
import TripPlannerSheet from '../components/TripPlannerSheet';
import { useDestination } from '../context/DestinationContext';
import { useFavorites } from '../context/FavoritesContext';
import { useUserLocation } from '../hooks/useUserLocation';
import {
  getRoutesForStop,
  fetchStopArrivals,
  getDirectionShort,
  getDirectionLabel,
  getNextScheduled,
  formatTimeOfDay,
} from '../services/metroTransitApi';
import shapesData from '../assets/shapes.json';

function Home() {
  const { selectedRoute, selectRoute, setRoute, selectStop, clear } = useDestination();
  const { addFavorite, removeFavorite, isFavorite } = useFavorites();
  const [selectedBus, setSelectedBus] = useState(null);
  const [stopRoutes, setStopRoutes] = useState([]);
  const [currentStop, setCurrentStop] = useState(null);
  const [tripFrom, setTripFrom] = useState(null);
  const [tripTo, setTripTo] = useState(null);
  const [view3D, setView3D] = useState(false);
  const [followBus, setFollowBus] = useState(null);
  const { location: userLocation, status: locationStatus, request: requestLocation } = useUserLocation();

  const handleSelectStop = async (stop) => {
    selectStop(stop);
    setCurrentStop(stop);
    const routes = getRoutesForStop(stop.id);
    // One card per (route × direction this stop serves), so a user picking
    // "Langdon at N Park" sees both "Route 80 → Toward Memorial Union" and
    // "Route 80 → Toward Eagle Heights" instead of a single ambiguous "Route 80".
    const baseCards = [];
    routes.forEach((r) => {
      const dirs = stop.routesByDirection?.[r.id];
      const dirIds = dirs && dirs.length > 0 ? dirs : [null];
      dirIds.forEach((dirId) => {
        // Schedule fallback: when the live feed has nothing for this card,
        // the next baked departure from the static GTFS gets shown instead.
        const scheduledSec = getNextScheduled(stop.id, r.id, dirId);
        baseCards.push({
          route: r.shortName,
          routeId: r.id,
          directionId: dirId,
          longName: r.longName,
          color: r.color,
          nextStop: stop.name,
          eta: null,
          scheduledSec,
          occupancy: 'Unknown',
          direction: getDirectionLabel(r.id, dirId) || r.longName,
          directionShort: getDirectionShort(r.id, dirId),
        });
      });
    });
    setStopRoutes(baseCards);
    setSelectedBus(null);
    if (routes.length > 0) {
      // Use setRoute (assign) — selectRoute would toggle off if this stop's
      // first route happens to match the currently-highlighted route.
      setRoute(routes[0].id);
      setTripTo(stop.id);
      const shapeStops = shapesData[routes[0].id]?.stops || [];
      setTripFrom(shapeStops[0] || null);
    }

    // Merge real-time ETAs, keyed by (routeId|directionId) so the eastbound
    // and westbound cards each get their own ETA instead of sharing one.
    try {
      const arrivals = await fetchStopArrivals(stop.id);
      if (arrivals.length === 0) return;
      const key = (rid, did) => `${rid}|${did ?? ''}`;
      const etaByKey = new Map();
      arrivals.forEach((a) => {
        const k = key(a.routeId, a.directionId);
        if (!etaByKey.has(k)) etaByKey.set(k, a.eta);
      });
      setStopRoutes((cards) =>
        cards.map((c) => {
          const exact = etaByKey.get(key(c.routeId, c.directionId));
          // Fallback: if direction-specific ETA is missing, fall back to any
          // ETA on this route so the user still sees something.
          const anyOnRoute = exact == null
            ? [...etaByKey.entries()].find(([k]) => k.startsWith(`${c.routeId}|`))?.[1]
            : null;
          const eta = exact ?? anyOnRoute ?? c.eta;
          return { ...c, eta };
        }),
      );
    } catch {
      // Live ETAs unavailable — placeholders remain; not a blocking failure.
    }
  };

  const handleSelectBus = (bus) => {
    setSelectedBus({
      route: bus.route,
      routeId: bus.routeId || bus.route,
      directionId: bus.directionId,
      vehicleId: bus.vehicleId,
      nextStop: 'Live tracking',
      eta: bus.eta,
      occupancy: bus.occupancy || 'Unknown',
      direction: bus.direction,
    });
  };

  // Bus clicked in the 3D view — open the follow modal and update the side card
  const handleSelect3DBus = (vehicle) => {
    setFollowBus(vehicle);
    setSelectedBus({
      route: vehicle.routeId,
      routeId: vehicle.routeId,
      directionId: vehicle.directionId,
      vehicleId: vehicle.vehicleId,
      nextStop: 'Live tracking',
      eta: null,
      occupancy: vehicle.occupancy || 'Unknown',
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
    setRoute(bus.routeId);
    setTripTo(currentStop?.id || null);
    const shapeStops =
      shapesData[bus.routeId]?.stops || [];
    setTripFrom(shapeStops[0] || null);
    setSelectedBus(bus);
  };

  // Trip-planner result selected — drive the existing RouteOverlay from/to
  // highlighting from the plan's boarding and alighting stops.
  const handleSelectPlan = (plan) => {
    if (!plan) return;
    setRoute(plan.route.id);
    setTripFrom(plan.boardStop.id);
    setTripTo(plan.alightStop.id);
    setSelectedBus(null);
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
      <h1 className="sr-only">Madison Metro Live Map</h1>
      {/* Sidebar */}
      <aside className="hidden lg:block w-72 border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 overflow-y-auto" aria-label="Route filter">
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
        {view3D ? (
          <Map3D
            selectedRoute={selectedRoute}
            onSelectBus={handleSelect3DBus}
            userLocation={userLocation}
            className="h-full"
          />
        ) : (
          <MapContainer
            selectedRoute={selectedRoute}
            onSelectBus={handleSelectBus}
            onSelectStop={handleSelectStop}
            tripFromStop={tripFrom}
            tripToStop={tripTo}
            onClearRoute={selectedRoute ? handleClear : null}
            userLocation={userLocation}
            className="h-full"
          />
        )}

        {/* Location toggle — surfaces "closest bus per direction" once enabled */}
        <LocationButton
          status={locationStatus}
          onRequest={requestLocation}
          showHint={!!selectedRoute && locationStatus === 'idle'}
        />

        {/* 2D / 3D toggle */}
        <button
          onClick={() => setView3D((v) => !v)}
          className="absolute bottom-4 right-4 z-10 flex items-center gap-2 px-3 py-2 rounded-lg bg-white dark:bg-gray-800 shadow-lg text-sm font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors border border-gray-200 dark:border-gray-600"
          aria-label={view3D ? 'Switch to 2D map' : 'Switch to 3D map'}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l9-9 9 9M5 10v10a1 1 0 001 1h12a1 1 0 001-1V10" />
          </svg>
          {view3D ? '2D' : '3D'}
        </button>

        {/* Bus follow modal — only when 3D and a bus is selected */}
        {followBus && (
          <BusFollowView vehicle={followBus} onClose={() => setFollowBus(null)} />
        )}

        {/* Floating search */}
        <section
          className="absolute top-4 left-4 right-4 lg:right-auto lg:w-96 z-10"
          aria-labelledby="search-heading"
        >
          <h2 id="search-heading" className="sr-only">
            Find a stop
          </h2>
          <SearchBar onSelectStop={handleSelectStop} />
          {/* Personalized list of stops within walking distance.
              Hidden on mobile when something is already selected, to free up
              map space — the search bar above still gets focus. */}
          <div className={`mt-2 ${currentStop || selectedBus ? 'hidden lg:block' : ''}`}>
            <NearbyStops
              userLocation={userLocation}
              locationStatus={locationStatus}
              onSelectStop={handleSelectStop}
              onRequestLocation={requestLocation}
            />
          </div>
          <div className={`mt-2 ${currentStop || selectedBus ? 'hidden lg:block' : ''}`}>
            <QuickButtons onSelect={handleSelectStop} />
          </div>
        </section>

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
                <div className="space-y-3">
                  {/* Trip planner: only when we know where the user is.
                      Otherwise it's just the legacy route-list view. */}
                  {userLocation && currentStop && (
                    <TripPlannerSheet
                      origin={userLocation}
                      destination={currentStop}
                      onSelectPlan={handleSelectPlan}
                      onSelectStop={handleSelectStop}
                    />
                  )}

                  <details className="group">
                    <summary className="cursor-pointer text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider list-none flex items-center justify-between">
                      <span>All routes serving this stop</span>
                      <span aria-hidden="true" className="text-gray-400 group-open:rotate-180 transition-transform">▾</span>
                    </summary>
                    <div className="space-y-1.5 mt-2">
                  {stopRoutes.map((bus) => (
                    <button
                      key={`${bus.routeId}|${bus.directionId ?? ''}`}
                      onClick={() => handleSelectRouteFromList(bus)}
                      className={`w-full text-left flex items-center justify-between px-3 py-2.5 rounded-lg transition-colors ${
                        selectedRoute === bus.routeId
                          ? 'bg-madison-red/10 dark:bg-red-900/30'
                          : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-md text-white text-xs font-bold"
                          style={{ backgroundColor: bus.color }}
                          aria-hidden="true"
                        >
                          {bus.route}
                        </span>
                        <span className="text-sm text-gray-800 dark:text-gray-200 truncate">
                          {bus.directionShort
                            ? `Toward ${bus.directionShort}`
                            : bus.longName}
                        </span>
                      </div>
                      <span className="flex-shrink-0 text-right">
                        {bus.eta != null ? (
                          <span className="text-madison-red dark:text-red-400 font-bold text-sm">
                            {bus.eta} min
                          </span>
                        ) : bus.scheduledSec != null ? (
                          <span className="block">
                            <span className="text-gray-700 dark:text-gray-300 text-sm font-medium">
                              {formatTimeOfDay(bus.scheduledSec)}
                            </span>
                            <span className="block text-[10px] text-gray-500 dark:text-gray-400">
                              scheduled
                            </span>
                          </span>
                        ) : (
                          <span className="text-gray-400 dark:text-gray-500 text-sm">—</span>
                        )}
                      </span>
                    </button>
                  ))}
                    </div>
                  </details>
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
