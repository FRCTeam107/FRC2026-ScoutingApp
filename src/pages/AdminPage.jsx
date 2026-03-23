import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getCurrentEvent,
  setCurrentEvent,
  clearCurrentEvent,
  getFieldImage,
  setFieldImage,
  clearFieldImage,
  setMatchSchedule,
  clearAllMatchRecords,
  getMatchSchedule,
  getScouters,
  setScouters,
  getScoutingGroupSize,
  setScoutingGroupSize,
  getPickList,
  setPickList,
  getScratchedTeams,
  setScratchedTeams,
  clearScratchedTeams,
  restoreMatchRecords,
  restoreTeamProfiles,
} from '../lib/storage';
import { deleteAllMatchRecords, publishScoutingSchedule, unpublishScoutingSchedule, publishMatchSchedule, exportAllData } from '../lib/supabase';
import { getEventTeams, getEventInfo, getEventMatches, getEventRankings } from '../lib/tba';
import { PasswordModal } from '../components/common/PasswordModal';
import { isTestModeActive, loadTestData, unloadTestData } from '../lib/testData';
import { POSITIONS, POS_COLORS, buildSchedule } from '../lib/scheduleHelpers';
import './ManagerPage.css';
import './AdminPage.css';

// ── Component ────────────────────────────────────────────────────────────────────────────────

