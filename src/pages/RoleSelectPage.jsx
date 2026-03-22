import { useState } from 'react';
import { Link } from 'react-router-dom';
import { getCurrentEvent, getMatchSchedule } from '../lib/storage';
import { EventPickerModal } from '../components/common/EventPickerModal';
import { POS_COLORS, buildSchedule } from '../lib/scheduleHelpers';
import { useScoutingSchedule } from '../hooks/useScoutingSchedule';
import './RoleSelectPage.css';

function ScoutingPreview({ scouters, groupSize, totalMatchCount }) {
  const matchSchedule = getMatchSchedule();
  const schedule = buildSchedule(matchSchedule, scouters, groupSize, totalMatchCount);

  if (!schedule.length) return null;

  return (
    <div className="scouting-preview">
      <h3 className="sp-heading">Scouting Assignments</h3>
      <div className="sp-shifts">
        {schedule.map((row, i) => (
          <div key={i} className="sp-shift">
            <div className="sp-shift-label">
              Shift {i + 1}
              <span className="sp-shift-range">
                {row.from === row.to ? ` Q${row.from}` : ` Q${row.from}–Q${row.to}`}
              </span>
            </div>
            <div className="sp-alliances">
              <div className="sp-alliance sp-red">
                {row.team.filter(t => t.pos.startsWith('R')).map(({ pos, name }) => (
                  <div key={pos} className="sp-assignment">
                    <span className="sp-pos" style={{ background: POS_COLORS[pos] }}>{pos}</span>
                    <span className="sp-name">{name}</span>
                  </div>
                ))}
              </div>
              <div className="sp-divider" />
              <div className="sp-alliance sp-blue">
                {row.team.filter(t => t.pos.startsWith('B')).map(({ pos, name }) => (
                  <div key={pos} className="sp-assignment">
                    <span className="sp-pos" style={{ background: POS_COLORS[pos] }}>{pos}</span>
                    <span className="sp-name">{name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function RoleSelectPage() {
  const [showEventPicker, setShowEventPicker] = useState(false);
  const [currentEvent, setCurrentEventState] = useState(() => getCurrentEvent());
  const { scouters, groupSize, totalMatchCount } = useScoutingSchedule();

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
          <h3>Data Analysis</h3>
          <p>View all data, analytics, and team comparisons</p>
        </Link>

        <Link to="/drive" className="role-card drive">
          <span className="role-icon">🎮</span>
          <h3>Drive Team</h3>
          <p>Look up your next match, see opponent stats, and get predictions</p>
        </Link>

        <Link to="/admin" className="role-card admin">
          <span className="role-icon">⚙️</span>
          <h3>Admin</h3>
          <p>Event setup, field image, and developer tools</p>
        </Link>
      </div>

      <div className="role-footer">
        <p className="offline-note">
          Works offline - data syncs when WiFi available
        </p>
      </div>

      <ScoutingPreview scouters={scouters} groupSize={groupSize} totalMatchCount={totalMatchCount} />

      {showEventPicker && (
        <EventPickerModal
          onClose={() => setShowEventPicker(false)}
          onEventLoaded={handleEventLoaded}
        />
      )}
    </div>
  );
}
