import { useState, useEffect, useRef } from 'react';
import { searchStops } from '../services/metroTransitApi';

function SearchBar({ onSelectStop }) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const wrapperRef = useRef(null);

  useEffect(() => {
    if (query.trim().length >= 2) {
      setSuggestions(searchStops(query));
      setShowDropdown(true);
    } else {
      setSuggestions([]);
      setShowDropdown(false);
    }
  }, [query]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleSelect = (stop) => {
    setQuery(stop.name);
    setShowDropdown(false);
    onSelectStop(stop);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (suggestions.length > 0) handleSelect(suggestions[0]);
  };

  return (
    <div ref={wrapperRef} className="relative w-full">
      <form onSubmit={handleSubmit}>
        <div className="flex rounded-xl shadow-lg overflow-hidden bg-white dark:bg-gray-800 ring-1 ring-gray-200 dark:ring-gray-700">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => suggestions.length > 0 && setShowDropdown(true)}
            placeholder="Where are you going? e.g. Memorial Union"
            className="flex-1 px-4 py-3 text-sm bg-transparent outline-none placeholder-gray-500 dark:placeholder-gray-400 dark:text-white"
            aria-label="Search for a bus stop or destination"
            id="metro-search-input"
          />
          <button
            type="submit"
            className="px-5 bg-madison-red text-white text-sm font-semibold hover:bg-madison-dark transition-colors"
          >
            Search
          </button>
        </div>
      </form>

      {/* Suggestions dropdown */}
      {showDropdown && suggestions.length > 0 && (
        <ul className="absolute left-0 right-0 mt-1 bg-white dark:bg-gray-800 rounded-xl shadow-xl ring-1 ring-gray-200 dark:ring-gray-700 overflow-hidden z-20 max-h-64 overflow-y-auto">
          {suggestions.map((stop) => (
            <li key={stop.id}>
              <button
                type="button"
                onClick={() => handleSelect(stop)}
                className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex justify-between items-center"
              >
                <span className="font-medium dark:text-white">{stop.name}</span>
                <span className="text-xs text-gray-400">{stop.routes.join(', ')}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

    </div>
  );
}

export default SearchBar;
