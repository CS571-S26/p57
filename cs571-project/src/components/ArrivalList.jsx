import RouteCard from './RouteCard';

function ArrivalList({ arrivals, onSelect }) {
  if (!arrivals || arrivals.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400 text-sm">
        No arrivals to display. Select a stop or route to get started.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {arrivals.map((item, idx) => (
        <RouteCard
          key={item.route?.id ?? idx}
          route={item.route}
          eta={item.eta}
          occupancy={item.occupancy}
          stopName={item.stopName}
          compact
          onClick={() => onSelect?.(item)}
        />
      ))}
    </div>
  );
}

export default ArrivalList;
