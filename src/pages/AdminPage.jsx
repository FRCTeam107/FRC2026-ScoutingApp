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
} from '../lib/storage';
import { deleteAllMatchRecords } from '../lib/supabase';
import { getEventTeams, getEventInfo, getEventMatches } from '../lib/tba';
import { PasswordModal } from '../components/common/PasswordModal';
import { isTestModeActive, loadTestData, unloadTestData } from '../lib/testData';
import './ManagerPage.css';
import './AdminPage.css';

// ── Scouting Schedule helpers ────────────────────────────────────────────────

function buildSchedule(matchSchedule, scouters, groupSize) {
  if (!matchSchedule || !scouters.length || groupSize < 1) return [];

  // Only qualification matches, sorted by match number
  const quals = matchSchedule
    .filter(m => m.comp_level === 'qm')
    .sort((a, b) => a.match_number - b.match_number);

  if (!quals.length) return [];

  const result = [];
  let groupIndex = 0;
  for (let i = 0; i < quals.length; i += groupSize) {
    const chunk = quals.slice(i, i + groupSize);
    const scouter = scouters[groupIndex % scouters.length];
    result.push({
      scouter,
      from: chunk[0].match_number,
      to: chunk[chunk.length - 1].match_number,
      count: chunk.length,
    });
    groupIndex++;
  }
  return result;
}

// ── Component ────────────────────────────────────────────────────────────────

export function AdminPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('event');

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
  const [matchSchedule] = useState(() => getMatchSchedule());

  const schedule = buildSchedule(matchSchedule, scouters, groupSize);

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
                  <p className="ss-hint">How many consecutive qual matches each scouter covers before rotating.</p>
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
              <p className="ss-hint">Add each person who will be scouting. Drag the order to control rotation.</p>

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

            {/* Generated schedule */}
            <div className="ss-schedule-section">
              <h3>Generated Schedule</h3>

              {!matchSchedule && (
                <p className="ss-empty">No match schedule loaded — load an event from the Event Setup tab first.</p>
              )}

              {matchSchedule && scouters.length === 0 && (
                <p className="ss-empty">Add scouters above to generate a schedule.</p>
              )}

              {matchSchedule && scouters.length > 0 && schedule.length === 0 && (
                <p className="ss-empty">No qualification matches found in the loaded schedule.</p>
              )}

              {schedule.length > 0 && (
                <>
                  <p className="ss-schedule-meta">
                    {schedule.length} shifts · {matchSchedule.filter(m => m.comp_level === 'qm').length} qual matches · rotating every {groupSize} match{groupSize !== 1 ? 'es' : ''}
                  </p>
                  <div className="ss-table-wrap">
                    <table className="ss-table">
                      <thead>
                        <tr>
                          <th>#</th>
                          <th>Scouter</th>
                          <th>Matches</th>
                          <th>Count</th>
                        </tr>
                      </thead>
                      <tbody>
                        {schedule.map((row, i) => (
                          <tr key={i} className={i % 2 === 0 ? 'ss-row-even' : 'ss-row-odd'}>
                            <td className="ss-shift-num">{i + 1}</td>
                            <td className="ss-name-cell">{row.scouter}</td>
                            <td className="ss-range-cell">
                              {row.from === row.to ? `Q${row.from}` : `Q${row.from} – Q${row.to}`}
                            </td>
                            <td className="ss-count-cell">{row.count}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Per-scouter summary */}
                  <h3 className="ss-summary-heading">Summary by Scouter</h3>
                  <div className="ss-summary-grid">
                    {scouters.map(name => {
                      const rows = schedule.filter(r => r.scouter === name);
                      const total = rows.reduce((sum, r) => sum + r.count, 0);
                      return (
                        <div key={name} className="ss-summary-card">
                          <p className="ss-summary-name">{name}</p>
                          <p className="ss-summary-stat">{total} matches</p>
                          <p className="ss-summary-shifts">{rows.length} shift{rows.length !== 1 ? 's' : ''}</p>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
