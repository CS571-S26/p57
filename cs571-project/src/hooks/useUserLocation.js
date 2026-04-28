import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Browser geolocation hook.
 *
 * Returns:
 *   location  — { lat, lng, accuracy } | null
 *   status    — 'idle' | 'loading' | 'granted' | 'denied' | 'unavailable'
 *   error     — string | null
 *   request() — start a watch (asks the user once, then keeps tracking)
 *   stop()    — stop watching
 *
 * Permission is only requested when `request()` is called, so the page
 * doesn't trigger a browser prompt on load.
 */
export function useUserLocation() {
  const [location, setLocation] = useState(null);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState(null);
  const watchIdRef = useRef(null);

  const stop = useCallback(() => {
    if (watchIdRef.current != null && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchIdRef.current);
    }
    watchIdRef.current = null;
  }, []);

  const request = useCallback(() => {
    if (!('geolocation' in navigator)) {
      setStatus('unavailable');
      setError('Geolocation is not supported in this browser.');
      return;
    }
    if (watchIdRef.current != null) return; // already watching
    setStatus('loading');
    setError(null);
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        setLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        });
        setStatus('granted');
      },
      (err) => {
        setStatus(err.code === err.PERMISSION_DENIED ? 'denied' : 'unavailable');
        setError(err.message || 'Could not get your location.');
        watchIdRef.current = null;
      },
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 30_000 },
    );
  }, []);

  useEffect(() => stop, [stop]);

  return { location, status, error, request, stop };
}
