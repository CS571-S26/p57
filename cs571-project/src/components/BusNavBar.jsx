import { Link, useLocation } from 'react-router-dom';
import { useState } from 'react';
import LiveIndicator from './LiveIndicator';
import { useTheme } from '../context/ThemeContext';

const NAV_LINKS = [
  { to: '/', label: 'Live Map' },
  { to: '/routes', label: 'Routes' },
  { to: '/favorites', label: 'Saved' },
];

function BusNavBar() {
  const location = useLocation();
  const { dark, toggle } = useTheme();
  const [open, setOpen] = useState(false);

  return (
    <nav className="bg-madison-red shadow-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 flex items-center justify-between h-14">
        {/* Brand */}
        <Link to="/" className="flex items-center gap-2 text-white no-underline">
          <span className="text-lg font-bold tracking-tight">Madison Metro Tracker</span>
          <LiveIndicator />
        </Link>

        {/* Desktop links */}
        <div className="hidden sm:flex items-center gap-1">
          {NAV_LINKS.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors no-underline ${
                location.pathname === l.to
                  ? 'bg-white/20 text-white'
                  : 'text-white/80 hover:text-white hover:bg-white/10'
              }`}
            >
              {l.label}
            </Link>
          ))}
          <button
            onClick={toggle}
            className="ml-2 p-1.5 rounded-md text-white/80 hover:bg-white/10 transition-colors"
            aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {dark ? (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m8.66-13.66l-.71.71M4.05 19.95l-.71.71M21 12h-1M4 12H3m16.66 7.66l-.71-.71M4.05 4.05l-.71-.71M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
            ) : (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9 9 0 1020.354 15.354z" /></svg>
            )}
          </button>
        </div>

        {/* Mobile hamburger */}
        <button
          onClick={() => setOpen(!open)}
          className="sm:hidden p-1.5 text-white"
          aria-label="Toggle menu"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            {open ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </div>

      {/* Mobile dropdown */}
      {open && (
        <div className="sm:hidden border-t border-white/20 px-4 pb-3 pt-2 space-y-1">
          {NAV_LINKS.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              onClick={() => setOpen(false)}
              className={`block px-3 py-2 rounded-md text-sm font-medium no-underline ${
                location.pathname === l.to
                  ? 'bg-white/20 text-white'
                  : 'text-white/80 hover:text-white hover:bg-white/10'
              }`}
            >
              {l.label}
            </Link>
          ))}
          <button
            onClick={toggle}
            className="w-full text-left px-3 py-2 rounded-md text-sm font-medium text-white/80 hover:text-white hover:bg-white/10"
          >
            {dark ? 'Light Mode' : 'Night Bus Mode'}
          </button>
        </div>
      )}
    </nav>
  );
}

export default BusNavBar;
