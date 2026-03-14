import { useState } from 'react';
import { getTeamEvents, getEventInfo, getEventTeams, getEventMatches } from '../../lib/tba';
import { setCurrentEvent, setMatchSchedule } from '../../lib/storage';
import './EventPickerModal.css';

const CURRENT_YEAR = new Date().getFullYear();

function formatDateRange(start, end) {
  const opts = { month: 'short', day: 'numeric' };
  const s = new Date(start + 'T12:00:00').toLocaleDateString('en-US', opts);
  const e = new Date(end + 'T12:00:00').toLocaleDateString('en-US', opts);
  return s === e ? s : `${s} – ${e}`;
}

export function EventPickerModal({ onClose, onEventLoaded }) {
  const [teamInput, setTeamInput] = useState('');
  const [events, setEvents] = useState(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [loadingEvent, setLoadingEvent] = useState(false);
  const [loadError, setLoadError] = useState(null);

  const searchEvents = async () => {
    const num = teamInput.trim();
    if (!num) { setSearchError('Enter a team number'); return; }
    setSearchLoading(true);
    setSearchError(null);
    setEvents(null);
    setSelectedEvent(null);
    try {
      const results = await getTeamEvents(num, CURRENT_YEAR);
      if (results.length === 0) {
        setSearchError(`No events found for team ${num} in ${CURRENT_YEAR}.`);
      } else {
        setEvents(results);
      }
    } catch (err) {
      setSearchError(err.message);
    } finally {
      setSearchLoading(false);
    }
  };

  const confirmLoad = async () => {
    if (!selectedEvent) return;
    setLoadingEvent(true);
    setLoadError(null);
    try {
      const [eventInfo, eventTeams, eventMatches] = await Promise.all([
        getEventInfo(selectedEvent.key),
        getEventTeams(selectedEvent.key),
        getEventMatches(selectedEvent.key)
      ]);
      setCurrentEvent(eventInfo.key, eventInfo.name, eventTeams, eventInfo.start_date, eventInfo.end_date);
      setMatchSchedule(eventMatches);
      onEventLoaded({
        key: eventInfo.key,
        name: eventInfo.name,
        teams: eventTeams,
        startDate: eventInfo.start_date,
        endDate: eventInfo.end_date,
        loadedAt: new Date().toISOString()
      }, eventMatches);
      onClose();
    } catch (err) {
      setLoadError(err.message);
    } finally {
      setLoadingEvent(false);
    }
  };

  return (
    <div className="epm-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="epm-modal">
        <div className="epm-header">
          <h2>Load Event</h2>
          <button className="epm-close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        <div className="epm-search-row">
          <input
            className="epm-input"
            type="number"
            placeholder="Team number (e.g. 107)"
            value={teamInput}
            onChange={(e) => setTeamInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && searchEvents()}
            autoFocus
          />
          <button
            className="epm-search-btn"
            onClick={searchEvents}
            disabled={searchLoading}
          >
            {searchLoading ? 'Searching…' : 'Find Events'}
          </button>
        </div>

        {searchError && <p className="epm-error">{searchError}</p>}

        {events && (
          <div className="epm-event-list">
            {events.map(ev => (
              <button
                key={ev.key}
                className={`epm-event-item${selectedEvent?.key === ev.key ? ' selected' : ''}`}
                onClick={() => setSelectedEvent(ev)}
              >
                <span className="epm-event-name">{ev.name}</span>
                <span className="epm-event-meta">
                  {ev.city ? `${ev.city}, ${ev.state_prov} · ` : ''}
                  {formatDateRange(ev.start_date, ev.end_date)}
                </span>
              </button>
            ))}
          </div>
        )}

        {loadError && <p className="epm-error">{loadError}</p>}

        {selectedEvent && (
          <button
            className="epm-confirm-btn"
            onClick={confirmLoad}
            disabled={loadingEvent}
          >
            {loadingEvent ? 'Loading event data…' : `Load ${selectedEvent.name}`}
          </button>
        )}
      </div>
    </div>
  );
}
