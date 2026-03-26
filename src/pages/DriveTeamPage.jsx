import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getCurrentEvent, getTeamProfiles, getMatchRecords, getMatchSchedule, setMatchSchedule } from '../lib/storage';
import { getEventMatches } from '../lib/tba';
import './DriveTeamPage.css';

function avg(arr) {
  if (!arr.length) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function mode(arr) {
  if (!arr.length) return null;
  const freq = {};
  let max = 0, result = null;
  for (const v of arr) {
    freq[v] = (freq[v] || 0) + 1;
    if (freq[v] > max) { max = freq[v]; result = v; }
  }
  return result;
}

function parseTeamNum(key) {
  return parseInt(key.replace('frc', ''));
}

// Higher = better expected output
function computePerfIndex(stats, profile) {
  if (!stats) return 0;
  const bps = profile?.ballsPerSecond || 1;
  const autoOut = stats.avgAutoFiring * (stats.avgAutoAcc / 100) * bps;
  const teleopOut = stats.avgTeleopFiring * (stats.avgTeleopAcc / 100) * bps;
  return autoOut + teleopOut;
}

// Build a human-readable label for any match (works for quals, double-elim, finals)
function formatMatchLabel(match) {
  const { comp_level: lvl, set_number: set, match_number: num } = match;
  if (lvl === 'qm') return `Qual ${num}`;
  if (lvl === 'ef') return `Elim ${set}-${num}`;
  if (lvl === 'qf') return `QF ${set}-${num}`;
  if (lvl === 'sf') return `SF ${set}-${num}`;
  if (lvl === 'f')  return `Final ${num}`;
  return `${lvl.toUpperCase()} ${set}-${num}`;
}

const LEVEL_ORDER = { qm: 0, ef: 1, qf: 2, sf: 3, f: 4 };
const LEVEL_GROUP = { qm: 'Qualifications', ef: 'Playoffs', qf: 'Playoffs', sf: 'Playoffs', f: 'Finals' };

export function DriveTeamPage() {
  const [selectedKey, setSelectedKey] = useState('');
  const [matchData, setMatchData]     = useState(null);
  const [schedule, setSchedule]       = useState([]);
  const [schedLoading, setSchedLoading] = useState(false);
  const [error, setError]             = useState(null);
  const [refreshKey, setRefreshKey]   = useState(0);

  useEffect(() => {
    const handler = () => setRefreshKey(k => k + 1);
    window.addEventListener('scouting-sync-complete', handler);
    return () => window.removeEventListener('scouting-sync-complete', handler);
  }, []);

  const currentEvent = getCurrentEvent();
  const profiles = getTeamProfiles();
  const allRecords = getMatchRecords();

  // Load schedule automatically when the event is known
  useEffect(() => {
    if (!currentEvent) return;
    const cached = getMatchSchedule();
    if (cached && cached.length) { setSchedule(cached); return; }
    setSchedLoading(true);
    getEventMatches(currentEvent.key)
      .then(data => { setMatchSchedule(data); setSchedule(data); })
      .catch(e => setError(e.message))
      .finally(() => setSchedLoading(false));
  }, [currentEvent?.key]); // eslint-disable-line react-hooks/exhaustive-deps

  // Group schedule into sections for the <select>
  const LEVEL_GROUP = { qm: 'Qualifications', ef: 'Playoffs', qf: 'Playoffs', sf: 'Playoffs', f: 'Finals' };
  const GROUP_ORDER = ['Qualifications', 'Playoffs', 'Finals', 'Other'];
  const grouped = schedule.reduce((acc, m) => {
    const group = LEVEL_GROUP[m.comp_level] ?? 'Other';
    if (!acc[group]) acc[group] = [];
    acc[group].push(m);
    return acc;
  }, {});

  function handleSelect(key) {
    setSelectedKey(key);
    setError(null);
    if (!key) { setMatchData(null); return; }
    const match = schedule.find(m => m.key === key);
    setMatchData(match ?? null);
  }

  const getTeamStats = (teamNumber) => {
    const recs = allRecords.filter(r => r.teamNumber === teamNumber)
      .sort((a, b) => a.matchNumber - b.matchNumber);
    if (!recs.length) return null;
    return {
      matchCount: recs.length,
      avgAutoFiring: avg(recs.map(r => r.autoFiringSeconds || 0)),
      avgTeleopFiring: avg(recs.map(r => r.teleopFiringSeconds || 0)),
      avgAutoAcc: avg(recs.map(r => r.autoAccuracy || 0)),
      avgTeleopAcc: avg(recs.map(r => r.teleopAccuracy || 0)),
      avgDefense: avg(recs.map(r => r.defenseRating || 0)),
      // Last 4 climbs with match numbers, newest last
      recentClimbs: recs.slice(-4).map(r => ({
        match: r.matchNumber,
        climb: r.teleopClimb || 'None',
      })),
      autonFocusMode: mode(recs.map(r => r.autonFocus).filter(Boolean)),
      endgameFocusMode: mode(recs.map(r => r.endgameFocus).filter(Boolean)),
      autoPickupMode: mode(recs.flatMap(r => Array.isArray(r.autoPickupLocation) ? r.autoPickupLocation : r.autoPickupLocation ? [r.autoPickupLocation] : [])),
      teleopPickupMode: mode(recs.flatMap(r => Array.isArray(r.pickupLocation) ? r.pickupLocation : r.pickupLocation ? [r.pickupLocation] : [])),
    };
  };

  const getTeamName = (teamNumber) => {
    const t = currentEvent?.teams?.find(t => t.team_number === teamNumber);
    return t?.nickname || `Team ${teamNumber}`;
  };

  const getAlliancePerfIndex = (teamKeys) =>
    teamKeys.reduce((sum, key) => {
      const n = parseTeamNum(key);
      return sum + computePerfIndex(getTeamStats(n), profiles[n]);
    }, 0);

  const renderTeamCard = (teamKey, color) => {
    const teamNumber = parseTeamNum(teamKey);
    const profile = profiles[teamNumber];
    const stats = getTeamStats(teamNumber);
    const perfIndex = computePerfIndex(stats, profile);

    return (
      <div key={teamKey} className={`dtc ${color}`}>
        <div className="dtc-header">
          <span className="dtc-number">#{teamNumber}</span>
          <span className="dtc-name">{getTeamName(teamNumber)}</span>
        </div>

        {(profile?.photoBase64 || profile?.photoUrl) && (
          <img className="dtc-photo" src={profile.photoBase64 || profile.photoUrl} alt={`Team ${teamNumber}`} />
        )}

        <div className="dtc-body">
          {/* ── Pit Data ── */}
          <div className="dtc-section-label">Pit Scouting</div>
          {profile ? (
            <>
              <div className="dtc-pit-row">
                {profile.ballsPerSecond && (
                  <span className="dtc-badge neutral">BPS: {profile.ballsPerSecond}</span>
                )}
                  {profile.trenchCapability === 'bump' && (
                    <span className="dtc-badge bump">Bump</span>
                  )}
                  {profile.trenchCapability === 'trench' && (
                    <span className="dtc-badge trench">Trench</span>
                  )}
                  {profile.trenchCapability === 'bumpAndTrench' && (
                    <span className="dtc-badge both">Both</span>
                  )}
                  {!profile.trenchCapability && (
                    <span className="dtc-badge unknown">Unknown</span>
                  )}
              </div>
              {profile.description && (
                <p className="dtc-desc">{profile.description}</p>
              )}
            </>
          ) : (
            <p className="dtc-no-pit">No pit data scouted</p>
          )}

          {/* ── Match Data ── */}
          <div className="dtc-section-label">Match Data</div>
          {stats ? (
            <>
              <div className="dtc-stat-grid">
                <div className="dtc-stat-cell">
                  <span className="dtc-stat-label">Avg Auto</span>
                  <span className="dtc-stat-val">{stats.avgAutoFiring.toFixed(1)}s @ {stats.avgAutoAcc.toFixed(0)}%</span>
                </div>
                <div className="dtc-stat-cell">
                  <span className="dtc-stat-label">Avg Teleop</span>
                  <span className="dtc-stat-val">{stats.avgTeleopFiring.toFixed(1)}s @ {stats.avgTeleopAcc.toFixed(0)}%</span>
                </div>
              </div>

              {/* Climbs with match numbers */}
              <div className="dtc-climb-row">
                <span className="dtc-stat-label">Climbs</span>
                <div className="dtc-climbs">
                  {stats.recentClimbs.map(({ match, climb }) => {
                    const c = ['L1', 'L2', 'L3'].includes(climb) ? climb : 'None';
                    return (
                      <span
                        key={match}
                        className={`dtc-climb-chip ${c === 'None' ? 'bad' : c === 'L1' ? 'warn' : 'good'}`}
                      >
                        #{match}: {c}
                      </span>
                    );
                  })}
                </div>
              </div>

              <div className="dtc-stat-grid">
                {stats.autonFocusMode && (
                  <div className="dtc-stat-cell">
                    <span className="dtc-stat-label">Auto Focus</span>
                    <span className="dtc-stat-val dtc-capitalize">{stats.autonFocusMode}</span>
                  </div>
                )}
                {stats.endgameFocusMode && (
                  <div className="dtc-stat-cell">
                    <span className="dtc-stat-label">Teleop Focus</span>
                    <span className="dtc-stat-val dtc-capitalize">{stats.endgameFocusMode}</span>
                  </div>
                )}
                {stats.autoPickupMode && (
                  <div className="dtc-stat-cell">
                    <span className="dtc-stat-label">Auto Pickup</span>
                    <span className="dtc-stat-val">{stats.autoPickupMode}</span>
                  </div>
                )}
                {stats.teleopPickupMode && (
                  <div className="dtc-stat-cell">
                    <span className="dtc-stat-label">Teleop Pickup</span>
                    <span className="dtc-stat-val">{stats.teleopPickupMode}</span>
                  </div>
                )}
              </div>

              {stats.avgDefense > 0.5 && (
                <div className="dtc-stat-cell dtc-defense-cell">
                  <span className="dtc-stat-label">Avg Defense</span>
                  <span className="dtc-stat-val">
                    {'★'.repeat(Math.round(stats.avgDefense))}{'☆'.repeat(5 - Math.round(stats.avgDefense))}
                    <span className="dtc-defense-num"> ({stats.avgDefense.toFixed(1)}/5)</span>
                  </span>
                </div>
              )}

              <div className="dtc-perf-row">
                <span className="dtc-perf-label">Perf Index</span>
                <span className="dtc-perf-val">{perfIndex.toFixed(1)}</span>
                <span className="dtc-match-count">({stats.matchCount} match{stats.matchCount !== 1 ? 'es' : ''})</span>
              </div>
            </>
          ) : (
            <p className="dtc-no-data">No match data scouted</p>
          )}
        </div>
      </div>
    );
  };

  const redKeys = matchData?.alliances?.red?.team_keys || [];
  const blueKeys = matchData?.alliances?.blue?.team_keys || [];
  const redPerf = matchData ? getAlliancePerfIndex(redKeys) : 0;
  const bluePerf = matchData ? getAlliancePerfIndex(blueKeys) : 0;
  const totalPerf = redPerf + bluePerf;
  const predictedWinner = redPerf > bluePerf ? 'red' : bluePerf > redPerf ? 'blue' : null;
  const perfDiff = Math.abs(redPerf - bluePerf);
  const redPct = totalPerf > 0 ? (redPerf / totalPerf) * 100 : 50;

  return (
    <div className="drive-team-page" key={refreshKey}>
      <div className="drive-top-bar">
        <div className="drive-title-row">
          <div>
            <h1>Drive Team</h1>
            {currentEvent
              ? <p className="event-name">{currentEvent.name}</p>
              : <p className="no-event-warn">No event loaded — set up in Manager first</p>
            }
          </div>
          <Link to="/field" className="field-link-btn">Field Drawing</Link>
        </div>

        <div className="match-lookup">
          <select
            className="match-select"
            value={selectedKey}
            onChange={e => handleSelect(e.target.value)}
            disabled={schedLoading || !currentEvent}
          >
            <option value="">
              {schedLoading ? 'Loading schedule…' : schedule.length ? '— Select a match —' : 'No schedule loaded'}
            </option>
            {GROUP_ORDER.filter(g => grouped[g]).map(group => (
              <optgroup key={group} label={group}>
                {grouped[group].map(m => (
                  <option key={m.key} value={m.key}>
                    {formatMatchLabel(m)}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>

        {error && <p className="match-error">{error}</p>}
      </div>

      {!matchData && !error && (
        <div className="drive-empty-state">
          <div className="drive-empty-icon">🏟️</div>
          <h2>Ready for Match Prep</h2>
          <p>Select a match from the dropdown to see alliance breakdowns and predictions.</p>
          <div className="drive-empty-tips">
            <div className="drive-tip"><strong>Qualifications</strong> — Round-robin rounds to earn playoff seeding.</div>
            <div className="drive-tip"><strong>Playoffs</strong> — Double-elimination bracket (e.g. SF 3-2).</div>
            <div className="drive-tip"><strong>Finals</strong> — Championship match.</div>
          </div>
          {!currentEvent && (
            <p className="drive-empty-warn">No event loaded — go to Manager → Event Setup to load a match schedule.</p>
          )}
        </div>
      )}

      {matchData && (
        <>
          <div className="match-label">
            {formatMatchLabel(matchData)}
          </div>

          <div className="alliance-grid">
            <div className="alliance-col">
              <div className="alliance-heading red">Red Alliance</div>
              {redKeys.map(k => renderTeamCard(k, 'red'))}
            </div>
            <div className="alliance-col">
              <div className="alliance-heading blue">Blue Alliance</div>
              {blueKeys.map(k => renderTeamCard(k, 'blue'))}
            </div>
          </div>

          <div className="prediction-section">
            <div className="prediction-header">Alliance Prediction</div>
            <div className="prediction-bar-track">
              <div
                className="prediction-bar-fill red"
                style={{ width: `${redPct}%` }}
              />
            </div>
            <div className="prediction-labels">
              <span className="pred-label red">Red {redPerf.toFixed(1)}</span>
              {predictedWinner ? (
                <span className={`pred-winner ${predictedWinner}`}>
                  {predictedWinner === 'red' ? '🔴 Red' : '🔵 Blue'} favored (+{perfDiff.toFixed(1)})
                </span>
              ) : (
                <span className="pred-even">Even match</span>
              )}
              <span className="pred-label blue">Blue {bluePerf.toFixed(1)}</span>
            </div>
            <p className="prediction-note">
              Perf Index = (avg auto firing × auto accuracy + avg teleop firing × teleop accuracy) × BPS.
              Higher index = more expected output. Defense rating not included.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
