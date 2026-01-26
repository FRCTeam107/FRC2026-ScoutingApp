import { useState, useMemo } from 'react';
import { getTeamProfiles, getMatchRecords, deleteTeamProfile, clearAllMatchRecords, getCurrentEvent, setCurrentEvent, clearCurrentEvent } from '../lib/storage';
import { deleteAllMatchRecords } from '../lib/supabase';
import { getEventTeams, getEventInfo } from '../lib/tba';
import { PasswordModal } from '../components/common/PasswordModal';
import './ManagerPage.css';

export function ManagerPage() {
  const [activeTab, setActiveTab] = useState('analytics');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('teamNumber');
  const [sortDir, setSortDir] = useState('asc');
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [expandedNotes, setExpandedNotes] = useState(null);
  const [climbViewMode, setClimbViewMode] = useState('endgame'); // 'auto' or 'endgame'

  // Password modal state
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);

  // Event setup state
  const [eventKey, setEventKey] = useState('');
  const [eventLoading, setEventLoading] = useState(false);
  const [eventError, setEventError] = useState(null);
  const [currentEvent, setCurrentEventState] = useState(() => getCurrentEvent());

  const profiles = getTeamProfiles();
  const records = getMatchRecords();
  const teams = Object.values(profiles);

  // Teams for rankings: use event teams if loaded, otherwise teams with match data
  const teamsForRankings = useMemo(() => {
    if (currentEvent?.teams?.length > 0) {
      return currentEvent.teams.map(t => t.team_number).sort((a, b) => a - b);
    }
    return [...new Set(records.map(r => r.teamNumber))].sort((a, b) => a - b);
  }, [currentEvent, records, refreshKey]);

  // Teams with match data only (for stats display)
  const teamsWithMatchData = useMemo(() => {
    return [...new Set(records.map(r => r.teamNumber))].sort((a, b) => a - b);
  }, [records, refreshKey]);

  // All teams (profiles + match data) - only used for total count display
  const allTeamNumbers = useMemo(() => {
    return [...new Set([
      ...Object.keys(profiles).map(Number),
      ...records.map(r => r.teamNumber)
    ])].sort((a, b) => a - b);
  }, [profiles, records, refreshKey]);

  const getTeamStats = (teamNumber) => {
    const teamRecords = records.filter(r => r.teamNumber === teamNumber);
    const profile = profiles[teamNumber];
    const ballsPerSecond = profile?.ballsPerSecond || null;

    if (teamRecords.length === 0) {
      return {
        matches: 0,
        avgAutoFiring: 0,
        avgTeleopFiring: 0,
        avgAutoAccuracy: 0,
        avgTeleopAccuracy: 0,
        autoFuel: null,
        teleopFuel: null,
        totalFuel: null,
        avgDefense: 0,
        hasPitData: !!profile
      };
    }

    let totalAutoFiring = 0, totalTeleopFiring = 0;
    let totalAutoAccuracy = 0, totalTeleopAccuracy = 0;
    let totalAutoFuel = 0, totalTeleopFuel = 0;
    let totalDefense = 0, defenseCount = 0;

    teamRecords.forEach(r => {
      const autoFiring = r.autoFiringSeconds || 0;
      const teleopFiring = r.teleopFiringSeconds || 0;
      totalAutoFiring += autoFiring;
      totalTeleopFiring += teleopFiring;
      totalAutoAccuracy += r.autoAccuracy || 0;
      totalTeleopAccuracy += r.teleopAccuracy || 0;

      if (ballsPerSecond) {
        totalAutoFuel += autoFiring * ballsPerSecond * ((r.autoAccuracy || 0) / 100);
        totalTeleopFuel += teleopFiring * ballsPerSecond * ((r.teleopAccuracy || 0) / 100);
      }

      if (r.defenseRating > 0) {
        totalDefense += r.defenseRating;
        defenseCount++;
      }
    });

    const n = teamRecords.length;
    return {
      matches: n,
      avgAutoFiring: totalAutoFiring / n,
      avgTeleopFiring: totalTeleopFiring / n,
      avgAutoAccuracy: totalAutoAccuracy / n,
      avgTeleopAccuracy: totalTeleopAccuracy / n,
      autoFuel: ballsPerSecond ? totalAutoFuel / n : null,
      teleopFuel: ballsPerSecond ? totalTeleopFuel / n : null,
      totalFuel: ballsPerSecond ? (totalAutoFuel + totalTeleopFuel) / n : null,
      avgDefense: defenseCount > 0 ? totalDefense / defenseCount : 0,
      hasPitData: !!profile
    };
  };

  const sortedTeams = useMemo(() => {
    // Use event teams if loaded, otherwise teams with match data
    let filtered = teamsForRankings;

    if (searchQuery) {
      filtered = filtered.filter(num => num.toString().includes(searchQuery));
    }

    return filtered.sort((a, b) => {
      const statsA = getTeamStats(a);
      const statsB = getTeamStats(b);

      let valA, valB;
      switch (sortBy) {
        case 'teamNumber': valA = a; valB = b; break;
        case 'matches': valA = statsA.matches; valB = statsB.matches; break;
        case 'autoFuel': valA = statsA.autoFuel || 0; valB = statsB.autoFuel || 0; break;
        case 'teleopFuel': valA = statsA.teleopFuel || 0; valB = statsB.teleopFuel || 0; break;
        case 'totalFuel': valA = statsA.totalFuel || 0; valB = statsB.totalFuel || 0; break;
        case 'defense': valA = statsA.avgDefense; valB = statsB.avgDefense; break;
        default: valA = a; valB = b;
      }

      return sortDir === 'asc' ? valA - valB : valB - valA;
    });
  }, [teamsForRankings, searchQuery, sortBy, sortDir, refreshKey]);

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortDir('desc');
    }
  };

  // Password-protected actions
  const requestDeleteTeam = (teamNumber) => {
    setPendingAction({ type: 'deleteTeam', teamNumber });
    setShowPasswordModal(true);
  };

  const handlePasswordSuccess = async () => {
    setShowPasswordModal(false);

    if (pendingAction?.type === 'deleteTeam') {
      deleteTeamProfile(pendingAction.teamNumber);
      setRefreshKey(k => k + 1);
      setSelectedTeam(null);
    } else if (pendingAction?.type === 'clearForNewEvent') {
      clearAllMatchRecords();
      clearCurrentEvent();
      setCurrentEventState(null);
      try {
        await deleteAllMatchRecords();
      } catch (err) {
        console.error('Failed to clear cloud data:', err);
      }
      setRefreshKey(k => k + 1);
    }

    setPendingAction(null);
  };

  // Event setup handlers
  const loadEvent = async () => {
    if (!eventKey.trim()) {
      setEventError('Please enter an event key');
      return;
    }

    setEventLoading(true);
    setEventError(null);

    try {
      const [eventInfo, eventTeams] = await Promise.all([
        getEventInfo(eventKey.trim()),
        getEventTeams(eventKey.trim())
      ]);

      setCurrentEvent(eventInfo.key, eventInfo.name, eventTeams, eventInfo.start_date, eventInfo.end_date);
      setCurrentEventState({
        key: eventInfo.key,
        name: eventInfo.name,
        teams: eventTeams,
        startDate: eventInfo.start_date,
        endDate: eventInfo.end_date,
        loadedAt: new Date().toISOString()
      });
      setEventKey('');
    } catch (err) {
      setEventError(err.message);
    } finally {
      setEventLoading(false);
    }
  };

  const requestClearForNewEvent = () => {
    setPendingAction({ type: 'clearForNewEvent' });
    setShowPasswordModal(true);
  };

  const getTeamMatches = (teamNumber) => {
    return records.filter(r => r.teamNumber === teamNumber)
      .sort((a, b) => a.matchNumber - b.matchNumber);
  };

  return (
    <div className="manager-page" key={refreshKey}>
      <PasswordModal
        isOpen={showPasswordModal}
        onClose={() => { setShowPasswordModal(false); setPendingAction(null); }}
        onSuccess={handlePasswordSuccess}
        title={pendingAction?.type === 'clearForNewEvent' ? 'Clear Data for New Event' : 'Delete Team Data'}
      />

      <div className="page-header">
        <h1>Manager Dashboard</h1>
        <p>
          {currentEvent ? `${currentEvent.name} · ${currentEvent.teams?.length || 0} teams` : 'No event loaded'}
          {' · '}{records.length} match records · {teams.length} pit scouted
        </p>
      </div>

      <div className="tab-bar">
        <button className={`tab ${activeTab === 'analytics' ? 'active' : ''}`} onClick={() => setActiveTab('analytics')}>
          Analytics
        </button>
        <button className={`tab ${activeTab === 'teams' ? 'active' : ''}`} onClick={() => setActiveTab('teams')}>
          Pit Data
        </button>
        <button className={`tab ${activeTab === 'matches' ? 'active' : ''}`} onClick={() => setActiveTab('matches')}>
          Match Data
        </button>
        <button className={`tab ${activeTab === 'lookup' ? 'active' : ''}`} onClick={() => setActiveTab('lookup')}>
          Team Lookup
        </button>
        <button className={`tab ${activeTab === 'event' ? 'active' : ''}`} onClick={() => setActiveTab('event')}>
          Event Setup
        </button>
      </div>

      <div className="tab-content">
        {activeTab === 'analytics' && (
          <div className="analytics">
            <div className="quick-stats">
              <div className="stat-card">
                <span className="stat-value">{teamsForRankings.length}</span>
                <span className="stat-label">Event Teams</span>
              </div>
              <div className="stat-card">
                <span className="stat-value">{teamsWithMatchData.length}</span>
                <span className="stat-label">Match Scouted</span>
              </div>
              <div className="stat-card">
                <span className="stat-value">{teams.length}</span>
                <span className="stat-label">Pit Scouted</span>
              </div>
              <div className="stat-card">
                <span className="stat-value">{records.length}</span>
                <span className="stat-label">Match Records</span>
              </div>
            </div>

            {/* Team Rankings */}
            <div className="analytics-section">
              <h3>Team Rankings</h3>
              <div className="search-sort-bar">
                <input
                  type="text"
                  placeholder="Search team #..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="search-input"
                />
                <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="sort-select">
                  <option value="teamNumber">Team #</option>
                  <option value="matches">Matches</option>
                  <option value="autoFuel">Avg Auto Fuel</option>
                  <option value="teleopFuel">Avg Teleop Fuel</option>
                  <option value="totalFuel">Avg Total Fuel</option>
                  <option value="defense">Defense</option>
                </select>
                <button className="sort-dir-btn" onClick={() => setSortDir(d => d === 'asc' ? 'desc' : 'asc')}>
                  {sortDir === 'asc' ? '↑' : '↓'}
                </button>
              </div>

              <div className="rankings-table">
                <table>
                  <thead>
                    <tr>
                      <th onClick={() => handleSort('teamNumber')}>Team</th>
                      <th onClick={() => handleSort('matches')}>Matches</th>
                      <th onClick={() => handleSort('autoFuel')}>Avg Auto</th>
                      <th onClick={() => handleSort('teleopFuel')}>Avg Teleop</th>
                      <th onClick={() => handleSort('totalFuel')}>Avg Total</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedTeams.slice(0, 20).map(teamNum => {
                      const stats = getTeamStats(teamNum);
                      const profile = profiles[teamNum];
                      return (
                        <tr key={teamNum} onClick={() => { setSelectedTeam(teamNum); setActiveTab('lookup'); }} className="clickable-row">
                          <td><strong>#{teamNum}</strong></td>
                          <td>{stats.matches}</td>
                          <td>{stats.autoFuel !== null ? stats.autoFuel.toFixed(1) : '-'}</td>
                          <td>{stats.teleopFuel !== null ? stats.teleopFuel.toFixed(1) : '-'}</td>
                          <td>{stats.totalFuel !== null ? stats.totalFuel.toFixed(1) : '-'}</td>
                          <td>
                            {profile ? (
                              <span className="status-has-pit">Pit Done</span>
                            ) : (
                              <span className="status-need-pit">Need Pit</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {teamsForRankings.length === 0 && (
                  <p className="empty-note">No event loaded. Go to Event Setup to load teams from TBA.</p>
                )}
                {teamsForRankings.length > 0 && sortedTeams.every(t => getTeamStats(t).totalFuel === null) && (
                  <p className="table-note">Fuel estimates require pit scouting data (balls/sec)</p>
                )}
              </div>
            </div>

            {/* Climb Chart - horizontal bars, levels on Y axis */}
            {teamsWithMatchData.length > 0 && (() => {
              // Blue-based palette instead of rainbow
              const TEAM_COLORS = [
                '#3b82f6', '#60a5fa', '#93c5fd', '#1d4ed8', '#2563eb',
                '#6366f1', '#818cf8', '#a5b4fc', '#4f46e5', '#7c3aed'
              ];
              const displayTeams = sortedTeams.slice(0, 10);
              const climbField = climbViewMode === 'auto' ? 'autoClimb' : 'teleopClimb';

              // Calculate max count for scaling
              const levelCounts = { L3: 0, L2: 0, L1: 0, None: 0 };
              displayTeams.forEach(teamNum => {
                const teamRecords = records.filter(r => r.teamNumber === teamNum);
                teamRecords.forEach(r => levelCounts[r[climbField] || 'None']++);
              });
              const maxCount = Math.max(...Object.values(levelCounts), 1);

              return (
                <div className="analytics-section">
                  <div className="climb-header">
                    <h3>Climbs by Level</h3>
                    <div className="climb-toggle">
                      <button
                        className={`toggle-btn ${climbViewMode === 'auto' ? 'active' : ''}`}
                        onClick={() => setClimbViewMode('auto')}
                      >
                        Auto
                      </button>
                      <button
                        className={`toggle-btn ${climbViewMode === 'endgame' ? 'active' : ''}`}
                        onClick={() => setClimbViewMode('endgame')}
                      >
                        Endgame
                      </button>
                    </div>
                  </div>
                  <div className="climb-chart-horizontal">
                    {['L3', 'L2', 'L1', 'None'].map(level => {
                      const teamData = displayTeams.map((teamNum, idx) => {
                        const count = records.filter(r =>
                          r.teamNumber === teamNum && (r[climbField] || 'None') === level
                        ).length;
                        return { teamNum, count, color: TEAM_COLORS[idx % TEAM_COLORS.length] };
                      }).filter(t => t.count > 0);

                      const totalForLevel = teamData.reduce((sum, t) => sum + t.count, 0);

                      return (
                        <div key={level} className="level-row">
                          <span className="level-label-h">{level}</span>
                          <div className="level-bar-h-container">
                            <div
                              className="level-bar-h"
                              style={{ width: `${(totalForLevel / maxCount) * 100}%` }}
                            >
                              {teamData.map((t) => (
                                <div
                                  key={t.teamNum}
                                  className="team-segment-h"
                                  style={{
                                    width: `${(t.count / totalForLevel) * 100}%`,
                                    backgroundColor: t.color
                                  }}
                                  onClick={() => { setSelectedTeam(t.teamNum); setActiveTab('lookup'); }}
                                >
                                  <span className="segment-tooltip">#{t.teamNum}: {t.count}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                          <span className="level-count-h">{totalForLevel}</span>
                        </div>
                      );
                    })}
                  </div>
                  <div className="team-legend">
                    {displayTeams.map((teamNum, idx) => (
                      <span
                        key={teamNum}
                        className="team-legend-item"
                        onClick={() => { setSelectedTeam(teamNum); setActiveTab('lookup'); }}
                      >
                        <span
                          className="team-color-dot"
                          style={{ backgroundColor: TEAM_COLORS[idx % TEAM_COLORS.length] }}
                        />
                        {teamNum}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })()}

          </div>
        )}

        {activeTab === 'teams' && (
          <div className="teams-tab">
            <div className="search-bar">
              <input
                type="text"
                placeholder="Search team #..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-input"
              />
            </div>

            {teams.length === 0 ? (
              <p className="empty-state">No teams pit scouted yet</p>
            ) : (
              <div className="team-cards">
                {teams
                  .filter(t => !searchQuery || t.teamNumber.toString().includes(searchQuery))
                  .sort((a, b) => a.teamNumber - b.teamNumber)
                  .map(team => (
                    <div key={team.teamNumber} className="team-card">
                      <div className="team-card-header">
                        {(team.photoBase64 || team.photoUrl) ? (
                          <img src={team.photoBase64 || team.photoUrl} alt="" className="team-photo" />
                        ) : (
                          <div className="team-photo-placeholder">No Photo</div>
                        )}
                        <div className="team-card-info">
                          <h3>#{team.teamNumber}</h3>
                          <p className="balls-sec">{team.ballsPerSecond ? `${team.ballsPerSecond} balls/sec` : 'No rate set'}</p>
                        </div>
                        <button
                          className="delete-btn"
                          onClick={(e) => { e.stopPropagation(); requestDeleteTeam(team.teamNumber); }}
                          title="Delete team (requires password)"
                        >
                          ×
                        </button>
                      </div>
                      {team.description && (
                        <p className="team-desc">{team.description}</p>
                      )}
                      <button
                        className="view-btn"
                        onClick={() => { setSelectedTeam(team.teamNumber); setActiveTab('lookup'); }}
                      >
                        View Details →
                      </button>
                    </div>
                  ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'matches' && (
          <div className="matches-tab">
            <div className="search-bar">
              <input
                type="text"
                placeholder="Search team #..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-input"
              />
            </div>

            {records.length === 0 ? (
              <p className="empty-state">No match records yet</p>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Match</th>
                    <th>Team</th>
                    <th>Alliance</th>
                    <th>Auto</th>
                    <th>Teleop</th>
                    <th>Auto Climb</th>
                    <th>End Climb</th>
                    <th>Defense</th>
                  </tr>
                </thead>
                <tbody>
                  {[...records]
                    .filter(r => !searchQuery || r.teamNumber.toString().includes(searchQuery))
                    .reverse()
                    .map((record, idx) => (
                      <tr key={idx} onClick={() => { setSelectedTeam(record.teamNumber); setActiveTab('lookup'); }} className="clickable-row">
                        <td>#{record.matchNumber}</td>
                        <td><strong>#{record.teamNumber}</strong></td>
                        <td>
                          <span className={`alliance-badge ${record.allianceColor}`}>
                            {record.allianceColor}
                          </span>
                        </td>
                        <td>{record.autoFiringSeconds?.toFixed(1) || 0}s @ {record.autoAccuracy || 0}%</td>
                        <td>{record.teleopFiringSeconds?.toFixed(1) || 0}s @ {record.teleopAccuracy || 0}%</td>
                        <td><span className={`climb-badge ${record.autoClimb !== 'None' ? 'success' : ''}`}>{record.autoClimb || 'None'}</span></td>
                        <td><span className={`climb-badge ${record.teleopClimb !== 'None' ? 'success' : ''}`}>{record.teleopClimb || 'None'}</span></td>
                        <td>{record.defenseRating > 0 ? '★'.repeat(record.defenseRating) : 'N/A'}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {activeTab === 'lookup' && (
          <div className="lookup-tab">
            <div className="search-bar">
              <input
                type="number"
                placeholder="Enter team number..."
                value={selectedTeam || ''}
                onChange={(e) => setSelectedTeam(e.target.value ? parseInt(e.target.value) : null)}
                className="search-input large"
              />
            </div>

            {selectedTeam && (
              <div className="team-detail">
                <div className="team-detail-header">
                  <h2>Team #{selectedTeam}</h2>
                  {profiles[selectedTeam] && (
                    <button className="delete-btn-large" onClick={() => requestDeleteTeam(selectedTeam)}>
                      Delete Pit Data
                    </button>
                  )}
                </div>

                {profiles[selectedTeam] ? (
                  <div className="detail-section">
                    <h3>Pit Scouting Data</h3>
                    <div className="pit-data">
                      {(profiles[selectedTeam].photoBase64 || profiles[selectedTeam].photoUrl) && (
                        <img
                          src={profiles[selectedTeam].photoBase64 || profiles[selectedTeam].photoUrl}
                          alt="Robot"
                          className="robot-photo-large"
                        />
                      )}
                      <div className="pit-stats">
                        <div className="pit-stat">
                          <span className="label">Balls/sec:</span>
                          <span className="value">{profiles[selectedTeam].ballsPerSecond || 'Not set'}</span>
                        </div>
                        <div className="pit-stat">
                          <span className="label">Description:</span>
                          <span className="value">{profiles[selectedTeam].description || 'None'}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="detail-section missing">
                    <p>No pit scouting data for this team</p>
                  </div>
                )}

                {(() => {
                  const stats = getTeamStats(selectedTeam);
                  const matches = getTeamMatches(selectedTeam);

                  if (matches.length === 0) {
                    return (
                      <div className="detail-section missing">
                        <p>No match records for this team</p>
                      </div>
                    );
                  }

                  return (
                    <>
                      <div className="detail-section">
                        <h3>Match Statistics ({matches.length} matches)</h3>
                        <div className="stats-grid">
                          <div className="stat-box">
                            <span className="stat-value">{stats.autoFuel !== null ? stats.autoFuel.toFixed(1) : 'N/A'}</span>
                            <span className="stat-label">Avg Auto Fuel</span>
                          </div>
                          <div className="stat-box">
                            <span className="stat-value">{stats.teleopFuel !== null ? stats.teleopFuel.toFixed(1) : 'N/A'}</span>
                            <span className="stat-label">Avg Teleop Fuel</span>
                          </div>
                          <div className="stat-box highlight">
                            <span className="stat-value">
                              {stats.totalFuel !== null ? stats.totalFuel.toFixed(1) : 'N/A'}
                            </span>
                            <span className="stat-label">Avg Total Fuel</span>
                          </div>
                          <div className="stat-box">
                            <span className="stat-value">{stats.avgDefense > 0 ? stats.avgDefense.toFixed(1) : 'N/A'}</span>
                            <span className="stat-label">Avg Defense</span>
                          </div>
                        </div>
                      </div>

                      <div className="detail-section">
                        <h3>Match History</h3>
                        <table className="match-history">
                          <thead>
                            <tr>
                              <th>Match</th>
                              <th>Auto</th>
                              <th>Teleop</th>
                              <th>Auto Climb</th>
                              <th>End Climb</th>
                              <th>Notes</th>
                            </tr>
                          </thead>
                          <tbody>
                            {matches.map((m, i) => (
                              <tr key={i}>
                                <td>#{m.matchNumber}</td>
                                <td>{m.autoFiringSeconds?.toFixed(1)}s @ {m.autoAccuracy}%</td>
                                <td>{m.teleopFiringSeconds?.toFixed(1)}s @ {m.teleopAccuracy}%</td>
                                <td>{m.autoClimb || 'None'}</td>
                                <td>{m.teleopClimb || 'None'}</td>
                                <td
                                  className={`notes-cell ${m.notes && m.notes.length > 30 ? 'expandable' : ''} ${expandedNotes === `${selectedTeam}-${m.matchNumber}` ? 'expanded' : ''}`}
                                  onClick={() => m.notes && m.notes.length > 30 && setExpandedNotes(expandedNotes === `${selectedTeam}-${m.matchNumber}` ? null : `${selectedTeam}-${m.matchNumber}`)}
                                >
                                  {m.notes || '-'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </>
                  );
                })()}
              </div>
            )}

            {!selectedTeam && (
              <p className="empty-state">Enter a team number above to view their data</p>
            )}
          </div>
        )}

        {activeTab === 'event' && (
          <div className="event-tab">
            <div className="event-setup-section">
              <h3>Load Event from TBA</h3>
              <div className="event-input-row">
                <input
                  type="text"
                  placeholder="Event key (e.g., 2026miket)"
                  value={eventKey}
                  onChange={(e) => setEventKey(e.target.value)}
                  className="search-input"
                  onKeyDown={(e) => e.key === 'Enter' && loadEvent()}
                />
                <button
                  className="load-event-btn"
                  onClick={loadEvent}
                  disabled={eventLoading}
                >
                  {eventLoading ? 'Loading...' : 'Load Event'}
                </button>
              </div>
              {eventError && (
                <p className="event-error">{eventError}</p>
              )}
              <p className="event-hint">
                Event keys follow the format: {'{year}{event_code}'} (e.g., 2026miket, 2026cmptx)
              </p>
            </div>

            {currentEvent && (
              <>
                <div className="current-event-section">
                  <h3>Current Event</h3>
                  <div className="event-card">
                    <div className="event-info">
                      <h4>{currentEvent.name}</h4>
                      <p className="event-key">{currentEvent.key}</p>
                      {currentEvent.startDate && currentEvent.endDate && (
                        <p className="event-dates">
                          {new Date(currentEvent.startDate).toLocaleDateString()} - {new Date(currentEvent.endDate).toLocaleDateString()}
                        </p>
                      )}
                      <p className="event-team-count">{currentEvent.teams?.length || 0} teams loaded</p>
                    </div>
                  </div>
                </div>

                <div className="event-teams-section">
                  <h3>Teams at Event ({currentEvent.teams?.length || 0})</h3>
                  <div className="event-teams-grid">
                    {currentEvent.teams?.slice(0, 50).map(team => (
                      <div key={team.team_number} className="event-team-item">
                        <span className="event-team-number">#{team.team_number}</span>
                        <span className="event-team-name">{team.nickname}</span>
                      </div>
                    ))}
                    {currentEvent.teams?.length > 50 && (
                      <p className="more-teams">+{currentEvent.teams.length - 50} more teams</p>
                    )}
                  </div>
                </div>

                <div className="event-actions-section">
                  <h3>Event Actions</h3>
                  <button className="danger-btn" onClick={requestClearForNewEvent}>
                    Clear Data for New Event
                  </button>
                  <p className="admin-note">
                    Clears match records and event data. Team profiles are kept.
                  </p>
                </div>
              </>
            )}

            {!currentEvent && (
              <div className="no-event-state">
                <p>No event loaded</p>
                <p className="hint">Enter an event key above to load teams from The Blue Alliance.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
