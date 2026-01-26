import { useState, useMemo } from 'react';
import { PitScoutForm } from '../components/pit/PitScoutForm';
import { TeamList } from '../components/pit/TeamList';
import { getCurrentEvent, getTeamProfiles } from '../lib/storage';
import './PitScoutPage.css';

export function PitScoutPage() {
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const currentEvent = getCurrentEvent();
  const profiles = getTeamProfiles();

  // Calculate progress for current event
  const progress = useMemo(() => {
    if (!currentEvent?.teams) {
      return { scouted: 0, total: 0, percentage: 0 };
    }
    const eventTeamNumbers = currentEvent.teams.map(t => t.team_number);
    const scoutedCount = eventTeamNumbers.filter(num => profiles[num]).length;
    return {
      scouted: scoutedCount,
      total: eventTeamNumbers.length,
      percentage: eventTeamNumbers.length > 0 ? (scoutedCount / eventTeamNumbers.length) * 100 : 0
    };
  }, [currentEvent, profiles, refreshKey]);

  const handleSave = () => {
    setSelectedTeam(null);
    setRefreshKey(k => k + 1);
  };

  const handleSelectTeam = (teamNumber) => {
    setSelectedTeam(teamNumber);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="pit-scout-page">
      <div className="page-header">
        <h1>Pit Scouting</h1>
        {currentEvent ? (
          <p className="event-name">{currentEvent.name}</p>
        ) : (
          <p>Create robot profiles for each team</p>
        )}
      </div>

      {currentEvent && (
        <div className="progress-section">
          <div className="progress-bar-container">
            <div
              className="progress-bar-fill"
              style={{ width: `${progress.percentage}%` }}
            />
          </div>
          <p className="progress-text">
            {progress.scouted}/{progress.total} teams scouted
          </p>
        </div>
      )}

      <div className="page-content">
        <PitScoutForm
          teamNumber={selectedTeam}
          onSave={handleSave}
          onCancel={selectedTeam ? () => setSelectedTeam(null) : null}
        />

        <TeamList
          key={refreshKey}
          onSelectTeam={handleSelectTeam}
          currentEvent={currentEvent}
        />
      </div>
    </div>
  );
}
