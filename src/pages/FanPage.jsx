import { useState, useEffect, useRef } from 'react';
import { getTeamEvents, getEventMatches, getEventRankings, getEventWebcasts, getEventInfo } from '../lib/tba';
import './FanPage.css';

function pickEvent(events) {
  const today = new Date().toISOString().slice(0, 10); // 'YYYY-MM-DD'
  // 1. Currently ongoing
  const ongoing = events.find(e => e.start_date <= today && e.end_date >= today);
  if (ongoing) return ongoing;
  // 2. Next upcoming
  const upcoming = events.filter(e => e.start_date > today).sort((a, b) => a.start_date.localeCompare(b.start_date));
  if (upcoming.length) return upcoming[0];
  // 3. Most recently completed
  const past = events.filter(e => e.end_date < today).sort((a, b) => b.end_date.localeCompare(a.end_date));
  return past[0] ?? null;
}

const EVENT_OVERRIDE_KEY = 'fan_event_override';

const TEAM_NUMBER = 107;
const TEAM_KEY = `frc${TEAM_NUMBER}`;

const LEVEL_LABEL = { qm: 'Qual', ef: 'Elim', qf: 'QF', sf: 'SF', f: 'Final' };
const WEBCAST_LABEL = { twitch: 'Twitch', youtube: 'YouTube', livestream: 'Livestream' };

function formatMatchLabel(match) {
  const level = LEVEL_LABEL[match.comp_level] ?? match.comp_level.toUpperCase();
  if (match.comp_level === 'qm') return `${level} ${match.match_number}`;
  if (match.comp_level === 'f') return `Final ${match.match_number}`;
  return `${level} ${match.set_number}-${match.match_number}`;
}

function getMyAlliance(match) {
  if (match.alliances.red.team_keys.includes(TEAM_KEY)) return 'red';
  if (match.alliances.blue.team_keys.includes(TEAM_KEY)) return 'blue';
  return null;
}

function getPartners(match, alliance) {
  return match.alliances[alliance].team_keys
    .filter(k => k !== TEAM_KEY)
    .map(k => k.replace('frc', ''))
    .join(' & ');
}

function getOpponents(match, myAlliance) {
  const opp = myAlliance === 'red' ? 'blue' : 'red';
  return match.alliances[opp].team_keys
    .map(k => k.replace('frc', ''))
    .join(', ');
}

function MatchRow({ match }) {
  const alliance = getMyAlliance(match);
  if (!alliance) return null;

  const myScore  = match.alliances[alliance].score;
  const oppKey   = alliance === 'red' ? 'blue' : 'red';
  const oppScore = match.alliances[oppKey].score;
  const played   = myScore !== null && myScore !== -1;
  const won      = match.winning_alliance === alliance;
  const tied     = match.winning_alliance === 'tie' || (played && myScore === oppScore);

  const resultLabel = !played ? null : tied ? 'TIE' : won ? 'WIN' : 'LOSS';
  const resultClass = !played ? '' : tied ? 'tie' : won ? 'win' : 'loss';

  return (
    <div className={`fan-match-row ${alliance}`}>
      <div className="fan-match-left">
        <span className="fan-match-label">{formatMatchLabel(match)}</span>
        <span className={`fan-alliance-tag ${alliance}`}>{alliance.toUpperCase()}</span>
      </div>
      <div className="fan-match-center">
        <span className="fan-partners">w/ {getPartners(match, alliance)}</span>
        <span className="fan-opponents">vs {getOpponents(match, alliance)}</span>
      </div>
      <div className="fan-match-right">
        {played ? (
          <>
            <span className="fan-final-score">{myScore}–{oppScore}</span>
            <span className={`fan-result-badge ${resultClass}`}>{resultLabel}</span>
          </>
        ) : (
          <span className="fan-upcoming-badge">Upcoming</span>
        )}
      </div>
    </div>
  );
}

