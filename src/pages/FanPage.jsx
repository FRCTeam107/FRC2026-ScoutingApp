import { useState, useEffect } from 'react';
import { getTeamEvents, getEventMatches, getEventRankings, getEventWebcasts } from '../lib/tba';

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
import './FanPage.css';

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
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  useEffect(() => {
    const year = new Date().getFullYear();
    getTeamEvents(TEAM_NUMBER, year)
      .then(events => {
        const event = pickEvent(events);
        if (!event) throw new Error('No events found for Team 107 this season.');
        return Promise.all([
          getEventMatches(event.key),
          getEventRankings(event.key).catch(() => null),
          getEventWebcasts(event.key).catch(() => []),
        ]).then(([matches, rankings, webcasts]) => {
          const myMatches = matches.filter(m =>
            m.alliances.red.team_keys.includes(TEAM_KEY) ||
            m.alliances.blue.team_keys.includes(TEAM_KEY)
          );
          const myRank = rankings?.find(r => r.teamNumber === TEAM_NUMBER) ?? null;
          setData({ matches: myMatches, rank: myRank, webcasts, eventKey: event.key, eventName: event.name });
        });
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

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
          {data?.eventName && (
            <p className="fan-hero-event">{data.eventName}</p>
          )}
          <div className="fan-hero-links">
            <a
              href={`https://www.thebluealliance.com/team/107/${new Date().getFullYear()}`}
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
