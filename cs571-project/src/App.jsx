import { Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { DestinationProvider } from './context/DestinationContext';
import { FavoritesProvider } from './context/FavoritesContext';
import BusNavBar from './components/BusNavBar';
import Home from './pages/Home';
import RoutesGallery from './pages/RoutesGallery';
import Favorites from './pages/Favorites';
import './App.css';

function App() {
  return (
    <ThemeProvider>
      <DestinationProvider>
        <FavoritesProvider>
          <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-950">
            <BusNavBar />
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/routes" element={<RoutesGallery />} />
              <Route path="/favorites" element={<Favorites />} />
            </Routes>
          </div>
        </FavoritesProvider>
      </DestinationProvider>
    </ThemeProvider>
  );
}

export default App;
