import { useEffect, useRef, useState } from 'react';
import { fetchVehiclePositions } from '../services/metroTransitApi';

const POLL_INTERVAL = 20_000;
const FRAME_RATE = 16; // ~60fps

/**
 * Polls live vehicle positions and linearly interpolates between snapshots
 * so buses glide smoothly instead of jumping every 20 seconds.
 *
 * Returns { vehicles } — the current interpolated array, updated each frame.
 */
export function useInterpolatedVehicles() {
  const [vehicles, setVehicles] = useState([]);
  const prevSnapshot = useRef(new Map());
  const currSnapshot = useRef(new Map());
  const snapshotTime = useRef(0);

  useEffect(() => {
    let cancelled = false;
    snapshotTime.current = performance.now();

    async function poll() {
      const data = await fetchVehiclePositions();
      if (cancelled || !data || data.length === 0) return;
      prevSnapshot.current = currSnapshot.current.size
        ? currSnapshot.current
        : new Map(data.map((v) => [v.vehicleId, v]));
      currSnapshot.current = new Map(data.map((v) => [v.vehicleId, v]));
      snapshotTime.current = performance.now();
    }

    poll();
    const pollId = setInterval(poll, POLL_INTERVAL);

    let frameId;
    function animate() {
      const elapsed = performance.now() - snapshotTime.current;
      const t = Math.min(1, elapsed / POLL_INTERVAL);
      const next = [];
      currSnapshot.current.forEach((curr, vid) => {
        const prev = prevSnapshot.current.get(vid) || curr;
        // If the vehicle has polyline data (mock buses), walk along the
        // polyline between prev._progress and curr._progress so the bus
        // traces the actual route geometry instead of cutting corners.
        if (curr._polyline && typeof curr._progress === 'number') {
          const prog =
            (prev._progress ?? curr._progress) +
            ((curr._progress - (prev._progress ?? curr._progress)) * t);
          const pts = curr._polyline;
          const fIdx = prog * (pts.length - 1);
          const i0 = Math.max(0, Math.min(pts.length - 2, Math.floor(fIdx)));
          const segT = fIdx - i0;
          const [a0, b0] = pts[i0];
          const [a1, b1] = pts[i0 + 1];
          next.push({
            ...curr,
            lat: a0 + (a1 - a0) * segT,
            lng: b0 + (b1 - b0) * segT,
          });
        } else {
          next.push({
            ...curr,
            lat: prev.lat + (curr.lat - prev.lat) * t,
            lng: prev.lng + (curr.lng - prev.lng) * t,
          });
        }
      });
      setVehicles(next);
      frameId = setTimeout(animate, FRAME_RATE);
    }
    animate();

    return () => {
      cancelled = true;
      clearInterval(pollId);
      clearTimeout(frameId);
    };
  }, []);

  return { vehicles };
}
