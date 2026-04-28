import { useEffect, useState } from 'react';
import { planTrip, walkOnlyMinutes, PLANNER_CONSTANTS } from '../services/tripPlanner';

const fmt = (min) => {
  if (min == null) return '—';
  if (min < 1) return '<1 min';
  return `${Math.round(min)} min`;
};

function PlanRow({ plan, expanded, onToggle, onSelect }) {
  return (
    <li className="border-t border-gray-100 dark:border-gray-700 first:border-t-0">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className="w-full text-left px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span
            className="flex-shrink-0 inline-block px-2 py-0.5 rounded text-xs font-bold text-white"
            style={{ backgroundColor: plan.route.color }}
          >
            {plan.route.shortName}
          </span>
          <span className="flex-1 text-sm text-gray-800 dark:text-gray-200 truncate">
            Toward {plan.direction.headsign || plan.direction.directionName || `Dir ${plan.direction.id}`}
          </span>
          <span className="flex-shrink-0 text-sm font-bold text-madison-red dark:text-red-400">
            {fmt(plan.totalMin)}
          </span>
        </div>
        {!expanded && (
          <p className="text-[11px] text-gray-600 dark:text-gray-400 mt-0.5">
            walk {fmt(plan.walkStartMin)} · wait {fmt(plan.waitMin)}
            {plan.hasLiveEta && (
              <span className="ml-1 text-green-600 dark:text-green-400">live</span>
            )}{' '}
            · ride {fmt(plan.rideMin)} · walk {fmt(plan.walkEndMin)}
          </p>
        )}
      </button>

      {expanded && (
        <div className="px-3 pb-3 pt-0 space-y-2 text-sm">
          {/* Leg 1: walk to board stop */}
          <div className="flex gap-2">
            <span aria-hidden="true" className="mt-0.5 text-gray-400">🚶</span>
            <div className="flex-1">
              <p className="text-gray-800 dark:text-gray-200">
                Walk to <strong>{plan.boardStop.name}</strong>
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                {Math.round(plan.boardWalkKm * 1000)} m · {fmt(plan.walkStartMin)}
              </p>
            </div>
          </div>

          {/* Leg 2: board, wait, ride */}
          <div className="flex gap-2">
            <span
              aria-hidden="true"
              className="mt-0.5 inline-flex items-center justify-center w-5 h-5 rounded text-[10px] font-bold text-white"
              style={{ backgroundColor: plan.route.color }}
            >
              {plan.route.shortName}
            </span>
            <div className="flex-1">
              <p className="text-gray-800 dark:text-gray-200">
                Board Route {plan.route.shortName}{' '}
                <span className="text-gray-600 dark:text-gray-400">
                  toward {plan.direction.headsign || plan.direction.directionName}
                </span>
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                Next bus: {fmt(plan.waitMin)}
                {plan.hasLiveEta ? (
                  <span className="ml-1 text-green-600 dark:text-green-400 font-medium">
                    (live)
                  </span>
                ) : (
                  <span className="ml-1 text-gray-500 dark:text-gray-400">
                    (estimated)
                  </span>
                )}
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                Ride {plan.numStops} stop{plan.numStops === 1 ? '' : 's'} · {fmt(plan.rideMin)}
              </p>
            </div>
          </div>

          {/* Leg 3: alight + walk */}
          <div className="flex gap-2">
            <span aria-hidden="true" className="mt-0.5 text-gray-400">🚶</span>
            <div className="flex-1">
              <p className="text-gray-800 dark:text-gray-200">
                Get off at <strong>{plan.alightStop.name}</strong>, walk to your destination
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                {Math.round(plan.alightWalkKm * 1000)} m · {fmt(plan.walkEndMin)}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onSelect}
            className="w-full mt-2 px-3 py-1.5 text-sm font-semibold rounded-lg bg-madison-red text-white hover:bg-madison-dark transition-colors"
          >
            Show this trip on the map
          </button>
        </div>
      )}
    </li>
  );
}

