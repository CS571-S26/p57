import { Card, Badge } from 'react-bootstrap';

const OCCUPANCY_COLORS = {
  Low: 'success',
  Medium: 'warning',
  High: 'danger',
};

function BusDetailCard({ bus }) {
  if (!bus) {
    return (
      <Card className="bus-detail-card text-center text-muted">
        <Card.Body>
          <p className="mb-0">Select a bus or stop to view details.</p>
        </Card.Body>
      </Card>
    );
  }

  return (
    <Card className="bus-detail-card shadow-sm">
      <Card.Header className="d-flex justify-content-between align-items-center">
        <strong>Route {bus.route}</strong>
        <Badge bg={OCCUPANCY_COLORS[bus.occupancy] || 'secondary'}>
          {bus.occupancy} occupancy
        </Badge>
      </Card.Header>
      <Card.Body>
        <p className="mb-1">
          <strong>Next Stop:</strong> {bus.nextStop}
        </p>
        <p className="mb-1">
          <strong>ETA:</strong> {bus.eta} min
        </p>
        <p className="mb-0">
          <strong>Direction:</strong> {bus.direction}
        </p>
      </Card.Body>
    </Card>
  );
}

export default BusDetailCard;
