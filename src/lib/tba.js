// The Blue Alliance API integration
const TBA_BASE = 'https://www.thebluealliance.com/api/v3';
const TBA_KEY = import.meta.env.VITE_TBA_KEY;

/**
 * Fetch teams attending an event
 * @param {string} eventKey - Event key (e.g., '2026miket')
 * @returns {Promise<Array<{team_number: number, nickname: string, city: string, state_prov: string}>>}
 */
export async function getEventTeams(eventKey) {
  if (!TBA_KEY) {
    throw new Error('TBA API key not configured. Add VITE_TBA_KEY to your .env.local file.');
  }

  const response = await fetch(`${TBA_BASE}/event/${eventKey}/teams/simple`, {
    headers: {
      'X-TBA-Auth-Key': TBA_KEY
    }
  });

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error(`Event "${eventKey}" not found. Check the event key format (e.g., 2026miket).`);
    }
    if (response.status === 401) {
      throw new Error('Invalid TBA API key. Check your VITE_TBA_KEY in .env.local.');
    }
    throw new Error(`Failed to fetch teams: ${response.statusText}`);
  }

  const teams = await response.json();
  return teams.map(team => ({
    team_number: team.team_number,
    nickname: team.nickname || `Team ${team.team_number}`,
    city: team.city || '',
    state_prov: team.state_prov || ''
  })).sort((a, b) => a.team_number - b.team_number);
}

/**
 * Fetch match schedule for an event
 * @param {string} eventKey - Event key (e.g., '2026miket')
 * @returns {Promise<Array>} Array of match objects with alliance team keys
 */
export async function getEventMatches(eventKey) {
  if (!TBA_KEY) {
    throw new Error('TBA API key not configured. Add VITE_TBA_KEY to your .env.local file.');
  }

  const response = await fetch(`${TBA_BASE}/event/${eventKey}/matches/simple`, {
    headers: {
      'X-TBA-Auth-Key': TBA_KEY
    }
  });

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error(`Event "${eventKey}" not found.`);
    }
    throw new Error(`Failed to fetch match schedule: ${response.statusText}`);
  }

  const matches = await response.json();
  return matches.sort((a, b) => {
    const levelOrder = { qm: 0, ef: 1, qf: 2, sf: 3, f: 4 };
    if (a.comp_level !== b.comp_level) return (levelOrder[a.comp_level] ?? 9) - (levelOrder[b.comp_level] ?? 9);
    if (a.set_number !== b.set_number) return a.set_number - b.set_number;
    return a.match_number - b.match_number;
  });
}

/**
 * Fetch full match objects for an event (includes predicted_time and time fields)
 * Used by the fan page to show expected match times.
 */
export async function getEventMatchesFull(eventKey) {
  if (!TBA_KEY) {
    throw new Error('TBA API key not configured. Add VITE_TBA_KEY to your .env.local file.');
  }

  const response = await fetch(`${TBA_BASE}/event/${eventKey}/matches`, {
    headers: { 'X-TBA-Auth-Key': TBA_KEY }
  });

  if (!response.ok) {
    if (response.status === 404) throw new Error(`Event "${eventKey}" not found.`);
    throw new Error(`Failed to fetch match schedule: ${response.statusText}`);
  }

  const matches = await response.json();
  const levelOrder = { qm: 0, ef: 1, qf: 2, sf: 3, f: 4 };
  return matches.sort((a, b) => {
    if (a.comp_level !== b.comp_level) return (levelOrder[a.comp_level] ?? 9) - (levelOrder[b.comp_level] ?? 9);
    if (a.set_number !== b.set_number) return a.set_number - b.set_number;
    return a.match_number - b.match_number;
  });
}

/**
 * Fetch events for a team in a given year
 * @param {number|string} teamNumber - Team number (e.g., 107)
 * @param {number} year - Year (e.g., 2026)
 * @returns {Promise<Array>}
 */
