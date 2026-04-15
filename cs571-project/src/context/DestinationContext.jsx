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

  const selectRoute = useCallback((routeId) => {
    setSelectedRoute((prev) => (prev === routeId ? null : routeId));
  }, []);

  const clear = useCallback(() => {
    setSelectedStop(null);
    setSelectedRoute(null);
  }, []);

  return (
    <DestinationContext.Provider
      value={{ selectedStop, selectedRoute, selectStop, selectRoute, clear }}
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
