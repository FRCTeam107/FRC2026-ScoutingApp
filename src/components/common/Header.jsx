import { Link, useLocation } from 'react-router-dom';
import { SyncStatus } from './SyncStatus';
import './Header.css';

export function Header() {
  const location = useLocation();

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
      <SyncStatus />
    </header>
  );
}
