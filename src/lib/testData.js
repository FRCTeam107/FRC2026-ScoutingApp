// ─── Fake Event ──────────────────────────────────────────────────────────────
export const TEST_EVENT = {
  key: '2026test',
  name: '2026 Test Regional',
  startDate: '2026-03-15',
  endDate: '2026-03-17',
  teams: [
    { team_number: 107,  nickname: 'Team 107',          city: 'Ann Arbor',      state_prov: 'MI' },
    { team_number: 254,  nickname: 'The Cheesy Poofs',  city: 'San Jose',       state_prov: 'CA' },
    { team_number: 1114, nickname: 'Simbotics',         city: 'St. Catharines', state_prov: 'ON' },
    { team_number: 1678, nickname: 'Citrus Circuits',   city: 'Davis',          state_prov: 'CA' },
    { team_number: 2767, nickname: 'Stryke Force',      city: 'Kalamazoo',      state_prov: 'MI' },
    { team_number: 3310, nickname: 'Black Hawk Robotics',city: 'San Antonio',   state_prov: 'TX' },
    { team_number: 4481, nickname: 'Team Rembrandts',   city: 'Eindhoven',      state_prov: 'NB' },
    { team_number: 5940, nickname: 'The Holy Cows',     city: 'Manhattan',      state_prov: 'KS' },
    { team_number: 6328, nickname: 'Mechanical Advantage', city: 'Littleton',   state_prov: 'MA' },
    { team_number: 7461, nickname: 'Sola Gratia',       city: 'Grand Rapids',   state_prov: 'MI' },
    { team_number: 8033, nickname: 'HighlanderBots',    city: 'Highland',       state_prov: 'CA' },
    { team_number: 9153, nickname: 'Absolute Zero',     city: 'Rochester',      state_prov: 'NY' },
  ]
};

// ─── Fake Match Schedule ─────────────────────────────────────────────────────
// 12 qual matches, each team plays 4-5 times
export const TEST_MATCH_SCHEDULE = [
  { comp_level: 'qm', match_number: 1,  set_number: 1, alliances: { red:  { team_keys: ['frc107',  'frc254',  'frc1678'], score: -1 }, blue: { team_keys: ['frc2767', 'frc3310', 'frc1114'], score: -1 } } },
  { comp_level: 'qm', match_number: 2,  set_number: 1, alliances: { red:  { team_keys: ['frc4481', 'frc5940', 'frc6328'], score: -1 }, blue: { team_keys: ['frc7461', 'frc8033', 'frc9153'], score: -1 } } },
  { comp_level: 'qm', match_number: 3,  set_number: 1, alliances: { red:  { team_keys: ['frc107',  'frc3310', 'frc7461'], score: -1 }, blue: { team_keys: ['frc254',  'frc4481', 'frc8033'], score: -1 } } },
  { comp_level: 'qm', match_number: 4,  set_number: 1, alliances: { red:  { team_keys: ['frc1114', 'frc5940', 'frc9153'], score: -1 }, blue: { team_keys: ['frc1678', 'frc6328', 'frc2767'], score: -1 } } },
  { comp_level: 'qm', match_number: 5,  set_number: 1, alliances: { red:  { team_keys: ['frc107',  'frc5940', 'frc8033'], score: -1 }, blue: { team_keys: ['frc1114', 'frc6328', 'frc3310'], score: -1 } } },
  { comp_level: 'qm', match_number: 6,  set_number: 1, alliances: { red:  { team_keys: ['frc254',  'frc1678', 'frc9153'], score: -1 }, blue: { team_keys: ['frc2767', 'frc4481', 'frc7461'], score: -1 } } },
  { comp_level: 'qm', match_number: 7,  set_number: 1, alliances: { red:  { team_keys: ['frc107',  'frc6328', 'frc9153'], score: -1 }, blue: { team_keys: ['frc254',  'frc5940', 'frc1678'], score: -1 } } },
  { comp_level: 'qm', match_number: 8,  set_number: 1, alliances: { red:  { team_keys: ['frc1114', 'frc2767', 'frc7461'], score: -1 }, blue: { team_keys: ['frc3310', 'frc4481', 'frc8033'], score: -1 } } },
  { comp_level: 'qm', match_number: 9,  set_number: 1, alliances: { red:  { team_keys: ['frc107',  'frc4481', 'frc1114'], score: -1 }, blue: { team_keys: ['frc254',  'frc7461', 'frc9153'], score: -1 } } },
  { comp_level: 'qm', match_number: 10, set_number: 1, alliances: { red:  { team_keys: ['frc1678', 'frc2767', 'frc8033'], score: -1 }, blue: { team_keys: ['frc3310', 'frc5940', 'frc6328'], score: -1 } } },
  { comp_level: 'qm', match_number: 11, set_number: 1, alliances: { red:  { team_keys: ['frc107',  'frc8033', 'frc2767'], score: -1 }, blue: { team_keys: ['frc1114', 'frc9153', 'frc4481'], score: -1 } } },
  { comp_level: 'qm', match_number: 12, set_number: 1, alliances: { red:  { team_keys: ['frc254',  'frc3310', 'frc6328'], score: -1 }, blue: { team_keys: ['frc1678', 'frc5940', 'frc7461'], score: -1 } } },
  // Playoffs
  { comp_level: 'sf', match_number: 1,  set_number: 1, alliances: { red:  { team_keys: ['frc254',  'frc1114', 'frc6328'], score: -1 }, blue: { team_keys: ['frc107',  'frc1678', 'frc2767'], score: -1 } } },
  { comp_level: 'sf', match_number: 2,  set_number: 2, alliances: { red:  { team_keys: ['frc4481', 'frc5940', 'frc3310'], score: -1 }, blue: { team_keys: ['frc7461', 'frc8033', 'frc9153'], score: -1 } } },
  { comp_level: 'f',  match_number: 1,  set_number: 1, alliances: { red:  { team_keys: ['frc254',  'frc1114', 'frc6328'], score: -1 }, blue: { team_keys: ['frc4481', 'frc5940', 'frc3310'], score: -1 } } },
];