export function AdminPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('event');

  // ── Export / Import state ────────────────────────────────────────────────
  const [exportStatus, setExportStatus] = useState(null);
  const [exportMessage, setExportMessage] = useState('');
  const [importStatus, setImportStatus] = useState(null);
  const [importMessage, setImportMessage] = useState('');

  // ── Event Setup state ────────────────────────────────────────────────────
  const [eventKey, setEventKey] = useState('');
  const [eventLoading, setEventLoading] = useState(false);
  const [eventError, setEventError] = useState(null);
  const [currentEvent, setCurrentEventState] = useState(() => getCurrentEvent());
  const [testMode, setTestMode] = useState(() => isTestModeActive());
  const [fieldImage, setFieldImageState] = useState(() => getFieldImage());
  const fieldFileRef = useRef(null);

  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);

  // ── Scouting Schedule state ──────────────────────────────────────────────
  const [scouters, setScoutersState] = useState(() => getScouters());
  const [groupSize, setGroupSizeState] = useState(() => getScoutingGroupSize());
  const [newScouterName, setNewScouterName] = useState('');
  const [matchSchedule, setMatchScheduleState] = useState(() => getMatchSchedule());
  const [publishStatus, setPublishStatus] = useState('idle'); // idle | publishing | done | error

  // ── Alliance Selection state ───────────────────────────────────────────────
  const [rankings, setRankings] = useState([]);
  const [rankingsLoading, setRankingsLoading] = useState(false);
  const [rankingsError, setRankingsError] = useState(null);
  const [pickList, setPickListState] = useState(() => {
    const stored = getPickList();
    if (stored.length > 0) return stored;
    const ev = getCurrentEvent();
    if (!ev?.teams) return [];
    return [...ev.teams]
      .sort((a, b) => a.team_number - b.team_number)
      .map(t => ({ teamNumber: t.team_number, nickname: t.nickname || `Team ${t.team_number}` }));
  });
  const [scratched, setScratchedState] = useState(() => new Set(getScratchedTeams()));

  const schedule = buildSchedule(matchSchedule, scouters, groupSize);
  const totalMatchCount = matchSchedule
    ? matchSchedule.filter(m => m.comp_level === 'qm').length
    : 80;

  // ── Event Setup handlers ─────────────────────────────────────────────────
  const loadEvent = async () => {
    if (!eventKey.trim()) { setEventError('Please enter an event key'); return; }
    setEventLoading(true);
    setEventError(null);
    try {
      const [eventInfo, eventTeams, eventMatches] = await Promise.all([
        getEventInfo(eventKey.trim()),
        getEventTeams(eventKey.trim()),
        getEventMatches(eventKey.trim()),
      ]);
      setCurrentEvent(eventInfo.key, eventInfo.name, eventTeams, eventInfo.start_date, eventInfo.end_date);
      setCurrentEventState({
        key: eventInfo.key, name: eventInfo.name, teams: eventTeams,
        startDate: eventInfo.start_date, endDate: eventInfo.end_date,
        loadedAt: new Date().toISOString(),
      });
      setMatchSchedule(eventMatches);
      setMatchScheduleState(eventMatches);
      publishMatchSchedule(eventMatches).catch(err => console.error('Failed to publish match schedule:', err));
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

  const handlePasswordSuccess = async () => {
    setShowPasswordModal(false);
    if (pendingAction?.type === 'clearForNewEvent') {
      clearAllMatchRecords();
      clearCurrentEvent();
      setCurrentEventState(null);
      try { await deleteAllMatchRecords(); } catch (err) { console.error(err); }
    }
    setPendingAction(null);
  };

  const handleToggleTestMode = () => {
    if (testMode) { unloadTestData(); setTestMode(false); }
    else { loadTestData(); setTestMode(true); }
    setCurrentEventState(getCurrentEvent());
  };

  const handleFieldImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => { setFieldImage(ev.target.result); setFieldImageState(ev.target.result); };
    reader.readAsDataURL(file);
  };

  const handleClearFieldImage = () => {
    clearFieldImage();
    setFieldImageState(null);
    if (fieldFileRef.current) fieldFileRef.current.value = '';
  };

  // ── Scouting Schedule handlers ───────────────────────────────────────────
  const addScouter = () => {
    const name = newScouterName.trim();
    if (!name || scouters.includes(name)) return;
    const updated = [...scouters, name];
    setScoutersState(updated);
    setScouters(updated);
    setNewScouterName('');
  };

  const removeScouter = (name) => {
    const updated = scouters.filter(s => s !== name);
    setScoutersState(updated);
    setScouters(updated);
  };

  const moveScouter = (index, dir) => {
    const updated = [...scouters];
    const swap = index + dir;
    if (swap < 0 || swap >= updated.length) return;
    [updated[index], updated[swap]] = [updated[swap], updated[index]];
    setScoutersState(updated);
    setScouters(updated);
  };

  const updateGroupSize = (val) => {
    const n = Math.max(1, parseInt(val) || 1);
    setGroupSizeState(n);
    setScoutingGroupSize(n);
  };

  const handlePublish = async () => {
    setPublishStatus('publishing');
    try {
      await publishScoutingSchedule(scouters, groupSize, totalMatchCount);
      setPublishStatus('done');
      setTimeout(() => setPublishStatus('idle'), 3000);
    } catch (err) {
      console.error('Publish failed:', err);
      setPublishStatus('error');
      setTimeout(() => setPublishStatus('idle'), 4000);
    }
  };

  const handleUnpublish = async () => {
    setPublishStatus('publishing');
    try {
      await unpublishScoutingSchedule();
      setPublishStatus('idle');
    } catch (err) {
      console.error('Unpublish failed:', err);
      setPublishStatus('error');
      setTimeout(() => setPublishStatus('idle'), 4000);
    }
  };

  // ── Alliance Selection handlers ────────────────────────────────────────────
  const fetchRankings = async () => {
    if (!currentEvent) return;
    setRankingsLoading(true);
    setRankingsError(null);
    try {
      const data = await getEventRankings(currentEvent.key);
      setRankings(data);
      // If pick list is still in default team-number order, reset to ranking order
      if (pickList.length === 0 || getPickList().length === 0) {
        const newList = data.map(r => ({
          teamNumber: r.teamNumber,
          nickname: currentEvent.teams?.find(t => t.team_number === r.teamNumber)?.nickname || `Team ${r.teamNumber}`,
        }));
        setPickListState(newList);
        setPickList(newList);
      }
    } catch (err) {
      setRankingsError(err.message);
    } finally {
      setRankingsLoading(false);
    }
  };

  const resetPickToRankings = () => {
    const newList = rankings.map(r => ({
      teamNumber: r.teamNumber,
      nickname: currentEvent?.teams?.find(t => t.team_number === r.teamNumber)?.nickname || `Team ${r.teamNumber}`,
    }));
    setPickListState(newList);
    setPickList(newList);
  };

  const movePickTeam = (index, dir) => {
    const updated = [...pickList];
    const swap = index + dir;
    if (swap < 0 || swap >= updated.length) return;
    [updated[index], updated[swap]] = [updated[swap], updated[index]];
    setPickListState(updated);
    setPickList(updated);
  };

  const toggleScratch = (teamNumber) => {
    const updated = new Set(scratched);
    if (updated.has(teamNumber)) updated.delete(teamNumber);
    else updated.add(teamNumber);
    setScratchedState(updated);
    setScratchedTeams([...updated]);
  };

  const clearScratches = () => {
    setScratchedState(new Set());
    clearScratchedTeams();
  };

  // ── Export / Import handlers ──────────────────────────────────────────────
  const handleDownloadJSON = async () => {
    setExportStatus('loading');
    setExportMessage('');
    try {
      const { matchRecords, teamProfiles } = await exportAllData();
      const event = getCurrentEvent();
      const payload = {
        version: 1,
        exportedAt: new Date().toISOString(),
        eventKey: event?.key || null,
        eventName: event?.name || null,
        matchRecords,
        teamProfiles,
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `scouting-backup-${(event?.key || 'unknown')}-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setExportStatus('done');
      setExportMessage(`Downloaded ${matchRecords.length} match records and ${teamProfiles.length} pit profiles.`);
    } catch (err) {
      setExportStatus('error');
      setExportMessage(err.message || 'Export failed.');
    }
  };

  const handleDownloadCSV = async () => {
    setExportStatus('loading');
    setExportMessage('');
    try {
      const { matchRecords } = await exportAllData();
      if (matchRecords.length === 0) {
        setExportStatus('done');
        setExportMessage('No match records to export.');
        return;
      }
      const cols = Object.keys(matchRecords[0]);
      const escape = (v) => {
        if (v === null || v === undefined) return '';
        const s = String(v);
        return s.includes(',') || s.includes('"') || s.includes('\n')
          ? `"${s.replace(/"/g, '""')}"`
          : s;
      };
      const csv = [
        cols.join(','),
        ...matchRecords.map(r => cols.map(c => escape(r[c])).join(','))
      ].join('\n');
      const event = getCurrentEvent();
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `match-records-${(event?.key || 'unknown')}-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      setExportStatus('done');
      setExportMessage(`Downloaded ${matchRecords.length} rows as CSV.`);
    } catch (err) {
      setExportStatus('error');
      setExportMessage(err.message || 'CSV export failed.');
    }
  };

  const handleImportJSON = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportStatus('loading');
    setImportMessage('');
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const backup = JSON.parse(ev.target.result);
        if (!backup.version || !Array.isArray(backup.matchRecords) || !Array.isArray(backup.teamProfiles)) {
          throw new Error('Invalid backup file format.');
        }
        const appRecords = backup.matchRecords.map(r => ({
          teamNumber: r.team_number,
          matchNumber: r.match_number,
          allianceColor: r.alliance_color,
          autoFiringSeconds: r.auto_firing_seconds,
          autoAccuracy: r.auto_accuracy,
          autoClimb: r.auto_climb || 'None',
          autoPickupLocation: r.auto_pickup_location,
          autonFocus: r.auton_focus,
          teleopFiringSeconds: r.teleop_firing_seconds,
          teleopAccuracy: r.teleop_accuracy,
          teleopClimb: r.teleop_climb || 'None',
          pickupLocation: r.pickup_location,
          endgameFocus: r.endgame_focus,
          defenseRating: r.defense_rating,
          notes: r.notes,
          scouterDeviceId: r.scouter_device_id,
          createdAt: r.created_at,
        }));
        const appProfiles = {};
        backup.teamProfiles.forEach(p => {
          appProfiles[p.team_number] = {
            teamNumber: p.team_number,
            description: p.description,
            ballsPerSecond: p.balls_per_second,
            photoUrl: p.photo_url,
            trenchCapability: p.trench_capability || 'trench',
            updatedAt: p.updated_at,
          };
        });
        restoreMatchRecords(appRecords);
        restoreTeamProfiles(appProfiles);
        setImportStatus('done');
        setImportMessage(
          `Restored ${appRecords.length} match records and ${backup.teamProfiles.length} pit profiles` +
          (backup.eventName ? ` from "${backup.eventName}"` : '') + '.'
        );
      } catch (err) {
        setImportStatus('error');
        setImportMessage(err.message || 'Import failed.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="manager-page">
      <PasswordModal
        isOpen={showPasswordModal}
        onClose={() => { setShowPasswordModal(false); setPendingAction(null); }}
        onSuccess={handlePasswordSuccess}
        title="Clear Data for New Event"
      />

      <div className="page-header">
        <button className="back-btn" onClick={() => navigate('/')}>← Back</button>
        <h1>Admin</h1>
        <p>Event setup, field image, and developer tools</p>
      </div>

      <div className="tab-bar">
        <button className={`tab ${activeTab === 'event' ? 'active' : ''}`} onClick={() => setActiveTab('event')}>
          Event Setup
        </button>
        <button className={`tab ${activeTab === 'scouting' ? 'active' : ''}`} onClick={() => setActiveTab('scouting')}>
          Scouting Schedule
        </button>
        <button className={`tab ${activeTab === 'alliance' ? 'active' : ''}`} onClick={() => setActiveTab('alliance')}>
          Alliance Selection
        </button>
        <button className={`tab ${activeTab === 'export' ? 'active' : ''}`} onClick={() => setActiveTab('export')}>
          Export / Import
        </button>
      </div>

      <div className="tab-content">

        {/* ── Event Setup tab ─────────────────────────────────────────── */}
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
                <button className="load-event-btn" onClick={loadEvent} disabled={eventLoading}>
                  {eventLoading ? 'Loading...' : 'Load Event'}
                </button>
              </div>
              {eventError && <p className="event-error">{eventError}</p>}
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
                          {new Date(currentEvent.startDate).toLocaleDateString()} – {new Date(currentEvent.endDate).toLocaleDateString()}
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
                  <p className="admin-note">Clears match records and event data. Team profiles are kept.</p>
                </div>
              </>
            )}

            {!currentEvent && (
              <div className="no-event-state">
                <p>No event loaded</p>
                <p className="hint">Enter an event key above to load teams from The Blue Alliance.</p>
              </div>
            )}

            <div className="field-image-section">
              <h3>Field Image</h3>
              <p className="dev-note">Upload a field diagram image to use as the background in the Field Drawing tool.</p>
              <input ref={fieldFileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFieldImageUpload} />
              {fieldImage ? (
                <div className="field-image-preview-wrap">
                  <img src={fieldImage} alt="Field" className="field-image-preview" />
                  <div className="field-image-actions">
                    <button className="load-event-btn" onClick={() => fieldFileRef.current?.click()}>Replace Image</button>
                    <button className="danger-btn" onClick={handleClearFieldImage}>Remove Image</button>
                  </div>
                </div>
              ) : (
                <button className="load-event-btn" onClick={() => fieldFileRef.current?.click()}>Upload Field Image</button>
              )}
            </div>

            <div className="dev-tools-section">
              <div className="dev-tools-header">
                <span className="dev-badge">DEV</span>
                <h3>Test Data</h3>
              </div>
              <p className="dev-note">
                {testMode
                  ? 'Test mode active — fake event, 12 teams, 72 match records loaded. Your real data is backed up.'
                  : 'Load a fake event with pre-generated teams, profiles, and match records for testing. Real data is backed up and restored on unload.'}
              </p>
              <button className={`test-toggle-btn ${testMode ? 'active' : ''}`} onClick={handleToggleTestMode}>
                {testMode ? 'Unload Test Data' : 'Load Test Data'}
              </button>
            </div>
          </div>
        )}

        {/* ── Scouting Schedule tab ────────────────────────────────────── */}
        {activeTab === 'scouting' && (
          <div className="scouting-schedule-tab">

            {/* Config row */}
            <div className="ss-config-section">
              <div className="ss-config-row">
                <div className="ss-config-item">
                  <label className="ss-label">Matches per shift</label>
                  <p className="ss-hint">How many consecutive qual matches each team of 6 covers before rotating.</p>
                  <div className="ss-stepper">
                    <button className="ss-step-btn" onClick={() => updateGroupSize(groupSize - 1)} disabled={groupSize <= 1}>−</button>
                    <input
                      type="number"
                      className="ss-group-input"
                      min={1}
                      max={99}
                      value={groupSize}
                      onChange={(e) => updateGroupSize(e.target.value)}
                    />
                    <button className="ss-step-btn" onClick={() => updateGroupSize(groupSize + 1)}>+</button>
                  </div>
                </div>
              </div>
            </div>

            {/* Scouter list */}
            <div className="ss-scouters-section">
              <h3>Scouters <span className="ss-count">({scouters.length})</span></h3>
              <p className="ss-hint">
                6 scouters are active per shift — one per robot.
                {scouters.length > 6 && ` With ${scouters.length} scouters, ${scouters.length - 6} rotate out each shift.`}
                {scouters.length < 6 && scouters.length > 0 && ` ⚠ Need at least 6 scouters to generate a schedule.`}
              </p>

              <div className="ss-add-row">
                <input
                  type="text"
                  className="search-input"
                  placeholder="Scouter name"
                  value={newScouterName}
                  onChange={(e) => setNewScouterName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addScouter()}
                />
                <button className="load-event-btn" onClick={addScouter}>Add</button>
              </div>

              {scouters.length === 0 ? (
                <p className="ss-empty">No scouters added yet.</p>
              ) : (
                <ul className="ss-scouter-list">
                  {scouters.map((name, i) => (
                    <li key={name} className="ss-scouter-row">
                      <span className="ss-scouter-index">{i + 1}</span>
                      <span className="ss-scouter-name">{name}</span>
                      <div className="ss-scouter-actions">
                        <button className="ss-move-btn" onClick={() => moveScouter(i, -1)} disabled={i === 0} title="Move up">↑</button>
                        <button className="ss-move-btn" onClick={() => moveScouter(i, 1)} disabled={i === scouters.length - 1} title="Move down">↓</button>
                        <button className="ss-remove-btn" onClick={() => removeScouter(name)} title="Remove">✕</button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Publish */}
            <div className="ss-publish-section">
              <div className="ss-publish-row">
                <button
                  className={`ss-publish-btn${publishStatus === 'done' ? ' ss-publish-done' : publishStatus === 'error' ? ' ss-publish-error' : ''}`}
                  onClick={handlePublish}
                  disabled={scouters.length < 6 || publishStatus === 'publishing'}
                >
                  {publishStatus === 'publishing' ? 'Publishing…'
                    : publishStatus === 'done' ? '✓ Published to all devices'
                    : publishStatus === 'error' ? '✗ Publish failed'
                    : '📡 Publish Schedule'}
                </button>
                <button
                  className="ss-unpublish-btn"
                  onClick={handleUnpublish}
                  disabled={publishStatus === 'publishing'}
                >
                  Clear from devices
                </button>
              </div>
              {scouters.length < 6 && (
                <p className="ss-hint">Add at least 6 scouters before publishing.</p>
              )}
            </div>

            {/* Generated schedule */}
            <div className="ss-schedule-section">
              <h3>Generated Schedule</h3>

              {scouters.length === 0 && (
                <p className="ss-empty">Add scouters above to generate a schedule.</p>
              )}
              {scouters.length > 0 && scouters.length < 6 && (
                <p className="ss-empty ss-warn">⚠ At least 6 scouters are required (one per robot). Add {6 - scouters.length} more.</p>
              )}

              {schedule.length > 0 && (() => {
                const step = scouters.length - 6;
                return (
                  <>
                    <p className="ss-schedule-meta">
                      {schedule.length} shifts · {totalMatchCount} qual matches · {groupSize} match{groupSize !== 1 ? 'es' : ''} per shift
                      {step === 0 ? ' · same 6 scouters every shift' : ` · ${step} scouter${step !== 1 ? 's' : ''} rotate in/out each shift`}
                      {!matchSchedule && ' · (using 80-match estimate)'}
                    </p>
                    <div className="ss-table-wrap">
                      <table className="ss-table ss-pos-table">
                        <thead>
                          <tr>
                            <th>Shift</th>
                            <th>Matches</th>
                            {POSITIONS.map(p => (
                              <th key={p} style={{ color: POS_COLORS[p] }}>{p}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {schedule.map((row, i) => (
                            <tr key={i} className={i % 2 === 0 ? 'ss-row-even' : 'ss-row-odd'}>
                              <td className="ss-shift-num">{i + 1}</td>
                              <td className="ss-range-cell">
                                {row.from === row.to ? `Q${row.from}` : `Q${row.from}–Q${row.to}`}
                                <span className="ss-match-count"> ({row.count})</span>
                              </td>
                              {row.team.map(({ pos, name }) => (
                                <td key={pos} className="ss-pos-cell" style={{ borderTop: `2px solid ${POS_COLORS[pos]}22` }}>
                                  {name}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Per-scouter summary */}
                    <h3 className="ss-summary-heading">Summary by Scouter</h3>
                    <div className="ss-summary-grid">
                      {scouters.map(name => {
                        const myShifts = schedule.filter(r => r.team.some(t => t.name === name));
                        const total = myShifts.reduce((sum, r) => sum + r.count, 0);
                        // Find all positions this scouter holds across shifts
                        const positions = [...new Set(myShifts.flatMap(r =>
                          r.team.filter(t => t.name === name).map(t => t.pos)
                        ))];
                        return (
                          <div key={name} className="ss-summary-card">
                            <p className="ss-summary-name">{name}</p>
                            <p className="ss-summary-stat">{total} matches</p>
                            <p className="ss-summary-shifts">{myShifts.length} shift{myShifts.length !== 1 ? 's' : ''}</p>
                            <div className="ss-summary-pos">
                              {positions.map(p => (
                                <span key={p} className="ss-pos-badge" style={{ background: POS_COLORS[p] + '33', color: POS_COLORS[p], borderColor: POS_COLORS[p] + '66' }}>{p}</span>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        )}

        {/* ── Alliance Selection tab ───────────────────────────────────── */}
        {activeTab === 'alliance' && (
          <div className="alliance-tab">
            {!currentEvent && (
              <p className="ss-empty">Load an event first to use alliance selection.</p>
            )}
            {currentEvent && (
              <div className="as-panels">

                {/* Left — rankings */}
                <div className="as-panel">
                  <div className="as-panel-header">
                    <h3>Live Rankings</h3>
                    <button className="as-fetch-btn" onClick={fetchRankings} disabled={rankingsLoading}>
                      {rankingsLoading ? 'Loading…' : rankings.length ? '↻ Refresh' : 'Fetch Rankings'}
                    </button>
                  </div>
                  {rankingsError && <p className="as-error">{rankingsError}</p>}
                  {!rankingsError && rankings.length === 0 && (
                    <p className="as-empty">Hit "Fetch Rankings" to pull live standings from TBA.</p>
                  )}
                  {rankings.length > 0 && (
                    <div className="as-table-wrap">
                      <table className="as-table">
                        <thead>
                          <tr>
                            <th>#</th>
                            <th>Team</th>
                            <th>W-L-T</th>
                            <th>RP</th>
                          </tr>
                        </thead>
                        <tbody>
                          {rankings.map(r => (
                            <tr key={r.teamNumber} className={scratched.has(r.teamNumber) ? 'as-row-scratched' : ''}>
                              <td className="as-rank-cell">{r.rank}</td>
                              <td className="as-team-cell">
                                <span className="as-team-num">{r.teamNumber}</span>
                                <span className="as-team-name">{currentEvent.teams?.find(t => t.team_number === r.teamNumber)?.nickname || ''}</span>
                              </td>
                              <td className="as-record-cell">{r.wins}-{r.losses}-{r.ties}</td>
                              <td className="as-rp-cell">{typeof r.rankingScore === 'number' ? r.rankingScore.toFixed(2) : '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Right — pick list */}
                <div className="as-panel">
                  <div className="as-panel-header">
                    <h3>Pick List <span className="as-count">({pickList.filter(t => !scratched.has(t.teamNumber)).length} available)</span></h3>
                    <div className="as-panel-actions">
                      {rankings.length > 0 && (
                        <button className="as-reset-btn" onClick={resetPickToRankings}>Reset to Rankings</button>
                      )}
                      {scratched.size > 0 && (
                        <button className="as-clear-btn" onClick={clearScratches}>Clear Scratches</button>
                      )}
                    </div>
                  </div>
                  {pickList.length === 0 ? (
                    <p className="as-empty">Fetch rankings or the list will appear here automatically.</p>
                  ) : (
                    <ul className="as-pick-list">
                      {pickList.map((item, i) => {
                        const isScratched = scratched.has(item.teamNumber);
                        return (
                          <li key={item.teamNumber} className={`as-pick-item${isScratched ? ' as-scratched' : ''}`}>
                            <span className="as-pick-pos">{i + 1}</span>
                            <div className="as-pick-info">
                              <span className="as-pick-num">#{item.teamNumber}</span>
                              <span className="as-pick-name">{item.nickname}</span>
                            </div>
                            <div className="as-pick-controls">
                              <button className="as-move-btn" onClick={() => movePickTeam(i, -1)} disabled={i === 0 || isScratched}>↑</button>
                              <button className="as-move-btn" onClick={() => movePickTeam(i, 1)} disabled={i === pickList.length - 1 || isScratched}>↓</button>
                              <button
                                className={`as-scratch-btn${isScratched ? ' as-unscratch' : ''}`}
                                onClick={() => toggleScratch(item.teamNumber)}
                                title={isScratched ? 'Restore team' : 'Mark as picked/gone'}
                              >
                                {isScratched ? '↩' : '✕'}
                              </button>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>

              </div>
            )}
          </div>
        )}

        {/* ── Export / Import tab ────────────────────────────────────────── */}
        {activeTab === 'export' && (
          <div className="export-tab">
            <div className="export-section">
              <h3>Download Backup</h3>
              <p className="export-desc">
                Fetches the latest data from the database and saves it to your device.
                Use this to archive an event before loading a new one.
              </p>
              <div className="export-actions">
                <button
                  className="export-btn export-btn-primary"
                  onClick={handleDownloadJSON}
                  disabled={exportStatus === 'loading'}
                >
                  {exportStatus === 'loading' ? 'Downloading…' : '⬇ Download Full Backup (JSON)'}
                </button>
                <button
                  className="export-btn export-btn-secondary"
                  onClick={handleDownloadCSV}
                  disabled={exportStatus === 'loading'}
                >
                  {exportStatus === 'loading' ? 'Downloading…' : '⬇ Download Match Records (CSV)'}
                </button>
              </div>
              {exportStatus === 'done' && (
                <p className="export-status export-status-ok">✓ {exportMessage}</p>
              )}
              {exportStatus === 'error' && (
                <p className="export-status export-status-err">✗ {exportMessage}</p>
              )}
            </div>

            <div className="export-section">
              <h3>Restore from Backup</h3>
              <p className="export-desc">
                Load a previously downloaded JSON backup file onto this device.
                This will <strong>overwrite</strong> the current local data — it does not push to the database.
              </p>
              <label className="export-btn export-btn-import">
                📂 Choose Backup File (.json)
                <input
                  type="file"
                  accept=".json,application/json"
                  style={{ display: 'none' }}
                  onChange={handleImportJSON}
                />
              </label>
              {importStatus === 'loading' && (
                <p className="export-status">Reading file…</p>
              )}
              {importStatus === 'done' && (
                <p className="export-status export-status-ok">✓ {importMessage}</p>
              )}
              {importStatus === 'error' && (
                <p className="export-status export-status-err">✗ {importMessage}</p>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