/**
 * Trip-planner result list. Top plan opens expanded; alternates collapsed.
 * Selecting a plan calls `onSelectPlan(plan)` so Home can highlight the
 * board → alight segment on the route overlay.
 */
function TripPlannerSheet({ origin, destination, onSelectPlan, onSelectStop }) {
  const [plans, setPlans] = useState([]);
  const [hubSuggestions, setHubSuggestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedIdx, setExpandedIdx] = useState(0);
  const [walkOnly, setWalkOnly] = useState(null);

  useEffect(() => {
    if (!origin || !destination) return;
    let cancelled = false;
    setLoading(true);
    setExpandedIdx(0);

    // Short-circuit when the destination is essentially walking distance
    const walkMin = walkOnlyMinutes(origin, destination);
    setWalkOnly(walkMin);

    planTrip({ origin, destination }).then((result) => {
      if (cancelled) return;
      setPlans(result.plans || []);
      setHubSuggestions(result.hubSuggestions || []);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [origin, destination]);

  // When the first plan loads, default to highlighting it on the map
  useEffect(() => {
    if (plans.length > 0) onSelectPlan?.(plans[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plans]);

  if (!origin) {
    return (
      <p className="text-sm text-gray-700 dark:text-gray-300 px-3 py-2">
        Share your location to plan a trip from where you are.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <div className="px-3 pt-1">
        <p className="text-[11px] uppercase tracking-wider font-semibold text-gray-600 dark:text-gray-400">
          Trip plan
        </p>
        <p className="text-[11px] text-gray-500 dark:text-gray-400">
          Direct routes only · max {Math.round(PLANNER_CONSTANTS.MAX_WALK_KM * 1000)} m walk
        </p>
      </div>

      {/* Walk-only short-circuit */}
      {walkOnly != null && walkOnly < 8 && (
        <div className="mx-3 px-3 py-2 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-sm text-blue-900 dark:text-blue-100">
          🚶 It's a {fmt(walkOnly)} walk. Probably faster than waiting for the bus.
        </div>
      )}

      {loading && (
        <p className="text-sm text-gray-600 dark:text-gray-400 px-3 py-2">
          Planning trip…
        </p>
      )}

      {!loading && plans.length === 0 && (
        <div className="mx-3 space-y-2">
          <div className="px-3 py-2 rounded-lg bg-amber-50 dark:bg-amber-900/30 text-sm text-amber-900 dark:text-amber-100">
            No single Madison Metro route connects these stops within walking
            distance. Madison's system is hub-and-spoke — try planning a leg to
            one of the transfer points first.
          </div>
          {hubSuggestions.length > 0 && (
            <div>
              <p className="text-[11px] uppercase tracking-wider font-semibold text-gray-600 dark:text-gray-400 mb-1 px-1">
                Suggested hubs
              </p>
              <ul className="list-none p-0 m-0 space-y-1">
                {hubSuggestions.map((h) => (
                  <li key={h.stop.id}>
                    <button
                      type="button"
                      onClick={() => onSelectStop?.(h.stop)}
                      className="w-full text-left px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">
                        {h.stop.name}
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        {Math.round(h.distFromOriginKm * 1000)} m from you · {Math.round(h.distFromDestinationKm * 1000)} m from destination
                      </p>
                    </button>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-[11px] text-gray-500 dark:text-gray-400 px-1">
                Tap a hub to plan a trip there. Once you arrive, plan a second trip onward.
              </p>
            </div>
          )}
        </div>
      )}

      {!loading && plans.length > 0 && (
        <ul className="list-none p-0 m-0 rounded-lg overflow-hidden bg-gray-50 dark:bg-gray-900/30 mx-1">
          {plans.map((plan, i) => (
            <PlanRow
              key={`${plan.route.id}|${plan.direction.id}|${plan.boardStop.id}|${plan.alightStop.id}`}
              plan={plan}
              expanded={expandedIdx === i}
              onToggle={() => setExpandedIdx(expandedIdx === i ? -1 : i)}
              onSelect={() => onSelectPlan?.(plan)}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

export default TripPlannerSheet;