// ─── Fake Team Profiles ───────────────────────────────────────────────────────
const now = new Date().toISOString();

export const TEST_PROFILES = {
  107:  { teamNumber: 107,  description: 'Tank drive, reliable shooter with turret, consistent L3 climber.', ballsPerSecond: 2.5, trenchCapability: 'bumpAndTrench', updatedAt: now },
  254:  { teamNumber: 254,  description: 'Swerve drive, elite shooter, L4 hang every match. Very fast cycle time.', ballsPerSecond: 4.2, trenchCapability: 'trench', updatedAt: now },
  1114: { teamNumber: 1114, description: 'Swerve drive, high-accuracy hood shooter, consistent L3 climb.', ballsPerSecond: 3.1, trenchCapability: 'bump', updatedAt: now },
  1678: { teamNumber: 1678, description: 'Swerve, very fast cycles, low shooter, prefers floor pickup.', ballsPerSecond: 3.5, trenchCapability: 'bumpAndTrench', updatedAt: now },
  2767: { teamNumber: 2767, description: 'Tank drive, mid-range shooter, defense capable, L2 climb.', ballsPerSecond: 2.0, trenchCapability: 'bump', updatedAt: now },
  3310: { teamNumber: 3310, description: 'Tank drive, defense specialist, will play defense full match.', ballsPerSecond: 0.8, trenchCapability: 'bump', updatedAt: now },
  4481: { teamNumber: 4481, description: 'Swerve drive, moderate shooter, L3 capable.', ballsPerSecond: 2.2, trenchCapability: 'trench', updatedAt: now },
  5940: { teamNumber: 5940, description: 'Tank drive, solid shooter, climbs L2, plays bumper defense.', ballsPerSecond: 1.7, trenchCapability: 'bumpAndTrench', updatedAt: now },
  6328: { teamNumber: 6328, description: 'Swerve drive, consistent shooter, strong autonomous.', ballsPerSecond: 2.8, trenchCapability: 'trench', updatedAt: now },
};

// ─── Fake Match Records Generator ────────────────────────────────────────────
function r(min, max) { return Math.random() * (max - min) + min; }
function ri(min, max) { return Math.floor(r(min, max + 1)); }
function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

// Skill profile per team: [bps multiplier, accuracy offset, climb tier 0-3]
const SKILL = {
  107:  [1.0,  5,  2],
  254:  [1.3, 15,  3],
  1114: [1.1, 10,  2],
  1678: [1.2, 10,  2],
  2767: [0.8, -5,  1],
  3310: [0.3,-20,  1],
  4481: [0.9,  0,  2],
  5940: [0.7, -8,  1],
  6328: [1.0,  5,  2],
  7461: [0.6,-10,  0],
  8033: [0.7, -5,  1],
  9153: [0.5,-15,  0],
};

const CLIMB_TIERS = [
  ['None', 'None', 'None'],
  ['None', 'L1', 'L1'],
  ['L1', 'L2', 'L3'],
  ['L2', 'L3', 'L3'],
];

const PICKUPS = ['Ground', 'Ground', 'Station', 'Ground', 'Station'];

