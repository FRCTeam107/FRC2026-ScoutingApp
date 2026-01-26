import { Link } from 'react-router-dom';
import './RoleSelectPage.css';

export function RoleSelectPage() {
  return (
    <div className="role-select-page">
      <div className="role-header">
        <h1>FRC Team 107</h1>
        <h2>2026 REBUILT Season</h2>
      </div>

      <div className="role-cards">
        <Link to="/pit" className="role-card pit">
          <span className="role-icon">📋</span>
          <h3>Pit Scouter</h3>
          <p>Create robot profiles with photos, specs, and capabilities</p>
        </Link>

        <Link to="/match" className="role-card match">
          <span className="role-icon">🎯</span>
          <h3>Match Scouter</h3>
          <p>Track performance during matches with firing timer</p>
        </Link>

        <Link to="/manager" className="role-card manager">
          <span className="role-icon">📊</span>
          <h3>Manager</h3>
          <p>View all data, analytics, and team comparisons</p>
        </Link>
      </div>

      <div className="role-footer">
        <p className="offline-note">
          Works offline - data syncs when WiFi available
        </p>
      </div>
    </div>
  );
}
