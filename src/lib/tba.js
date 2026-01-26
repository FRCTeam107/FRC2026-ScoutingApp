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
