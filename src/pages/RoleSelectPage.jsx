import { useState } from 'react';
import { Link } from 'react-router-dom';
import { getCurrentEvent } from '../lib/storage';
import { EventPickerModal } from '../components/common/EventPickerModal';
import './RoleSelectPage.css';

export function RoleSelectPage() {
  const [showEventPicker, setShowEventPicker] = useState(false);
  const [currentEvent, setCurrentEventState] = useState(() => getCurrentEvent());

  const handleEventLoaded = (eventData) => {
    setCurrentEventState(eventData);
  };

  return (
    <div className="role-select-page">
      <div className="role-header">
        <h1>FRC Team 107</h1>
        <h2>2026 REBUILT Season</h2>

        <button
          className={`event-status-btn${currentEvent ? ' loaded' : ''}`}
          onClick={() => setShowEventPicker(true)}
        >
          {currentEvent ? (
            <>
              <span className="event-status-dot" />
              <span className="event-status-name">{currentEvent.name}</span>
              <span className="event-status-change">Change</span>
            </>
          ) : (
            '＋ Load Event'
          )}
        </button>
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

        <Link to="/drive" className="role-card drive">
          <span className="role-icon">🎮</span>
          <h3>Drive Team</h3>
          <p>Look up your next match, see opponent stats, and get predictions</p>
        </Link>
      </div>

      <div className="role-footer">
        <p className="offline-note">
          Works offline - data syncs when WiFi available
        </p>
      </div>

      {showEventPicker && (
        <EventPickerModal
          onClose={() => setShowEventPicker(false)}
          onEventLoaded={handleEventLoaded}
        />
      )}
    </div>
  );
}