export function FanPage() {
  const year = new Date().getFullYear();

  // All of Team 107's events this season (populated after first fetch)
  const [allEvents, setAllEvents]       = useState([]);
  // Auto-detected event key from Team 107's schedule (null until loaded)
  const [autoEventKey, setAutoEventKey] = useState(null);
  // Manual override stored in localStorage (null = follow auto-detect)
  const [overrideKey, setOverrideKey]   = useState(
    () => localStorage.getItem(EVENT_OVERRIDE_KEY) || null
  );

  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  // Event picker UI state
  const [showPicker, setShowPicker]     = useState(false);
  const [customInput, setCustomInput]   = useState('');
  const [pickerError, setPickerError]   = useState('');
  const pickerRef = useRef(null);

  const activeKey = overrideKey ?? autoEventKey;

  // ── Step 1: Load Team 107's events once ──────────────────────────────
  useEffect(() => {
    getTeamEvents(TEAM_NUMBER, year)
      .then(events => {
        setAllEvents(events);
        const def = pickEvent(events);
        if (def) {
          setAutoEventKey(def.key);
        } else if (!overrideKey) {
          setError('No events found for Team 107 this season.');
          setLoading(false);
        }
      })
      .catch(e => {
        if (!overrideKey) {
          setError(e.message);
          setLoading(false);
        }
      });
  }, [year]); // eslint-disable-line react-hooks/exhaustive-deps

  const [refreshCount, setRefreshCount] = useState(0);
  const [refreshing, setRefreshing]     = useState(false);
  const [lastUpdated, setLastUpdated]   = useState(null);

  function refresh() {
    setRefreshCount(c => c + 1);
  }

  // ── Step 2: Load event data when the active key is determined/changed ─
  useEffect(() => {
    if (!activeKey) return;
    const isInitial = refreshCount === 0;
    if (isInitial) { setLoading(true); setData(null); }
    else { setRefreshing(true); }
    setError(null);
    Promise.all([
      getEventMatches(activeKey),
      getEventRankings(activeKey).catch(() => null),
      getEventWebcasts(activeKey).catch(() => []),
      getEventInfo(activeKey).catch(() => null),
    ]).then(([matches, rankings, webcasts, eventInfo]) => {
      const myMatches = matches.filter(m =>
        m.alliances.red.team_keys.includes(TEAM_KEY) ||
        m.alliances.blue.team_keys.includes(TEAM_KEY)
      );
      const myRank = rankings?.find(r => r.teamNumber === TEAM_NUMBER) ?? null;
      const knownEvent = allEvents.find(e => e.key === activeKey);
      setData({
        matches: myMatches,
        rank: myRank,
        webcasts,
        eventKey: activeKey,
        eventName: knownEvent?.name ?? eventInfo?.name ?? activeKey,
      });
      setLastUpdated(new Date());
    })
    .catch(e => setError(e.message))
    .finally(() => { setLoading(false); setRefreshing(false); });
  }, [activeKey, refreshCount]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Fix event name once allEvents arrives (handles override on first load) ──
  useEffect(() => {
    if (!allEvents.length || !data) return;
    const eventInfo = allEvents.find(e => e.key === data.eventKey);
    if (eventInfo && data.eventName === data.eventKey) {
      setData(prev => prev ? { ...prev, eventName: eventInfo.name } : prev);
    }
  }, [allEvents]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Close picker when clicking outside ───────────────────────────────
  useEffect(() => {
    if (!showPicker) return;
    function handler(e) {
      if (pickerRef.current && !pickerRef.current.contains(e.target)) {
        setShowPicker(false);
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showPicker]);

  function selectEvent(key) {
    if (!key) return;
    if (key === '__auto__') {
      localStorage.removeItem(EVENT_OVERRIDE_KEY);
      setOverrideKey(null);
    } else {
      localStorage.setItem(EVENT_OVERRIDE_KEY, key);
      setOverrideKey(key);
    }
    setShowPicker(false);
    setCustomInput('');
    setPickerError('');
  }

  function handleCustomLoad() {
    const key = customInput.trim().toLowerCase();
    if (!key) { setPickerError('Enter an event key (e.g. 2026miket).'); return; }
    setPickerError('');
    selectEvent(key);
  }

  const isOverriding = !!overrideKey;
  const playedMatches   = data?.matches.filter(m => {
    const s = m.alliances.red.score;
    return s !== null && s !== -1;
  }) ?? [];
  const upcomingMatches = data?.matches.filter(m => {
    const s = m.alliances.red.score;
    return s === null || s === -1;
  }) ?? [];

  const wins   = playedMatches.filter(m => m.winning_alliance === getMyAlliance(m)).length;
  const losses = playedMatches.filter(m => {
    const a = getMyAlliance(m);
    return m.winning_alliance !== a && m.winning_alliance !== 'tie' && m.winning_alliance !== '';
  }).length;
  const ties   = playedMatches.filter(m => m.winning_alliance === 'tie').length;

  return (
    <div className="fan-page">
      {/* ── Page hero ── */}
      <div className="fan-hero">
        <div className="fan-hero-number">107</div>
        <div className="fan-hero-info">
          <h1 className="fan-hero-name">Team R.O.B.O.T.I.C.S.</h1>
          <div className="fan-event-row">
            {data?.eventName && (
              <p className="fan-hero-event">{data.eventName}</p>
            )}
            {loading && !data && (
              <p className="fan-hero-event fan-muted">Loading…</p>
            )}
            <div className="fan-event-change-wrap" ref={pickerRef}>
              <button
                className={`fan-change-event-btn ${isOverriding ? 'overriding' : ''}`}
                onClick={() => setShowPicker(p => !p)}
                title="Change event"
              >
                {isOverriding ? '📅 Custom Event' : '📅 Change Event'}
              </button>

              {showPicker && (
                <div className="fan-event-picker">
                  <p className="fan-picker-heading">Select an event to view</p>

                  {/* Auto-detect option */}
                  <button
                    className={`fan-picker-option ${!overrideKey ? 'active' : ''}`}
                    onClick={() => selectEvent('__auto__')}
                  >
                    <span className="fan-picker-option-label">
                      🤖 Auto-detect (Team 107)
                    </span>
                    {autoEventKey && (
                      <span className="fan-picker-option-sub">
                        {allEvents.find(e => e.key === autoEventKey)?.name ?? autoEventKey}
                      </span>
                    )}
                  </button>

                  {/* Team 107's events this season */}
                  {allEvents.length > 0 && (
                    <>
                      <p className="fan-picker-subheading">Team 107 events this season</p>
                      <div className="fan-picker-list">
                        {allEvents.map(ev => (
                          <button
                            key={ev.key}
                            className={`fan-picker-option ${overrideKey === ev.key ? 'active' : ''}`}
                            onClick={() => selectEvent(ev.key)}
                          >
                            <span className="fan-picker-option-label">{ev.name}</span>
                            <span className="fan-picker-option-sub">{ev.start_date}</span>
                          </button>
                        ))}
                      </div>
                    </>
                  )}

                  {/* Custom event key */}
                  <p className="fan-picker-subheading">Or enter any event key</p>
                  <div className="fan-picker-custom-row">
                    <input
                      className="fan-picker-input"
                      type="text"
                      placeholder="e.g. 2026miket"
                      value={customInput}
                      onChange={e => { setCustomInput(e.target.value); setPickerError(''); }}
                      onKeyDown={e => e.key === 'Enter' && handleCustomLoad()}
                    />
                    <button className="fan-picker-load-btn" onClick={handleCustomLoad}>Load</button>
                  </div>
                  {pickerError && <p className="fan-picker-error">{pickerError}</p>}
                </div>
              )}
            </div>
          </div>

          <div className="fan-hero-links">
            <a
              href={`https://www.thebluealliance.com/team/107/${year}`}
              target="_blank"
              rel="noopener noreferrer"
              className="fan-ext-link"
            >
              TBA ↗
            </a>
            {data?.eventKey && (
              <a
                href={`https://www.thebluealliance.com/event/${data.eventKey}`}
                target="_blank"
                rel="noopener noreferrer"
                className="fan-ext-link"
              >
                Event Page ↗
              </a>
            )}
          </div>
        </div>
      </div>

      {/* ── Refresh bar ── */}
      <div className="fan-refresh-bar">
        <button
          className={`fan-refresh-btn ${refreshing ? 'spinning' : ''}`}
          onClick={refresh}
          disabled={loading || refreshing}
          title="Refresh match data"
        >
          🔄 {refreshing ? 'Refreshing…' : 'Refresh'}
        </button>
        {lastUpdated && !refreshing && (
          <span className="fan-last-updated">
            Updated {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        )}
      </div>

      {loading && <div className="fan-loading">Loading event data…</div>}
      {error   && <div className="fan-error">{error}</div>}

      {data && (
        <div className="fan-content">
          {/* ── Livestreams ── */}
          {data.webcasts.length > 0 && (
            <section className="fan-section">
              <h2 className="fan-section-title">📡 Livestream</h2>
              <div className="fan-webcasts">
                {data.webcasts.map((w, i) => (
                  <a
                    key={i}
                    href={w.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`fan-webcast-btn ${w.type}`}
                  >
                    {WEBCAST_LABEL[w.type] ?? w.type} — {w.channel} ↗
                  </a>
                ))}
              </div>
            </section>
          )}

          {/* ── Stats row ── */}
          <section className="fan-section">
            <h2 className="fan-section-title">🏆 Current Standing</h2>
            {data.rank ? (
              <div className="fan-stats-grid">
                <div className="fan-stat-card">
                  <span className="fan-stat-value">#{data.rank.rank}</span>
                  <span className="fan-stat-label">Rank</span>
                </div>
                <div className="fan-stat-card">
                  <span className="fan-stat-value">
                    {data.rank.wins}-{data.rank.losses}-{data.rank.ties}
                  </span>
                  <span className="fan-stat-label">W-L-T</span>
                </div>
                <div className="fan-stat-card">
                  <span className="fan-stat-value">{data.rank.rankingScore.toFixed(2)}</span>
                  <span className="fan-stat-label">Rank Score</span>
                </div>
                <div className="fan-stat-card">
                  <span className="fan-stat-value">{playedMatches.length}</span>
                  <span className="fan-stat-label">Played</span>
                </div>
              </div>
            ) : (
              <p className="fan-muted">Rankings not yet available for this event.</p>
            )}

            {/* Quick record if no rankings yet but matches played */}
            {!data.rank && playedMatches.length > 0 && (
              <div className="fan-stats-grid" style={{ marginTop: '12px' }}>
                <div className="fan-stat-card win">
                  <span className="fan-stat-value">{wins}</span>
                  <span className="fan-stat-label">Wins</span>
                </div>
                <div className="fan-stat-card loss">
                  <span className="fan-stat-value">{losses}</span>
                  <span className="fan-stat-label">Losses</span>
                </div>
                <div className="fan-stat-card tie">
                  <span className="fan-stat-value">{ties}</span>
                  <span className="fan-stat-label">Ties</span>
                </div>
              </div>
            )}
          </section>

          {/* ── Upcoming matches ── */}
          {upcomingMatches.length > 0 && (
            <section className="fan-section">
              <h2 className="fan-section-title">🗓 Upcoming Matches</h2>
              <div className="fan-match-list">
                {upcomingMatches.map(m => <MatchRow key={m.key} match={m} />)}
              </div>
            </section>
          )}

          {/* ── Completed matches ── */}
          {playedMatches.length > 0 && (
            <section className="fan-section">
              <h2 className="fan-section-title">✅ Completed Matches</h2>
              <div className="fan-match-list">
                {playedMatches.map(m => <MatchRow key={m.key} match={m} />)}
              </div>
            </section>
          )}

          {data.matches.length === 0 && (
            <p className="fan-muted">No matches found for Team 107 at this event yet.</p>
          )}
        </div>
      )}
    </div>
  );
}
