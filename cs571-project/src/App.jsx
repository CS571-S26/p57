import { Routes, Route } from 'react-router-dom';
import BusNavBar from './components/BusNavBar';
import LiveMap from './pages/LiveMap';
import TripPlanner from './pages/TripPlanner';
import './App.css';

function App() {
  return (
    <>
      <BusNavBar />
      <Routes>
        <Route path="/" element={<LiveMap />} />
        <Route path="/planner" element={<TripPlanner />} />
      </Routes>
    </>
  );
}

export default App;
