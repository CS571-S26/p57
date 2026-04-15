import { createContext, useContext, useState, useCallback } from 'react';

const STORAGE_KEY = 'metro_favorites';

function loadFavorites() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

const FavoritesContext = createContext(null);

export function FavoritesProvider({ children }) {
  const [favorites, setFavorites] = useState(loadFavorites);

  const persist = (next) => {
    setFavorites(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  };

  const addFavorite = useCallback(
    (stop) => {
      const exists = favorites.some((f) => f.id === stop.id);
      if (!exists) {
        persist([...favorites, { id: stop.id, name: stop.name, routes: stop.routes }]);
      }
    },
    [favorites],
  );

  const removeFavorite = useCallback(
    (stopId) => {
      persist(favorites.filter((f) => f.id !== stopId));
    },
    [favorites],
  );

  const isFavorite = useCallback(
    (stopId) => favorites.some((f) => f.id === stopId),
    [favorites],
  );

  return (
    <FavoritesContext.Provider value={{ favorites, addFavorite, removeFavorite, isFavorite }}>
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavorites() {
  const ctx = useContext(FavoritesContext);
  if (!ctx) throw new Error('useFavorites must be inside FavoritesProvider');
  return ctx;
}
