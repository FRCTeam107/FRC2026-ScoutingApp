import { useState, useMemo, useEffect } from 'react';
import { getTeamProfiles, getMatchRecords, deleteTeamProfile, getCurrentEvent, getMatchSchedule } from '../lib/storage';
import { deleteTeamProfileFromCloud } from '../lib/supabase';
import { PasswordModal } from '../components/common/PasswordModal';
import { useTeamProfileSync } from '../hooks/useTeamProfileSync';
import './ManagerPage.css';

export function ManagerPage() {
  useTeamProfileSync();
  const [activeTab, setActiveTab] = useState('analytics');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('teamNumber');
  const [sortDir, setSortDir] = useState('asc');
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [expandedNotes, setExpandedNotes] = useState(null);
  const [scheduleData, setScheduleData] = useState(() => getMatchSchedule());

  useEffect(() => {
    const handler = () => setRefreshKey(k => k + 1);
    window.addEventListener('scouting-sync-complete', handler);
    return () => window.removeEventListener('scouting-sync-complete', handler);
  }, []);
  const [climbViewMode, setClimbViewMode] = useState('endgame'); // 'auto' or 'endgame'

  // Password modal state
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);

  // Event setup state
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
      try {
        await deleteTeamProfileFromCloud(pendingAction.teamNumber);
      } catch (err) {
        console.error('Failed to delete from cloud:', err);
      }
      setRefreshKey(k => k + 1);
      setSelectedTeam(null);
    }

    setPendingAction(null);
  };

  const getTeamMatches = (teamNumber) => {
    return records.filter(r => r.teamNumber === teamNumber)
      .sort((a, b) => a.matchNumber - b.matchNumber);
  };

  const [expandedPointsTeams, setExpandedPointsTeams] = useState(new Set());
  const [pointsSortBy, setPointsSortBy] = useState('avgTotal');
  const [pointsSortDir, setPointsSortDir] = useState('desc');
  const [pointsView, setPointsView] = useState('table'); // 'table' | 'chart' | 'weights'
  const [pointsChartMetric, setPointsChartMetric] = useState('avgTotal');
  const [weights, setWeights] = useState({ autoFuel: 1, autoClimb: 1, teleopFuel: 1, teleopClimb: 1, defense: 1 });

  const updateWeight = (key, val) => {
    const num = parseFloat(val);
    if (!isNaN(num) && num >= 0) setWeights(w => ({ ...w, [key]: num }));
  };

  const weightsAreDefault = Object.values(weights).every(v => v === 1);

  const handlePointsSort = (field) => {
    if (pointsSortBy === field) {
      setPointsSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setPointsSortBy(field);
      setPointsSortDir('desc');
    }
  };

  const togglePointsExpand = (teamNum) => {
    setExpandedPointsTeams(prev => {
      const next = new Set(prev);
      next.has(teamNum) ? next.delete(teamNum) : next.add(teamNum);
      return next;
    });
  };

  const TELEOP_CLIMB_PTS = { L1: 10, L2: 20, L3: 30, None: 0 };

  const getMatchPointsBreakdown = (record) => {
    const profile = profiles[record.teamNumber];
    const bps = profile?.ballsPerSecond || null;
    const autoFuelBase = bps !== null ? (record.autoFiringSeconds || 0) * bps * ((record.autoAccuracy || 0) / 100) : null;
    const autoClimbBase = (record.autoClimb && record.autoClimb !== 'None') ? 15 : 0;
    const teleopFuelBase = bps !== null ? (record.teleopFiringSeconds || 0) * bps * ((record.teleopAccuracy || 0) / 100) : null;
    const teleopClimbBase = TELEOP_CLIMB_PTS[record.teleopClimb] || 0;
    const autoFuel = autoFuelBase !== null ? autoFuelBase * weights.autoFuel : null;
    const autoClimb = autoClimbBase * weights.autoClimb;
    const teleopFuel = teleopFuelBase !== null ? teleopFuelBase * weights.teleopFuel : null;
    const teleopClimb = teleopClimbBase * weights.teleopClimb;
    const defense = (record.defenseRating || 0) * weights.defense;
    const total = (autoFuel ?? 0) + autoClimb + (teleopFuel ?? 0) + teleopClimb + defense;
    return { autoFuel, autoClimb, teleopFuel, teleopClimb, defense, total };
  };

  const getTeamPointStats = (teamNumber) => {
    const teamRecords = records.filter(r => r.teamNumber === teamNumber);
    const profile = profiles[teamNumber];
    const ballsPerSecond = profile?.ballsPerSecond || null;

    if (teamRecords.length === 0) {
      return { matches: 0, avgAutoFuel: null, avgAutoClimb: 0, avgTeleopFuel: null, avgTeleopClimb: 0, avgDefense: 0, avgTotal: null };
    }

    let totalAutoFuel = 0, totalTeleopFuel = 0;
    let totalAutoClimb = 0, totalTeleopClimb = 0, totalDefense = 0;

    teamRecords.forEach(r => {
      if (ballsPerSecond) {
        totalAutoFuel += (r.autoFiringSeconds || 0) * ballsPerSecond * ((r.autoAccuracy || 0) / 100);
        totalTeleopFuel += (r.teleopFiringSeconds || 0) * ballsPerSecond * ((r.teleopAccuracy || 0) / 100);
      }
      totalAutoClimb += (r.autoClimb && r.autoClimb !== 'None') ? 15 : 0;
      totalTeleopClimb += TELEOP_CLIMB_PTS[r.teleopClimb] || 0;
      totalDefense += (r.defenseRating || 0);
    });

    const n = teamRecords.length;
    const avgAutoFuel = ballsPerSecond ? (totalAutoFuel / n) * weights.autoFuel : null;
    const avgTeleopFuel = ballsPerSecond ? (totalTeleopFuel / n) * weights.teleopFuel : null;
    const avgAutoClimb = (totalAutoClimb / n) * weights.autoClimb;
    const avgTeleopClimb = (totalTeleopClimb / n) * weights.teleopClimb;
    const avgDefense = (totalDefense / n) * weights.defense;
    const avgTotal = (avgAutoFuel ?? 0) + avgAutoClimb + (avgTeleopFuel ?? 0) + avgTeleopClimb + avgDefense;

    return { matches: n, avgAutoFuel, avgAutoClimb, avgTeleopFuel, avgTeleopClimb, avgDefense, avgTotal };
  };

  const matchPointsTeams = useMemo(() => {
    return [...teamsWithMatchData].sort((a, b) => {
      const sa = getTeamPointStats(a);
      const sb = getTeamPointStats(b);
      let valA, valB;
      if (pointsSortBy === 'teamNumber') { valA = a; valB = b; }
      else if (pointsSortBy === 'matches') { valA = sa.matches; valB = sb.matches; }
      else { valA = sa[pointsSortBy] ?? 0; valB = sb[pointsSortBy] ?? 0; }
      return pointsSortDir === 'desc' ? valB - valA : valA - valB;
    });
  }, [teamsWithMatchData, refreshKey, pointsSortBy, pointsSortDir, weights]);

  return (
    <div className="manager-page" key={refreshKey}>
      <PasswordModal
        isOpen={showPasswordModal}
        onClose={() => { setShowPasswordModal(false); setPendingAction(null); }}
        onSuccess={handlePasswordSuccess}
        title="Delete Team Data"
      />

      <div className="page-header">
        <h1>Data Analysis</h1>
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
        <button className={`tab ${activeTab === 'schedule' ? 'active' : ''}`} onClick={() => setActiveTab('schedule')}>
          Schedule
        </button>
        <button className={`tab ${activeTab === 'lookup' ? 'active' : ''}`} onClick={() => setActiveTab('lookup')}>
          Team Lookup
        </button>
        <button className={`tab ${activeTab === 'points' ? 'active' : ''}`} onClick={() => setActiveTab('points')}>
          Weighted Analytics
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

              <div className="rankings-table table-scroll">
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
                          <p className={`trench-badge-inline ${team.trenchCapability === 'bump' ? 'bump' : 'trench'}`}>
                            {team.trenchCapability === 'bump' ? 'Bump Only' : team.trenchCapability === 'trench' ? 'Trench Only' : team.trenchCapability === 'bumpAndTrench' ? 'Bump & Trench' : 'Unknown'}
                          </p>
                          {team.climbSide && team.climbSide !== 'doNotClimb' && (
                            <p className="climb-side-badge">Climbs: {team.climbSide.charAt(0).toUpperCase() + team.climbSide.slice(1)}</p>
                          )}
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

        {activeTab === 'schedule' && (
          <div className="schedule-tab">
            {!scheduleData || scheduleData.length === 0 ? (
              <p className="empty-state">No schedule loaded. Load an event from Event Setup to fetch the match schedule.</p>
            ) : (() => {
              const LEVEL_LABEL = { qm: 'Qual', sf: 'Semifinal', f: 'Final' };
              const levels = ['qm', 'sf', 'f'].filter(l => scheduleData.some(m => m.comp_level === l));
              return levels.map(level => {
                const matches = scheduleData
                  .filter(m => m.comp_level === level)
                  .sort((a, b) => a.match_number - b.match_number);
                return (
                  <div key={level} className="schedule-section">
                    <h3 className="schedule-level-heading">{LEVEL_LABEL[level] || level.toUpperCase()} Matches</h3>
                    <div className="table-scroll">
                      <table className="schedule-table">
                        <thead>
                          <tr>
                            <th>Match</th>
                            <th className="blue-col">Blue 1</th>
                            <th className="blue-col">Blue 2</th>
                            <th className="blue-col">Blue 3</th>
                            <th className="red-col">Red 1</th>
                            <th className="red-col">Red 2</th>
                            <th className="red-col">Red 3</th>
                          </tr>
                        </thead>
                        <tbody>
                          {matches.map(m => {
                            const blue = m.alliances?.blue?.team_keys || [];
                            const red = m.alliances?.red?.team_keys || [];
                            const fmt = key => key.replace('frc', '#');
                            return (
                              <tr key={m.match_number}>
                                <td><strong>{level === 'qm' ? `Q${m.match_number}` : level === 'sf' ? `SF${m.set_number}M${m.match_number}` : `F${m.match_number}`}</strong></td>
                                {blue.map((k, i) => (
                                  <td key={i} className="blue-col" onClick={() => { setSelectedTeam(parseInt(k.replace('frc', ''))); setActiveTab('lookup'); }} style={{cursor:'pointer'}}>{fmt(k)}</td>
                                ))}
                                {Array.from({ length: Math.max(0, 3 - blue.length) }).map((_, i) => <td key={`bp${i}`} className="blue-col">—</td>)}
                                {red.map((k, i) => (
                                  <td key={i} className="red-col" onClick={() => { setSelectedTeam(parseInt(k.replace('frc', ''))); setActiveTab('lookup'); }} style={{cursor:'pointer'}}>{fmt(k)}</td>
                                ))}
                                {Array.from({ length: Math.max(0, 3 - red.length) }).map((_, i) => <td key={`rp${i}`} className="red-col">—</td>)}
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              });
            })()}
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
              <div className="table-scroll"><table>
                <thead>
                  <tr>
                    <th>Match</th>
                    <th>Team</th>
                    <th>Alliance</th>
                    <th>Auto</th>
                    <th>Teleop</th>
                    <th>Auto Pickup</th>
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
                        <td>{Array.isArray(record.autoPickupLocation) ? (record.autoPickupLocation.length ? record.autoPickupLocation.join(', ') : 'None') : record.autoPickupLocation || 'None'}</td>
                        <td><span className={`climb-badge ${record.autoClimb !== 'None' ? 'success' : ''}`}>{record.autoClimb || 'None'}</span></td>
                        <td><span className={`climb-badge ${record.teleopClimb !== 'None' ? 'success' : ''}`}>{record.teleopClimb || 'None'}</span></td>
                        <td>{record.defenseRating > 0 ? '★'.repeat(record.defenseRating) : 'N/A'}</td>
                      </tr>
                    ))}
                </tbody>
              </table></div>
            )}
          </div>
        )}

        {activeTab === 'lookup' && (
          <div className="lookup-tab">
            <div className="search-bar">
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="Enter team number..."
                value={selectedTeam || ''}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '');
                  setSelectedTeam(val ? parseInt(val) : null);
                }}
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
                          <span className="label">Trench/Bump:</span>
                          <span className={`trench-badge-inline ${profiles[selectedTeam].trenchCapability === 'bump' ? 'bump' : profiles[selectedTeam].trenchCapability === 'trench' ? 'trench' : profiles[selectedTeam].trenchCapability === 'bumpAndTrench' ? 'both' : 'unknown'}`}>
                            {profiles[selectedTeam].trenchCapability === 'bump' ? 'Bump Only' : profiles[selectedTeam].trenchCapability === 'trench' ? 'Trench Only' : profiles[selectedTeam].trenchCapability === 'bumpAndTrench' ? 'Bump & Trench' : 'Unknown'}
                          </span>
                        </div>
                        <div className="pit-stat">
                          <span className="label">Climb Side:</span>
                          <span className="value">
                            {profiles[selectedTeam].climbSide === 'doNotClimb'
                              ? 'Do Not Climb'
                              : profiles[selectedTeam].climbSide && profiles[selectedTeam].climbSide !== 'doNotClimb'
                              ? profiles[selectedTeam].climbSide.charAt(0).toUpperCase() + profiles[selectedTeam].climbSide.slice(1)
                              : 'Unknown'}
                          </span>
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
                            <span className="stat-value">{matches.length > 0 ? matches.map(m => Array.isArray(m.autoPickupLocation) ? (m.autoPickupLocation.length ? m.autoPickupLocation.join(', ') : 'None') : m.autoPickupLocation || 'None').join(' · ') : 'N/A'}</span>
                            <span className="stat-label">Auto Pickup Location</span>
                          </div>
                          <div className="stat-box">
                            <span className="stat-value">{matches.length > 0 ? matches.map(m => Array.isArray(m.pickupLocation) ? (m.pickupLocation.length ? m.pickupLocation.join(', ') : 'None') : m.pickupLocation || 'None').join(' · ') : 'N/A'}</span>
                            <span className="stat-label">Teleop Pickup Location</span>
                          </div>
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
                          <div className="stat-box">
                            <span className="stat-value">{matches.length > 0 ? matches.map(m => m.autonFocus || 'N/A').join(', ') : 'N/A'}</span>
                            <span className="stat-label">Auton Focus</span>
                          </div>
                          <div className="stat-box">
                            <span className="stat-value">{matches.length > 0 ? matches.map(m => m.endgameFocus || 'N/A').join(', ') : 'N/A'}</span>
                            <span className="stat-label">Endgame Focus</span>
                          </div>
                        </div>
                      </div>

                      <div className="detail-section">
                        <h3>Match History</h3>
                        <div className="match-history-wrap table-scroll"><table className="match-history">
                          <thead>
                            <tr>
                              <th>Match</th>
                              <th>Auto</th>
                              <th>Teleop</th>
                              <th>Auto Pickup</th>
                              <th>Auto Climb</th>
                              <th>End Climb</th>
                              <th>Defense</th>
                              <th>Teleop Pickup</th>
                              <th>Auton Focus</th>
                              <th>Endgame Focus</th>
                              <th>Notes</th>
                            </tr>
                          </thead>
                          <tbody>
                            {matches.map((m, i) => (
                              <tr key={i}>
                                <td>#{m.matchNumber}</td>
                                <td>{m.autoFiringSeconds?.toFixed(1)}s @ {m.autoAccuracy}%</td>
                                <td>{m.teleopFiringSeconds?.toFixed(1)}s @ {m.teleopAccuracy}%</td>
                                <td>{Array.isArray(m.autoPickupLocation) ? (m.autoPickupLocation.length ? m.autoPickupLocation.join(', ') : 'None') : m.autoPickupLocation || 'None'}</td>
                                <td>{m.autoClimb || 'None'}</td>
                                <td>{m.teleopClimb || 'None'}</td>
                                <td>{m.defenseRating > 0 ? '★'.repeat(m.defenseRating) : '-'}</td>
                                <td>{Array.isArray(m.pickupLocation) ? (m.pickupLocation.length ? m.pickupLocation.join(', ') : 'None') : m.pickupLocation || 'None'}</td>
                                <td>{m.autonFocus || 'N/A'}</td>
                                <td>{m.endgameFocus || 'N/A'}</td>
                                <td
                                  className={`notes-cell ${m.notes && m.notes.length > 30 ? 'expandable' : ''} ${expandedNotes === `${selectedTeam}-${m.matchNumber}` ? 'expanded' : ''}`}
                                  onClick={() => m.notes && m.notes.length > 30 && setExpandedNotes(expandedNotes === `${selectedTeam}-${m.matchNumber}` ? null : `${selectedTeam}-${m.matchNumber}`)}
                                >
                                  {m.notes || '-'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table></div>
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

        {activeTab === 'points' && (
          <div className="points-tab">
            {teamsWithMatchData.length === 0 ? (
              <p className="empty-state">No match records yet</p>
            ) : (
              <>
                {/* View toggle */}
                <div className="points-view-bar">
                  <div className="points-view-toggle">
                    <button className={`pts-view-btn${pointsView === 'table' ? ' active' : ''}`} onClick={() => setPointsView('table')}>⊞ List</button>
                    <button className={`pts-view-btn${pointsView === 'chart' ? ' active' : ''}`} onClick={() => setPointsView('chart')}>▦ Chart</button>
                    <button className={`pts-view-btn${pointsView === 'weights' ? ' active' : ''}${!weightsAreDefault ? ' weights-dirty' : ''}`} onClick={() => setPointsView('weights')} title="Configure scoring weights">⚙ Weights{!weightsAreDefault ? ' •' : ''}</button>
                  </div>
                  <p className="table-note" style={{margin:0}}>Avg per match · fuel requires pit scouting data (balls/sec){!weightsAreDefault ? ' · weights applied' : ''}</p>
                </div>

                {pointsView === 'weights' && (
                  <div className="weights-panel">
                    <div className="weights-header">
                      <p className="weights-desc">Set a multiplier for each scoring category. A weight of <strong>2×</strong> doubles that category's contribution to the total; <strong>0×</strong> removes it entirely.</p>
                      {!weightsAreDefault && (
                        <button className="weights-reset-btn" onClick={() => setWeights({ autoFuel: 1, autoClimb: 1, teleopFuel: 1, teleopClimb: 1, defense: 1 })}>Reset all to 1×</button>
                      )}
                    </div>
                    <div className="weights-grid">
                      {[
                        { key: 'autoFuel',    label: 'Auto Fuel',    desc: 'balls/sec × firing time × accuracy', color: '#34d399' },
                        { key: 'autoClimb',   label: 'Auto Climb',   desc: '15 pts per climb attempt',            color: '#a78bfa' },
                        { key: 'teleopFuel',  label: 'Teleop Fuel',  desc: 'balls/sec × firing time × accuracy', color: '#fbbf24' },
                        { key: 'teleopClimb', label: 'Teleop Climb', desc: 'L1=10 · L2=20 · L3=30',              color: '#f87171' },
                        { key: 'defense',     label: 'Defense',      desc: 'avg defense rating (0–5 stars)',      color: '#fb923c' },
                      ].map(({ key, label, desc, color }) => (
                        <div key={key} className="weight-card" style={{ borderLeftColor: color }}>
                          <div className="weight-card-top">
                            <span className="weight-label">{label}</span>
                            <span className="weight-desc">{desc}</span>
                          </div>
                          <div className="weight-input-row">
                            <input
                              type="range"
                              min="0" max="5" step="0.1"
                              value={weights[key]}
                              onChange={e => updateWeight(key, e.target.value)}
                              className="weight-slider"
                              style={{ accentColor: color }}
                            />
                            <input
                              type="number"
                              min="0" max="10" step="0.1"
                              value={weights[key]}
                              onChange={e => updateWeight(key, e.target.value)}
                              className="weight-number"
                            />
                            <span className="weight-x">×</span>
                          </div>
                          <div className="weight-preview">
                            <span style={{ color }}>Effective multiplier: <strong>{weights[key]}×</strong></span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {pointsView === 'table' && (
                  <div className="table-scroll">
                    <table className="points-table">
                      <thead>
                        <tr>
                          {[['teamNumber','Team'],['matches','Matches'],['avgAutoFuel','Auto Fuel'],['avgAutoClimb','Auto Climb'],['avgTeleopFuel','Teleop Fuel'],['avgTeleopClimb','Teleop Climb'],['avgDefense','Defense'],['avgTotal','Avg Total']].map(([field, label]) => (
                            <th key={field} className="sortable-th" onClick={() => handlePointsSort(field)}>
                              {label}
                              {field === 'avgAutoClimb' && <><br/><span className="pts-sub">(15 pts)</span></>}
                              {field === 'avgTeleopClimb' && <><br/><span className="pts-sub">(L1=10 L2=20 L3=30)</span></>}
                              <span className="sort-indicator">{pointsSortBy === field ? (pointsSortDir === 'desc' ? ' ↓' : ' ↑') : ' ↕'}</span>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {matchPointsTeams.map(teamNum => {
                          const pts = getTeamPointStats(teamNum);
                          const teamMatches = getTeamMatches(teamNum);
                          const isExpanded = expandedPointsTeams.has(teamNum);
                          const hasMultiple = teamMatches.length > 1;
                          return (
                            <>
                              <tr
                                key={teamNum}
                                className={`clickable-row points-team-row${isExpanded ? ' expanded' : ''}`}
                                onClick={() => hasMultiple && togglePointsExpand(teamNum)}
                                style={{ cursor: hasMultiple ? 'pointer' : 'default' }}
                              >
                                <td>
                                  <span
                                    className="points-team-link"
                                    onClick={(e) => { e.stopPropagation(); setSelectedTeam(teamNum); setActiveTab('lookup'); }}
                                  >
                                    <strong>#{teamNum}</strong>
                                  </span>
                                </td>
                                <td>
                                  {hasMultiple && (
                                    <span className="expand-chevron">{isExpanded ? '▾' : '▸'}</span>
                                  )}
                                  {pts.matches}
                                </td>
                                <td>{pts.avgAutoFuel !== null ? pts.avgAutoFuel.toFixed(1) : <span className="no-data">No pit data</span>}</td>
                                <td>{pts.avgAutoClimb.toFixed(1)}</td>
                                <td>{pts.avgTeleopFuel !== null ? pts.avgTeleopFuel.toFixed(1) : <span className="no-data">No pit data</span>}</td>
                                <td>{pts.avgTeleopClimb.toFixed(1)}</td>
                                <td>{pts.avgDefense > 0 ? pts.avgDefense.toFixed(1) : <span className="no-data">N/A</span>}</td>
                                <td className="total-pts"><strong>{pts.avgTotal !== null ? pts.avgTotal.toFixed(1) : '—'}</strong></td>
                              </tr>
                              {isExpanded && teamMatches.map((m) => {
                                const mp = getMatchPointsBreakdown(m);
                                return (
                                  <tr key={`${teamNum}-${m.matchNumber}`} className="points-match-row">
                                    <td className="match-sub-label">Q{m.matchNumber}</td>
                                    <td></td>
                                    <td>{mp.autoFuel !== null ? mp.autoFuel.toFixed(1) : <span className="no-data">—</span>}</td>
                                    <td>{mp.autoClimb}</td>
                                    <td>{mp.teleopFuel !== null ? mp.teleopFuel.toFixed(1) : <span className="no-data">—</span>}</td>
                                    <td>{mp.teleopClimb}</td>
                                    <td>{mp.defense > 0 ? mp.defense.toFixed(1) : '—'}</td>
                                    <td className="total-pts">{mp.total.toFixed(1)}</td>
                                  </tr>
                                );
                              })}
                            </>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                {pointsView === 'chart' && (() => {
                  const CHART_METRICS = [
                    { key: 'avgTotal',       label: 'Total Points',   color: '#60a5fa' },
                    { key: 'avgAutoFuel',    label: 'Auto Fuel',      color: '#34d399' },
                    { key: 'avgAutoClimb',   label: 'Auto Climb',     color: '#a78bfa' },
                    { key: 'avgTeleopFuel',  label: 'Teleop Fuel',    color: '#fbbf24' },
                    { key: 'avgTeleopClimb', label: 'Teleop Climb',   color: '#f87171' },
                    { key: 'avgDefense',     label: 'Defense',        color: '#fb923c' },
                  ];
                  const activeMetric = CHART_METRICS.find(m => m.key === pointsChartMetric);
                  // Sort teams by selected metric descending for chart
                  const chartTeams = [...teamsWithMatchData].sort((a, b) => {
                    const sa = getTeamPointStats(a);
                    const sb = getTeamPointStats(b);
                    return (sb[pointsChartMetric] ?? 0) - (sa[pointsChartMetric] ?? 0);
                  });
                  const maxVal = Math.max(...chartTeams.map(t => getTeamPointStats(t)[pointsChartMetric] ?? 0), 1);
                  return (
                    <div className="points-chart-wrap">
                      <div className="points-metric-tabs">
                        {CHART_METRICS.map(m => (
                          <button
                            key={m.key}
                            className={`pts-metric-btn${pointsChartMetric === m.key ? ' active' : ''}`}
                            style={pointsChartMetric === m.key ? { borderColor: m.color, color: m.color, background: m.color + '22' } : {}}
                            onClick={() => setPointsChartMetric(m.key)}
                          >
                            {m.label}
                          </button>
                        ))}
                      </div>
                      <div className="points-bar-chart">
                        {chartTeams.map(teamNum => {
                          const pts = getTeamPointStats(teamNum);
                          const val = pts[pointsChartMetric] ?? 0;
                          const pct = (val / maxVal) * 100;
                          const isTotal = pointsChartMetric === 'avgTotal';
                          const SEGS = [
                            { key: 'avgAutoFuel',    color: '#34d399', label: 'Auto Fuel' },
                            { key: 'avgAutoClimb',   color: '#a78bfa', label: 'Auto Climb' },
                            { key: 'avgTeleopFuel',  color: '#fbbf24', label: 'Teleop Fuel' },
                            { key: 'avgTeleopClimb', color: '#f87171', label: 'Teleop Climb' },
                            { key: 'avgDefense',     color: '#fb923c', label: 'Defense' },
                          ];
                          return (
                            <div key={teamNum} className="pts-bar-row">
                              <span
                                className="pts-bar-label"
                                onClick={() => { setSelectedTeam(teamNum); setActiveTab('lookup'); }}
                              >
                                #{teamNum}
                              </span>
                              <div className="pts-bar-track">
                                {isTotal ? (
                                  <div className="pts-bar-fill pts-bar-stacked" style={{ width: `${pct}%` }}>
                                    {SEGS.filter(s => (pts[s.key] ?? 0) > 0).map(s => (
                                      <div
                                        key={s.key}
                                        className="pts-stack-seg"
                                        style={{ flex: pts[s.key], background: s.color }}
                                        title={`${s.label}: ${(pts[s.key] ?? 0).toFixed(1)}`}
                                      />
                                    ))}
                                  </div>
                                ) : (
                                  <div
                                    className="pts-bar-fill"
                                    style={{ width: `${pct}%`, background: activeMetric.color }}
                                  />
                                )}
                              </div>
                              <span className="pts-bar-value">{val > 0 ? val.toFixed(1) : '—'}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}
              </>
            )}
          </div>
        )}


      </div>
    </div>
  );
}
