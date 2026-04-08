import { Navbar, Nav, Container } from 'react-bootstrap';
import { Link, useLocation } from 'react-router-dom';

function BusNavBar() {
  const location = useLocation();

  return (
    <Navbar bg="dark" variant="dark" expand="sm" className="shadow-sm">
      <Container>
        <Navbar.Brand as={Link} to="/">
          Bus Tracker
        </Navbar.Brand>
        <Navbar.Toggle aria-controls="main-nav" />
        <Navbar.Collapse id="main-nav">
          <Nav className="ms-auto">
            <Nav.Link
              as={Link}
              to="/"
              active={location.pathname === '/'}
            >
              Live Map
            </Nav.Link>
            <Nav.Link
              as={Link}
              to="/planner"
              active={location.pathname === '/planner'}
            >
              Trip Planner
            </Nav.Link>
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
}

export default BusNavBar;
