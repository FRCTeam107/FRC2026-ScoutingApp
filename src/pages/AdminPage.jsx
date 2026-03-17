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
} from '../lib/storage';
import { deleteAllMatchRecords } from '../lib/supabase';
import { getEventTeams, getEventInfo, getEventMatches } from '../lib/tba';
import { PasswordModal } from '../components/common/PasswordModal';
import { isTestModeActive, loadTestData, unloadTestData } from '../lib/testData';
import './ManagerPage.css';
import './AdminPage.css';

export function AdminPage() {
  const navigate = useNavigate();

  const [eventKey, setEventKey] = useState('');
  const [eventLoading, setEventLoading] = useState(false);
  const [eventError, setEventError] = useState(null);
  const [currentEvent, setCurrentEventState] = useState(() => getCurrentEvent());
  const [testMode, setTestMode] = useState(() => isTestModeActive());
  const [fieldImage, setFieldImageState] = useState(() => getFieldImage());
  const fieldFileRef = useRef(null);

  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);

  const loadEvent = async () => {
    if (!eventKey.trim()) {
      setEventError('Please enter an event key');
      return;
    }

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
        key: eventInfo.key,
        name: eventInfo.name,
        teams: eventTeams,
        startDate: eventInfo.start_date,
        endDate: eventInfo.end_date,
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
      try {
        await deleteAllMatchRecords();
      } catch (err) {
        console.error('Failed to clear cloud data:', err);
      }
    }

    setPendingAction(null);
  };

  const handleToggleTestMode = () => {
    if (testMode) {
      unloadTestData();
      setTestMode(false);
    } else {
      loadTestData();
      setTestMode(true);
    }
    setCurrentEventState(getCurrentEvent());
  };

  const handleFieldImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const base64 = ev.target.result;
      setFieldImage(base64);
      setFieldImageState(base64);
    };
    reader.readAsDataURL(file);
  };

  const handleClearFieldImage = () => {
    clearFieldImage();
    setFieldImageState(null);
    if (fieldFileRef.current) fieldFileRef.current.value = '';
  };

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

      <div className="tab-content">
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

          <div className="field-image-section">
            <h3>Field Image</h3>
            <p className="dev-note">Upload a field diagram image to use as the background in the Field Drawing tool.</p>
            <input
              ref={fieldFileRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleFieldImageUpload}
            />
            {fieldImage ? (
              <div className="field-image-preview-wrap">
                <img src={fieldImage} alt="Field" className="field-image-preview" />
                <div className="field-image-actions">
                  <button className="load-event-btn" onClick={() => fieldFileRef.current?.click()}>
                    Replace Image
                  </button>
                  <button className="danger-btn" onClick={handleClearFieldImage}>
                    Remove Image
                  </button>
                </div>
              </div>
            ) : (
              <button className="load-event-btn" onClick={() => fieldFileRef.current?.click()}>
                Upload Field Image
              </button>
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
            <button
              className={`test-toggle-btn ${testMode ? 'active' : ''}`}
              onClick={handleToggleTestMode}
            >
              {testMode ? 'Unload Test Data' : 'Load Test Data'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
