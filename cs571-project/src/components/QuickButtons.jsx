import { useMemo } from 'react';
import stopsData from '../assets/stops.json';

// Real GTFS stop IDs for major Madison hubs
const QUICK_STOPS = [
  { id: '2847', label: 'Capitol Square' },
  { id: '1', label: 'Langdon & Park' },
  { id: '595', label: 'Observatory & Walnut' },
  { id: '793', label: 'Highland & University' },
  { id: '716', label: 'Hilldale' },
  { id: '1441', label: 'West Towne Mall' },
  { id: '2267', label: 'East Towne' },
];

const stopsById = Object.fromEntries(stopsData.map((s) => [s.id, s]));

function QuickButtons({ onSelect }) {
  const buttons = useMemo(
    () =>
      QUICK_STOPS.map((q) => ({ ...q, stop: stopsById[q.id] })).filter(
        (q) => q.stop,
      ),
    [],
  );

  return (
    <div className="flex flex-wrap gap-2">
      {buttons.map((q) => (
        <button
          key={q.id}
          onClick={() => onSelect(q.stop)}
          className="px-3 py-1.5 text-xs font-medium rounded-full border border-madison-red/30 text-madison-red dark:text-red-400 dark:border-red-400/30 hover:bg-madison-red hover:text-white dark:hover:bg-red-500 dark:hover:text-white transition-colors"
          aria-label={`Go to ${q.label}`}
        >
          {q.label}
        </button>
      ))}
    </div>
  );
}

export default QuickButtons;
