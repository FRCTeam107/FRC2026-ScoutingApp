import { Link, useLocation } from 'react-router-dom';
import { SyncStatus } from './SyncStatus';
import { useTheme } from '../../hooks/useTheme';
import './Header.css';

export function Header() {
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="app-header">
      <div className="header-left">
        <Link to="/" className="logo">
          Team 107 Scouting
        </Link>
        {location.pathname !== '/' && (
          <Link to="/" className="back-link">
            Switch Role
          </Link>
        )}
      </div>
      <div className="header-right">
        <button
          className="theme-toggle-btn"
          onClick={toggleTheme}
          title={theme === 'pink' ? 'Switch to dark mode' : 'Switch to pink mode'}
        >
          {theme === 'pink' ? '🌑 Dark' : '🩷 Pink'}
        </button>
        <SyncStatus />
      </div>
    </header>
  );
}
