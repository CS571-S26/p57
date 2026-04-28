import { useEffect, useState } from 'react';
import { fetchVehiclePositions } from '../services/metroTransitApi';

const POLL_INTERVAL = 15_000;

/**
 * Polls live vehicle positions on a fixed cadence and snaps the markers
 * to the new positions on each poll. No per-frame interpolation — the
 * GTFS-RT samples are authoritative, and tweening between two distant
 * GPS points cuts road corners (and can briefly run backwards when a
 * later sample lands behind the previous one).
 *
 * Name kept for backward compatibility with existing imports.
 */
export function useInterpolatedVehicles() {
  const [vehicles, setVehicles] = useState([]);

  useEffect(() => {
    let cancelled = false;
    async function poll() {
      const data = await fetchVehiclePositions();
      if (cancelled || !data || data.length === 0) return;
      setVehicles(data);
    }
    poll();
    const id = setInterval(poll, POLL_INTERVAL);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  return { vehicles };
}
