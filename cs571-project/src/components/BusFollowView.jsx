import Map3D from './Map3D';

/**
 * Modal overlay that shows a single bus in a zoomed, tilted 3D view
 * with the camera following its real-time position.
 */
function BusFollowView({ vehicle, onClose }) {
  if (!vehicle) return null;

  return (
    <div
      className="fixed inset-0 z-[2000] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-5xl h-[80vh] bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between p-4 bg-gradient-to-b from-black/60 to-transparent text-white">
          <div>
            <div className="text-xs uppercase tracking-wider opacity-80">
              Following live
            </div>
            <div className="text-lg font-bold">
              Route {vehicle.routeId} · Bus #{vehicle.vehicleId}
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-full bg-white/20 hover:bg-white/30 backdrop-blur p-2 transition-colors"
            aria-label="Close 3D view"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <Map3D
          followVehicleId={vehicle.vehicleId}
          selectedRoute={vehicle.routeId}
          center={[vehicle.lng, vehicle.lat]}
          zoom={17}
          pitch={67}
          className="h-full"
        />
      </div>
    </div>
  );
}

export default BusFollowView;