export async function getTeamEvents(teamNumber, year) {
  if (!TBA_KEY) {
    throw new Error('TBA API key not configured. Add VITE_TBA_KEY to your .env.local file.');
  }

  const response = await fetch(`${TBA_BASE}/team/frc${teamNumber}/events/${year}/simple`, {
    headers: {
      'X-TBA-Auth-Key': TBA_KEY
    }
  });

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error(`No events found for team ${teamNumber} in ${year}.`);
    }
    if (response.status === 401) {
      throw new Error('Invalid TBA API key. Check your VITE_TBA_KEY in .env.local.');
    }
    throw new Error(`Failed to fetch events: ${response.statusText}`);
  }

  const events = await response.json();
  return events
    .sort((a, b) => new Date(a.start_date) - new Date(b.start_date))
    .map(e => ({
      key: e.key,
      name: e.name,
      city: e.city || '',
      state_prov: e.state_prov || '',
      start_date: e.start_date,
      end_date: e.end_date
    }));
}

/**
 * Fetch event information
 * @param {string} eventKey - Event key (e.g., '2026miket')
 * @returns {Promise<{name: string, city: string, state_prov: string, start_date: string, end_date: string}>}
 */
export async function getEventInfo(eventKey) {
  if (!TBA_KEY) {
    throw new Error('TBA API key not configured. Add VITE_TBA_KEY to your .env.local file.');
  }

  const response = await fetch(`${TBA_BASE}/event/${eventKey}/simple`, {
    headers: {
      'X-TBA-Auth-Key': TBA_KEY
    }
  });

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error(`Event "${eventKey}" not found. Check the event key format (e.g., 2026miket).`);
    }
    if (response.status === 401) {
      throw new Error('Invalid TBA API key. Check your VITE_TBA_KEY in .env.local.');
    }
    throw new Error(`Failed to fetch event info: ${response.statusText}`);
  }

  const event = await response.json();
  return {
    key: event.key,
    name: event.name,
    city: event.city || '',
    state_prov: event.state_prov || '',
    start_date: event.start_date,
    end_date: event.end_date
  };
}

/**
 * Fetch event webcasts (livestream links)
 * @param {string} eventKey - Event key (e.g., '2026miket')
 * @returns {Promise<Array<{type: string, channel: string, url: string}>>}
 */
export async function getEventWebcasts(eventKey) {
  if (!TBA_KEY) return [];

  const response = await fetch(`${TBA_BASE}/event/${eventKey}`, {
    headers: { 'X-TBA-Auth-Key': TBA_KEY }
  });

  if (!response.ok) return [];

  const data = await response.json();
  return (data.webcasts || []).map(w => {
    let url = null;
    if (w.type === 'twitch') url = `https://www.twitch.tv/${w.channel}`;
    else if (w.type === 'youtube') url = `https://www.youtube.com/watch?v=${w.channel}`;
    else if (w.type === 'livestream') url = `https://livestream.com/${w.channel}`;
    return { type: w.type, channel: w.channel, url };
  }).filter(w => w.url);
}

/**
 * Fetch qual rankings for an event
 * @param {string} eventKey - Event key (e.g., '2026miket')
 * @returns {Promise<Array<{rank, teamNumber, wins, losses, ties, rankingScore}>>}
 */
export async function getEventRankings(eventKey) {
  if (!TBA_KEY) {
    throw new Error('TBA API key not configured. Add VITE_TBA_KEY to your .env.local file.');
  }

  const response = await fetch(`${TBA_BASE}/event/${eventKey}/rankings`, {
    headers: { 'X-TBA-Auth-Key': TBA_KEY }
  });

  if (!response.ok) {
    if (response.status === 404) throw new Error(`Rankings not yet available for "${eventKey}".`);
    throw new Error(`Failed to fetch rankings: ${response.statusText}`);
  }

  const data = await response.json();
  if (!data?.rankings?.length) throw new Error('Rankings not yet available for this event.');

  return data.rankings.map(r => ({
    rank:         r.rank,
    teamNumber:   parseInt(r.team_key.replace('frc', ''), 10),
    wins:         r.record?.wins   ?? 0,
    losses:       r.record?.losses ?? 0,
    ties:         r.record?.ties   ?? 0,
    rankingScore: r.sort_orders?.[0] ?? 0,
  }));
}