function makeRecord(teamNumber, matchNumber, allianceColor) {
  const [bpsMult, accOffset, climbTier] = SKILL[teamNumber] || [0.7, -10, 0];
  const profile = TEST_PROFILES[teamNumber];
  const bps = profile?.ballsPerSecond || 1.5;

  const autoFiring = parseFloat((r(3, 10) * bpsMult).toFixed(1));
  const autoAcc = clamp(ri(55, 85) + accOffset, 20, 100);
  const teleopFiring = parseFloat((r(12, 28) * bpsMult).toFixed(1));
  const teleopAcc = clamp(ri(55, 85) + accOffset, 20, 100);

  const climbs = CLIMB_TIERS[climbTier];
  const teleopClimb = climbs[ri(0, climbs.length - 1)];

  const isDefender = (SKILL[teamNumber] || [])[0] < 0.5;
  const defenseRating = isDefender ? ri(3, 5) : (Math.random() < 0.2 ? ri(1, 3) : 0);

  return {
    teamNumber,
    matchNumber,
    allianceColor,
    autoFiringSeconds: autoFiring,
    autoAccuracy: autoAcc,
    autoClimb: 'None',
    teleopFiringSeconds: teleopFiring,
    teleopAccuracy: teleopAcc,
    teleopClimb,
    pickupLocation: PICKUPS[ri(0, PICKUPS.length - 1)],
    defenseRating,
    notes: '',
    scouterDeviceId: 'test_device',
    createdAt: new Date().toISOString(),
  };
}

export function generateTestMatchRecords() {
  const records = [];

  // Build from match schedule — scout all 6 teams in each match
  TEST_MATCH_SCHEDULE
    .filter(m => m.comp_level === 'qm')
    .forEach(match => {
      const redTeams = match.alliances.red.team_keys.map(k => parseInt(k.replace('frc', '')));
      const blueTeams = match.alliances.blue.team_keys.map(k => parseInt(k.replace('frc', '')));
      redTeams.forEach(t => records.push(makeRecord(t, match.match_number, 'red')));
      blueTeams.forEach(t => records.push(makeRecord(t, match.match_number, 'blue')));
    });

  return records;
}

// ─── Load / Unload ────────────────────────────────────────────────────────────
const BACKUP_KEY = 'frc_test_backup';

export function isTestModeActive() {
  try {
    const ev = localStorage.getItem('frc_current_event');
    return ev ? JSON.parse(ev).key === '2026test' : false;
  } catch { return false; }
}

export function loadTestData() {
  // Backup existing data
  const backup = {
    profiles:  localStorage.getItem('frc_team_profiles'),
    records:   localStorage.getItem('frc_match_records'),
    event:     localStorage.getItem('frc_current_event'),
    schedule:  localStorage.getItem('frc_match_schedule'),
    pending:   localStorage.getItem('frc_pending_sync'),
  };
  localStorage.setItem(BACKUP_KEY, JSON.stringify(backup));

  // Write fake data
  localStorage.setItem('frc_team_profiles', JSON.stringify(TEST_PROFILES));
  localStorage.setItem('frc_match_records', JSON.stringify(generateTestMatchRecords()));
  localStorage.setItem('frc_current_event', JSON.stringify({
    key: TEST_EVENT.key,
    name: TEST_EVENT.name,
    teams: TEST_EVENT.teams,
    startDate: TEST_EVENT.startDate,
    endDate: TEST_EVENT.endDate,
    loadedAt: new Date().toISOString(),
  }));
  localStorage.setItem('frc_match_schedule', JSON.stringify(TEST_MATCH_SCHEDULE));
  // Clear pending sync so test data doesn't get pushed to Supabase
  localStorage.setItem('frc_pending_sync', JSON.stringify({ teamProfiles: [], matchRecords: [] }));
}

export function unloadTestData() {
  const backupStr = localStorage.getItem(BACKUP_KEY);
  if (backupStr) {
    const backup = JSON.parse(backupStr);
    const restore = (key, storageKey) => {
      if (backup[key] !== null && backup[key] !== undefined) {
        localStorage.setItem(storageKey, backup[key]);
      } else {
        localStorage.removeItem(storageKey);
      }
    };
    restore('profiles', 'frc_team_profiles');
    restore('records',  'frc_match_records');
    restore('event',    'frc_current_event');
    restore('schedule', 'frc_match_schedule');
    restore('pending',  'frc_pending_sync');
    localStorage.removeItem(BACKUP_KEY);
  } else {
    // No backup — just clear everything
    localStorage.removeItem('frc_team_profiles');
    localStorage.removeItem('frc_match_records');
    localStorage.removeItem('frc_current_event');
    localStorage.removeItem('frc_match_schedule');
    localStorage.setItem('frc_pending_sync', JSON.stringify({ teamProfiles: [], matchRecords: [] }));
  }
}
