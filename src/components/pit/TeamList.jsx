import { getTeamProfiles } from '../../lib/storage';
import './TeamList.css';

function formatTimeAgo(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
}

export function TeamList({ onSelectTeam, currentEvent }) {
  const profiles = getTeamProfiles();

  // If event is loaded, show checklist mode
  if (currentEvent?.teams) {
    const eventTeams = currentEvent.teams;

    return (
      <div className="team-list">
        <h3>Teams at Event ({eventTeams.length})</h3>
        <div className="team-checklist">
          {eventTeams.map((team) => {
            const profile = profiles[team.team_number];
            const isScouted = !!profile;

            return (
              <div
                key={team.team_number}
                className={`checklist-item ${isScouted ? 'scouted' : ''}`}
                onClick={() => onSelectTeam(team.team_number)}
              >
                <div className="checklist-status">
                  {isScouted ? (
                    <span className="status-check">&#10003;</span>
                  ) : (
                    <span className="status-empty" />
                  )}
                </div>
                <div className="checklist-team-info">
                  <span className="checklist-team-number">#{team.team_number}</span>
                  <span className="checklist-team-name">{team.nickname}</span>
                </div>
                {isScouted && profile.updatedAt && (
                  <span className="checklist-time">{formatTimeAgo(profile.updatedAt)}</span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Fallback to original grid view when no event is loaded
  const teams = Object.values(profiles).sort((a, b) => a.teamNumber - b.teamNumber);

  if (teams.length === 0) {
    return (
      <div className="team-list-empty">
        <p>No teams scouted yet.</p>
        <p className="hint">Add a team using the form above, or load an event in the Manager page.</p>
      </div>
    );
  }

  return (
    <div className="team-list">
      <h3>Scouted Teams ({teams.length})</h3>
      <div className="team-grid">
        {teams.map((team) => (
          <div key={team.teamNumber} className="team-card">
            {(team.photoBase64 || team.photoUrl) ? (
              <img
                src={team.photoBase64 || team.photoUrl}
                alt={`Team ${team.teamNumber}`}
                className="team-photo"
              />
            ) : (
              <div className="team-photo-placeholder">
                <span>No Photo</span>
              </div>
            )}
            <div className="team-info">
              <span className="team-number">#{team.teamNumber}</span>
              {team.ballsPerSecond && (
                <span className="team-stat">{team.ballsPerSecond} b/s</span>
              )}
            </div>
            <button
              className="edit-team-btn"
              onClick={() => onSelectTeam(team.teamNumber)}
            >
              Edit
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
