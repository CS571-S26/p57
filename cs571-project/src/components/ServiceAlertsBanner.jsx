import { useEffect, useState } from 'react';
import { fetchServiceAlerts } from '../services/metroTransitApi';

const DISMISSED_KEY = 'metro_dismissed_alerts';
const REFRESH_INTERVAL = 5 * 60 * 1000;

function loadDismissed() {
  try {
    return new Set(JSON.parse(localStorage.getItem(DISMISSED_KEY)) || []);
  } catch {
    return new Set();
  }
}

/**
 * Displays live Madison Metro service alerts pulled from the GTFS-RT
 * /alerts feed. Each alert can be dismissed (persisted in localStorage).
 */
function ServiceAlertsBanner() {
  const [alerts, setAlerts] = useState([]);
  const [dismissed, setDismissed] = useState(loadDismissed);
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const data = await fetchServiceAlerts();
      if (!cancelled) setAlerts(data);
    }
    load();
    const id = setInterval(load, REFRESH_INTERVAL);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  const dismiss = (id) => {
    const next = new Set(dismissed);
    next.add(id);
    setDismissed(next);
    localStorage.setItem(DISMISSED_KEY, JSON.stringify([...next]));
  };

  const visible = alerts.filter((a) => !dismissed.has(a.id));
  if (visible.length === 0) return null;

  return (
    <aside
      className="bg-amber-50 dark:bg-amber-900/30 border-b border-amber-200 dark:border-amber-800"
      aria-label="Service alerts"
    >
      <ul className="max-w-7xl mx-auto px-4 py-2 space-y-1">
        {visible.slice(0, 3).map((alert) => {
          const expanded = expandedId === alert.id;
          return (
            <li
              key={alert.id}
              className="flex items-start gap-3 text-sm text-amber-900 dark:text-amber-100"
            >
              <svg
                aria-hidden="true"
                className="w-4 h-4 mt-0.5 flex-shrink-0"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M12 2L1 21h22L12 2zm0 6l7.53 13H4.47L12 8zm-1 3v4h2v-4h-2zm0 6v2h2v-2h-2z" />
              </svg>
              <div className="flex-1 min-w-0">
                <button
                  type="button"
                  onClick={() => setExpandedId(expanded ? null : alert.id)}
                  className="text-left font-semibold hover:underline"
                  aria-expanded={expanded}
                  aria-controls={`alert-body-${alert.id}`}
                >
                  {alert.header || 'Service alert'}
                  {alert.routeIds.length > 0 && (
                    <span className="ml-2 text-xs font-normal opacity-80">
                      ({alert.routeIds.join(', ')})
                    </span>
                  )}
                </button>
                {expanded && alert.body && (
                  <p
                    id={`alert-body-${alert.id}`}
                    className="mt-1 text-xs opacity-90"
                  >
                    {alert.body}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => dismiss(alert.id)}
                className="flex-shrink-0 p-1 rounded hover:bg-amber-100 dark:hover:bg-amber-800 transition-colors"
                aria-label={`Dismiss alert: ${alert.header || alert.id}`}
              >
                <svg
                  aria-hidden="true"
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </li>
          );
        })}
      </ul>
    </aside>
  );
}

export default ServiceAlertsBanner;
