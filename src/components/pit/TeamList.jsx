import { getTeamProfiles } from '../../lib/storage';
import './TeamList.css';

function formatTimeAgo(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const diffMins = Math.floor((Date.now() - date) / 60000);
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${Math.floor(diffHours / 24)}d ago`;
}

export function TeamList({ onSelectTeam, currentEvent }) {
  const profiles = getTeamProfiles();

  // Build the list to display
  let items;
  if (currentEvent?.teams?.length) {
    // Event mode: all event teams, mark scouted ones
    items = currentEvent.teams.map(t => ({
      teamNumber: t.team_number,
      nickname: t.nickname,
      profile: profiles[t.team_number] || null,
    }));
  } else {
    // No event: only scouted teams
    items = Object.values(profiles)
      .sort((a, b) => a.teamNumber - b.teamNumber)
      .map(p => ({
        teamNumber: p.teamNumber,
        nickname: null,
        profile: p,
      }));
  }

  if (items.length === 0) {
    return (
      <div className="team-list-empty">
        <p>No teams yet.</p>
        <p className="hint">Add a team using the form, or load an event in Manager.</p>
      </div>
    );
  }

  const scoutedCount = items.filter(i => i.profile).length;

  return (
    <div className="team-list">
      <div className="team-list-header">
        <h3>{currentEvent?.teams?.length ? `Teams at Event` : 'Scouted Teams'}</h3>
        <span className="team-list-count">{scoutedCount}/{items.length} scouted</span>
      </div>
      <div className="team-checklist">
        {items.map(({ teamNumber, nickname, profile }) => (
          <div
            key={teamNumber}
            className={`checklist-item ${profile ? 'scouted' : ''}`}
            onClick={() => onSelectTeam(teamNumber)}
          >
            <div className="checklist-status">
              {profile
                ? <span className="status-check">&#10003;</span>
                : <span className="status-empty" />
              }
            </div>
            <div className="checklist-team-info">
              <span className="checklist-team-number">#{teamNumber}</span>
              {(nickname || profile) && (
                <span className="checklist-team-name">{nickname || ''}</span>
              )}
            </div>
            {profile?.updatedAt && (
              <span className="checklist-time">{formatTimeAgo(profile.updatedAt)}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
