import { useState } from 'react';
import { Form, Button, InputGroup } from 'react-bootstrap';

function DestinationSearch({ onSearch }) {
  const [query, setQuery] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (query.trim()) {
      onSearch(query.trim());
    }
  };

  return (
    <Form onSubmit={handleSubmit} className="destination-search mb-3">
      <Form.Label className="fw-semibold">Where are you going?</Form.Label>
      <InputGroup>
        <Form.Control
          type="text"
          placeholder="e.g. Memorial Union, Capitol Square..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <Button variant="primary" type="submit">
          Search
        </Button>
      </InputGroup>
    </Form>
  );
}

export default DestinationSearch;
