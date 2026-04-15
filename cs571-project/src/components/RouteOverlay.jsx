import { memo, useMemo } from 'react';
import { Polyline, CircleMarker, Popup, useMap } from 'react-leaflet';
import { useEffect } from 'react';
import L from 'leaflet';
import shapesData from '../assets/shapes.json';
import stopsData from '../assets/stops.json';

const stopsById = Object.fromEntries(stopsData.map((s) => [s.id, s]));

/**
 * FlyToBounds — smoothly pans/zooms the map to fit the given coordinates.
 */
function FlyToBounds({ coords }) {
  const map = useMap();
  useEffect(() => {
    if (coords.length > 1) {
      const bounds = L.latLngBounds(coords);
      map.flyToBounds(bounds, { padding: [50, 50], duration: 0.8 });
    }
  }, [coords, map]);
  return null;
}

/**
 * Computes the highlighted segment of a route between two stop IDs.
 * Returns a subset of coordinates between the start and end stop positions.
 */
function getSegmentCoords(shape, fromStopId, toStopId) {
  const stopIds = shape.stops;
  const fromIdx = stopIds.indexOf(fromStopId);
  const toIdx = stopIds.indexOf(toStopId);

  if (fromIdx === -1 || toIdx === -1) return null;

  const startStopIdx = Math.min(fromIdx, toIdx);
  const endStopIdx = Math.max(fromIdx, toIdx);

  // Map stop indices to approximate coordinate indices
  const coords = shape.coords;
  const totalCoords = coords.length;
  const totalStops = stopIds.length;

  // Distribute stops evenly across the coordinate array
  const startCoordIdx = Math.round((startStopIdx / Math.max(totalStops - 1, 1)) * (totalCoords - 1));
  const endCoordIdx = Math.round((endStopIdx / Math.max(totalStops - 1, 1)) * (totalCoords - 1));

  return coords.slice(startCoordIdx, endCoordIdx + 1);
}

/**
 * RouteOverlay renders:
 * 1) A "shadow" polyline of the full route (low opacity)
 * 2) Optionally, a "highlighted" polyline for the active trip segment (bold)
 * 3) Stop markers along the route
 */
const RouteOverlay = memo(function RouteOverlay({
  routeId,
  fromStopId = null,
  toStopId = null,
}) {
  const shape = shapesData[routeId];

  const segment = useMemo(() => {
    if (!shape || !fromStopId || !toStopId) return null;
    return getSegmentCoords(shape, fromStopId, toStopId);
  }, [shape, fromStopId, toStopId]);

  if (!shape) return null;

  const hasTrip = segment && segment.length > 1;
  const routeColor = shape.color;
  const flyCoords = hasTrip ? segment : shape.coords;

  // Resolve stop objects for this route
  const routeStops = shape.stops
    .map((id) => stopsById[id])
    .filter(Boolean);

  return (
    <>
      <FlyToBounds coords={flyCoords} />

      {/* Layer 1: Full route shadow (always visible, dimmed when trip is active) */}
      <Polyline
        positions={shape.coords}
        pathOptions={{
          color: routeColor,
          weight: hasTrip ? 4 : 6,
          opacity: hasTrip ? 0.25 : 0.85,
          lineCap: 'round',
          lineJoin: 'round',
        }}
      />

      {/* Layer 2: Highlighted trip segment (bold, on top) */}
      {hasTrip && (
        <Polyline
          positions={segment}
          pathOptions={{
            color: routeColor,
            weight: 8,
            opacity: 0.95,
            lineCap: 'round',
            lineJoin: 'round',
          }}
        />
      )}

      {/* Stop markers along the route */}
      {routeStops.map((stop, idx) => {
        // Determine if this stop is in the active segment
        const isInSegment =
          hasTrip && fromStopId && toStopId
            ? (() => {
                const stopIds = shape.stops;
                const fi = stopIds.indexOf(fromStopId);
                const ti = stopIds.indexOf(toStopId);
                const si = stopIds.indexOf(stop.id);
                const lo = Math.min(fi, ti);
                const hi = Math.max(fi, ti);
                return si >= lo && si <= hi;
              })()
            : true;

        const isEndpoint =
          stop.id === fromStopId || stop.id === toStopId;

        return (
          <CircleMarker
            key={stop.id}
            center={[stop.lat, stop.lng]}
            radius={isEndpoint ? 8 : 5}
            pathOptions={{
              fillColor: isEndpoint ? '#fff' : routeColor,
              fillOpacity: isInSegment ? 1 : 0.4,
              color: isEndpoint ? routeColor : '#fff',
              weight: isEndpoint ? 3 : 1.5,
            }}
          >
            <Popup>
              <div className="text-sm">
                <strong>{stop.name}</strong>
                {isEndpoint && (
                  <span className="block text-xs text-gray-500 mt-0.5">
                    {stop.id === fromStopId ? 'Board here' : 'Get off here'}
                  </span>
                )}
                <span className="block text-xs text-gray-400 mt-0.5">
                  Stop {idx + 1} of {routeStops.length}
                </span>
              </div>
            </Popup>
          </CircleMarker>
        );
      })}
    </>
  );
});

export default RouteOverlay;
export { getSegmentCoords };
