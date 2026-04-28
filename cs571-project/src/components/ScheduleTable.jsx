import { useMemo, useState } from 'react';
import {
  getScheduleAt,
  formatTimeOfDay,
  dayTypeFor,
  getDirectionShort,
  getDirections,
  getStops,
} from '../services/metroTransitApi';

const DAY_TYPES = [
  { id: 'weekday', label: 'Weekday' },
  { id: 'saturday', label: 'Saturday' },
  { id: 'sunday', label: 'Sunday' },
];

function TimeChip({ sec, isNext, isPast }) {
  return (
    <span
      className={`inline-block px-2 py-0.5 text-xs rounded font-mono ${
        isNext
          ? 'bg-madison-red text-white font-bold'
          : isPast
            ? 'bg-gray-100 dark:bg-gray-900 text-gray-400 dark:text-gray-500 line-through'
            : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
      }`}
      title={isNext ? 'Next departure' : undefined}
    >
      {formatTimeOfDay(sec)}
    </span>
  );
}

/**
 * Full-day schedule table for one route, broken out by direction.
 * Day-type defaults to today's bucket (weekday/saturday/sunday) and can be
 * switched via tabs. If `stopId` is provided, the table shows times at that
 * stop only; otherwise it pulls a representative stop (middle of the route).
 */
function ScheduleTable({ routeId, stopId = null }) {
  const [dayType, setDayType] = useState(dayTypeFor());
  const directions = getDirections(routeId);

  // Pick a stop to query: explicit > midpoint of route's stops
  const fallbackStop = useMemo(() => {
    if (stopId) return stopId;
    const routeStops = getStops(routeId);
    if (!routeStops.length) return null;
    return routeStops[Math.floor(routeStops.length / 2)].id;
  }, [routeId, stopId]);

  const nowSec = useMemo(() => {
    const d = new Date();
    return d.getHours() * 3600 + d.getMinutes() * 60 + d.getSeconds();
  }, []);
  const isToday = dayType === dayTypeFor();

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mr-1">
          Schedule
        </span>
        <div role="tablist" aria-label="Day of week" className="flex rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden text-xs">
          {DAY_TYPES.map((dt) => {
            const active = dayType === dt.id;
            return (
              <button
                key={dt.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setDayType(dt.id)}
                className={`px-2.5 py-1 font-medium transition-colors ${
                  active
                    ? 'bg-madison-red text-white'
                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                {dt.label}
              </button>
            );
          })}
        </div>
      </div>

      {!fallbackStop ? (
        <p className="text-sm text-gray-600 dark:text-gray-400">No stops on this route to schedule.</p>
      ) : directions.length === 0 ? (
        <p className="text-sm text-gray-600 dark:text-gray-400">No direction metadata for this route.</p>
      ) : (
        <div className="space-y-3">
          {directions.map((dir) => {
            const departures = getScheduleAt(fallbackStop, routeId, dir.id, dayType);
            if (departures.length === 0) {
              return (
                <div key={dir.id}>
                  <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Toward {getDirectionShort(routeId, dir.id) || `Direction ${dir.id}`}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    No service in this direction on {dayType}.
                  </p>
                </div>
              );
            }
            const nextIdx = isToday
              ? departures.findIndex((s) => s >= nowSec)
              : -1;
            return (
              <div key={dir.id}>
                <div className="flex items-baseline justify-between mb-1">
                  <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                    Toward {getDirectionShort(routeId, dir.id) || `Direction ${dir.id}`}
                  </p>
                  <p className="text-[10px] text-gray-500 dark:text-gray-400">
                    {departures.length} departures
                  </p>
                </div>
                <div className="flex flex-wrap gap-1">
                  {departures.map((sec, i) => (
                    <TimeChip
                      key={i}
                      sec={sec}
                      isNext={isToday && i === nextIdx}
                      isPast={isToday && nextIdx !== -1 && i < nextIdx}
                    />
                  ))}
                </div>
                {isToday && nextIdx === -1 && (
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    No more buses today on this direction.
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default ScheduleTable;
