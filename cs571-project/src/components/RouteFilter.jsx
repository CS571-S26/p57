import { useState } from 'react';
import { Form, ListGroup } from 'react-bootstrap';

const SAMPLE_ROUTES = [
  { id: '01', name: 'A — Villager' },
  { id: '02', name: 'B — Crosstown' },
  { id: '03', name: 'C — Southtown' },
  { id: '04', name: 'D — East Transfer Point' },
  { id: '05', name: 'E — West Side' },
  { id: '06', name: 'F — Middleton – West Towne' },
  { id: '10', name: 'Route 10 — Inner Loop' },
  { id: '28', name: 'Route 28 — Campus Circulator' },
  { id: '80', name: 'Route 80 — Campus Shuttle' },
];

function RouteFilter({ selectedRoute, onSelectRoute }) {
  const [filter, setFilter] = useState('');

  const filtered = SAMPLE_ROUTES.filter((r) =>
    r.name.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div className="route-filter">
      <Form.Control
        type="text"
        placeholder="Filter routes..."
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        className="mb-2"
      />
      <ListGroup>
        {filtered.map((route) => (
          <ListGroup.Item
            key={route.id}
            action
            active={selectedRoute === route.id}
            onClick={() => onSelectRoute(route.id)}
          >
            {route.name}
          </ListGroup.Item>
        ))}
        {filtered.length === 0 && (
          <ListGroup.Item disabled className="text-muted">
            No routes match your filter.
          </ListGroup.Item>
        )}
      </ListGroup>
    </div>
  );
}

export default RouteFilter;
