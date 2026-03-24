import { useState, useEffect, useRef } from 'react';
import { getCurrentEvent } from '../../lib/storage';
import { getEventMatches, getEventRankings, getEventWebcasts } from '../../lib/tba';
import './Team107Dropdown.css';

const TEAM_NUMBER = 107;
const TEAM_KEY = `frc${TEAM_NUMBER}`;

const LEVEL_LABEL = { qm: 'Qual', ef: 'Elim', qf: 'QF', sf: 'SF', f: 'Final' };
const WEBCAST_LABEL = { twitch: 'Twitch', youtube: 'YouTube', livestream: 'Livestream' };

function formatMatchLabel(match) {
  const level = LEVEL_LABEL[match.comp_level] ?? match.comp_level.toUpperCase();
  if (match.comp_level === 'qm') return `${level} ${match.match_number}`;
  if (match.comp_level === 'f') return `${level} ${match.match_number}`;
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
    .join(', ');
}

function getOpponents(match, myAlliance) {
  const opp = myAlliance === 'red' ? 'blue' : 'red';
  return match.alliances[opp].team_keys
    .map(k => k.replace('frc', ''))
    .join(', ');
}

function MatchResult({ match }) {
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

  const partners  = getPartners(match, alliance);
  const opponents = getOpponents(match, alliance);

  return (
    <div className={`t107-match-row ${alliance}`}>
      <span className="t107-match-label">{formatMatchLabel(match)}</span>
      <span className={`t107-alliance-badge ${alliance}`}>{alliance.toUpperCase()}</span>
      <span className="t107-match-teams">
        <span className="t107-partners">w/ {partners}</span>
        <span className="t107-vs">vs {opponents}</span>
      </span>
      {played ? (
        <span className={`t107-score ${resultClass}`}>
          {myScore}–{oppScore} <strong>{resultLabel}</strong>
        </span>
      ) : (
        <span className="t107-score upcoming">Upcoming</span>
      )}
    </div>
  );
}

export function Team107Dropdown() {
  const [open, setOpen]     = useState(false);
  const [data, setData]     = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState(null);
  const panelRef            = useRef(null);

  // Fetch data the first time the panel opens
  useEffect(() => {
    if (!open || data || loading) return;
    const event = getCurrentEvent();
    if (!event?.key) {
      setError('No event selected. Set an event in Admin settings.');
      return;
    }

    setLoading(true);
    setError(null);

    Promise.all([
      getEventMatches(event.key),
      getEventRankings(event.key).catch(() => null),
      getEventWebcasts(event.key).catch(() => []),
    ])
      .then(([matches, rankings, webcasts]) => {
        const myMatches = matches.filter(m =>
          m.alliances.red.team_keys.includes(TEAM_KEY) ||
          m.alliances.blue.team_keys.includes(TEAM_KEY)
        );
        const myRank = rankings?.find(r => r.teamNumber === TEAM_NUMBER) ?? null;
        setData({ matches: myMatches, rank: myRank, webcasts, eventKey: event.key, eventName: event.name });
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [open, data, loading]);

  // Close when clicking outside
  useEffect(() => {
    if (!open) return;
    function handleClick(e) {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const playedMatches   = data?.matches.filter(m => m.alliances.red.score !== null && m.alliances.red.score !== -1) ?? [];
  const upcomingMatches = data?.matches.filter(m => m.alliances.red.score === null || m.alliances.red.score === -1) ?? [];

  return (
    <div className="t107-dropdown-wrapper" ref={panelRef}>
      <button
        className={`t107-fan-btn ${open ? 'active' : ''}`}
        onClick={() => setOpen(v => !v)}
        aria-expanded={open}
        title="Team 107 fan info"
      >
        107 Fan ▾
      </button>

      {open && (
        <div className="t107-panel">
          {/* Header */}
          <div className="t107-panel-header">
            <div className="t107-team-name">
              <span className="t107-number">107</span>
              <span className="t107-name">R.O.B.O. Rangers</span>
            </div>
            <div className="t107-panel-links">
              <a
                href={`https://www.thebluealliance.com/team/107/${new Date().getFullYear()}`}
                target="_blank"
                rel="noopener noreferrer"
                className="t107-ext-link"
              >
                TBA ↗
              </a>
              {data?.eventKey && (
                <a
                  href={`https://www.thebluealliance.com/event/${data.eventKey}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="t107-ext-link"
                >
                  Event ↗
                </a>
              )}
            </div>
          </div>

          {loading && <div className="t107-loading">Loading…</div>}
          {error   && <div className="t107-error">{error}</div>}

          {data && (
            <>
              {/* Livestreams */}
              {data.webcasts.length > 0 && (
                <section className="t107-section">
                  <h4 className="t107-section-title">📡 Livestream</h4>
                  <div className="t107-webcasts">
                    {data.webcasts.map((w, i) => (
                      <a
                        key={i}
                        href={w.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`t107-webcast-link ${w.type}`}
                      >
                        {WEBCAST_LABEL[w.type] ?? w.type} – {w.channel} ↗
                      </a>
                    ))}
                  </div>
                </section>
              )}

              {/* Ranking / Stats */}
              {data.rank ? (
                <section className="t107-section">
                  <h4 className="t107-section-title">🏆 Current Standing</h4>
                  <div className="t107-rank-row">
                    <div className="t107-rank-stat">
                      <span className="t107-stat-value">#{data.rank.rank}</span>
                      <span className="t107-stat-label">Rank</span>
                    </div>
                    <div className="t107-rank-stat">
                      <span className="t107-stat-value">
                        {data.rank.wins}-{data.rank.losses}-{data.rank.ties}
                      </span>
                      <span className="t107-stat-label">W-L-T</span>
                    </div>
                    <div className="t107-rank-stat">
                      <span className="t107-stat-value">{data.rank.rankingScore.toFixed(2)}</span>
                      <span className="t107-stat-label">Rank Score</span>
                    </div>
                  </div>
                </section>
              ) : (
                <section className="t107-section">
                  <h4 className="t107-section-title">🏆 Current Standing</h4>
                  <p className="t107-muted">Rankings not yet available.</p>
                </section>
              )}

              {/* Upcoming matches */}
              {upcomingMatches.length > 0 && (
                <section className="t107-section">
                  <h4 className="t107-section-title">🗓 Upcoming Matches</h4>
                  {upcomingMatches.map(m => <MatchResult key={m.key} match={m} />)}
                </section>
              )}

              {/* Completed matches */}
              {playedMatches.length > 0 && (
                <section className="t107-section">
                  <h4 className="t107-section-title">✅ Completed Matches</h4>
                  {playedMatches.map(m => <MatchResult key={m.key} match={m} />)}
                </section>
              )}

              {data.matches.length === 0 && (
                <p className="t107-muted">No matches found for Team 107 at this event.</p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
