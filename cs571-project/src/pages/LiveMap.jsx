import { useState } from 'react';
import { Container, Row, Col } from 'react-bootstrap';
import MapContainer from '../components/MapContainer';
import RouteFilter from '../components/RouteFilter';
import BusDetailCard from '../components/BusDetailCard';

function LiveMap() {
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [selectedBus, setSelectedBus] = useState(null);

  const handleSelectRoute = (routeId) => {
    setSelectedRoute(routeId);
    setSelectedBus(null);
  };

  const handleSelectBus = (bus) => {
    setSelectedBus({
      route: bus.route,
      nextStop: 'University Ave & Charter St',
      eta: bus.eta,
      occupancy: 'Low',
      direction: bus.direction,
    });
  };

  return (
    <Container fluid className="py-3">
      <Row>
        <Col md={3}>
          <h5 className="mb-3">Routes</h5>
          <RouteFilter
            selectedRoute={selectedRoute}
            onSelectRoute={handleSelectRoute}
          />
        </Col>
        <Col md={6}>
          <MapContainer
            selectedRoute={selectedRoute}
            onSelectBus={handleSelectBus}
          />
        </Col>
        <Col md={3}>
          <h5 className="mb-3">Bus Details</h5>
          <BusDetailCard bus={selectedBus} />
        </Col>
      </Row>
    </Container>
  );
}

export default LiveMap;
