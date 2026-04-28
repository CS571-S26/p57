import { useFavorites } from '../context/FavoritesContext';

/**
 * Shared popup body for any stop marker. Renders the stop name, a couple
 * action buttons (Plan trip / Save), and an optional "Stop X of Y" hint
 * for the route-overlay variant.
 *
 * Lives in its own component so we can read `useFavorites` once per popup
 * — Leaflet popups are React-rendered children, so context just works.
 */
function StopPopupContent({ stop, onSelectStop, hint, endpointHint }) {
  const { isFavorite, addFavorite, removeFavorite } = useFavorites();
  const saved = isFavorite(stop.id);

  const handleSave = (e) => {
    e.stopPropagation();
    if (saved) removeFavorite(stop.id);
    else addFavorite(stop);
  };

  return (
    <div style={{ minWidth: 180 }}>
      <strong style={{ display: 'block', marginBottom: 2 }}>{stop.name}</strong>
      {endpointHint && (
        <span
          style={{
            display: 'block',
            fontSize: 11,
            color: '#6b7280',
            marginBottom: 2,
          }}
        >
          {endpointHint}
        </span>
      )}
      {hint && (
        <span style={{ display: 'block', fontSize: 11, color: '#9ca3af' }}>
          {hint}
        </span>
      )}
      <div style={{ marginTop: 6, display: 'flex', gap: 6 }}>
        {onSelectStop && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onSelectStop(stop);
            }}
            style={{
              padding: '3px 8px',
              background: '#c5050c',
              color: '#fff',
              border: 0,
              borderRadius: 4,
              fontSize: 11,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Plan trip to here
          </button>
        )}
        <button
          type="button"
          onClick={handleSave}
          aria-pressed={saved}
          aria-label={saved ? `Unsave ${stop.name}` : `Save ${stop.name}`}
          style={{
            padding: '3px 8px',
            background: saved ? '#fef9c3' : '#fff',
            color: saved ? '#a16207' : '#374151',
            border: '1px solid #d1d5db',
            borderRadius: 4,
            fontSize: 11,
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 4,
          }}
        >
          <span aria-hidden="true">{saved ? '★' : '☆'}</span>
          {saved ? 'Saved' : 'Save'}
        </button>
      </div>
    </div>
  );
}

export default StopPopupContent;
