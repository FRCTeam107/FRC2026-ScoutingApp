import { Link, useLocation } from 'react-router-dom';
import { SyncStatus } from './SyncStatus';
import { Team107Dropdown } from './Team107Dropdown';
import './Header.css';

const SCOUTING_PATHS = ['/scouting', '/pit', '/match', '/analytics', '/drive', '/field', '/admin'];

export function Header() {
  const location = useLocation();
  const isScoutingArea = SCOUTING_PATHS.some(p => location.pathname.startsWith(p));
  const isSubPage = location.pathname !== '/' && location.pathname !== '/scouting';

  return (
    <header className="app-header">
      <div className="header-left">
        <Link to="/" className="logo">
          Team 107 Scouting
        </Link>
        {isScoutingArea && isSubPage && (
          <Link to="/scouting" className="back-link">
            Switch Role
          </Link>
        )}
      </div>
      <div className="header-right">
        {!isScoutingArea && <Team107Dropdown />}
        {isScoutingArea && <Link to="/" className="fan-nav-link">Fan View</Link>}
        <SyncStatus />
      </div>
    </header>
  );
}
