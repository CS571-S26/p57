import { useState } from 'react';
import { Container, Row, Col, Card, ListGroup } from 'react-bootstrap';
import DestinationSearch from '../components/DestinationSearch';
import BusDetailCard from '../components/BusDetailCard';

const SAMPLE_RESULTS = [
  {
    route: '80',
    nextStop: 'Bascom Hill',
    eta: 4,
    occupancy: 'Low',
    direction: 'Eastbound',
  },
  {
    route: '02',
    nextStop: 'State St & Lake St',
    eta: 9,
    occupancy: 'Medium',
    direction: 'Westbound',
  },
  {
    route: '28',
    nextStop: 'Engineering Hall',
    eta: 12,
    occupancy: 'High',
    direction: 'Northbound',
  },
];

function TripPlanner() {
  const [results, setResults] = useState([]);
  const [selectedBus, setSelectedBus] = useState(null);

  const handleSearch = (query) => {
    // TODO: Replace with real API call via metroTransitApi.searchDestinations(query)
    setResults(SAMPLE_RESULTS);
    setSelectedBus(null);
  };

  return (
    <Container className="py-4">
      <h2 className="mb-3">Trip Planner</h2>
      <Row>
        <Col md={7}>
          <DestinationSearch onSearch={handleSearch} />

          {results.length > 0 && (
            <Card>
              <Card.Header>Nearby Buses</Card.Header>
              <ListGroup variant="flush">
                {results.map((bus, idx) => (
                  <ListGroup.Item
                    key={idx}
                    action
                    active={selectedBus === idx}
                    onClick={() => setSelectedBus(idx)}
                  >
                    <strong>Route {bus.route}</strong> — {bus.nextStop} (
                    {bus.eta} min)
                  </ListGroup.Item>
                ))}
              </ListGroup>
            </Card>
          )}
        </Col>
        <Col md={5}>
          <h5 className="mb-3">Details</h5>
          <BusDetailCard
            bus={selectedBus !== null ? results[selectedBus] : null}
          />
        </Col>
      </Row>
    </Container>
  );
}

export default TripPlanner;
