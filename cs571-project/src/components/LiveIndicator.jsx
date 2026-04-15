import { useState, useEffect } from 'react';
import { checkApiHealth } from '../services/metroTransitApi';

const STATUS = {
  green: { color: 'bg-green-500', ring: 'ring-green-400/40', label: 'Live' },
  yellow: { color: 'bg-yellow-400', ring: 'ring-yellow-400/40', label: 'Slow' },
  red: { color: 'bg-red-500', ring: 'ring-red-400/40', label: 'Offline' },
};

function LiveIndicator() {
  const [status, setStatus] = useState('red');

  useEffect(() => {
    checkApiHealth().then(setStatus);
    const id = setInterval(() => checkApiHealth().then(setStatus), 60_000);
    return () => clearInterval(id);
  }, []);

  const s = STATUS[status];

  return (
    <span
      className="inline-flex items-center gap-1.5 text-xs font-medium"
      title={`Metro API: ${s.label}`}
    >
      <span className={`relative flex h-2.5 w-2.5`}>
        {status === 'green' && (
          <span
            className={`absolute inline-flex h-full w-full animate-ping rounded-full ${s.color} opacity-60`}
          />
        )}
        <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${s.color}`} />
      </span>
      {s.label}
    </span>
  );
}

export default LiveIndicator;
