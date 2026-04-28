import { createContext, useContext, useState, useCallback } from 'react';
import { saveRecentDestination } from '../services/metroTransitApi';

const DestinationContext = createContext(null);

export function DestinationProvider({ children }) {
  const [selectedStop, setSelectedStop] = useState(null);
  const [selectedRoute, setSelectedRoute] = useState(null);

  const selectStop = useCallback((stop) => {
    setSelectedStop(stop);
    if (stop) saveRecentDestination(stop);
  }, []);

  // selectRoute toggles when called with the currently-selected route, so
  // tapping the same row in the sidebar clears the highlight. For programmatic
  // updates that must NOT toggle (e.g. picking a trip plan), use setRoute.
  const selectRoute = useCallback((routeId) => {
    setSelectedRoute((prev) => (prev === routeId ? null : routeId));
  }, []);

  const setRoute = useCallback((routeId) => {
    setSelectedRoute(routeId);
  }, []);

  const clear = useCallback(() => {
    setSelectedStop(null);
    setSelectedRoute(null);
  }, []);

  return (
    <DestinationContext.Provider
      value={{ selectedStop, selectedRoute, selectStop, selectRoute, setRoute, clear }}
    >
      {children}
    </DestinationContext.Provider>
  );
}

export function useDestination() {
  const ctx = useContext(DestinationContext);
  if (!ctx) throw new Error('useDestination must be inside DestinationProvider');
  return ctx;
}
