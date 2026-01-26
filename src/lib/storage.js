// Local storage keys
const KEYS = {
  TEAM_PROFILES: 'frc_team_profiles',
  MATCH_RECORDS: 'frc_match_records',
  PENDING_SYNC: 'frc_pending_sync',
  DEVICE_ID: 'frc_device_id',
  CURRENT_EVENT: 'frc_current_event'
};

// Generate or get device ID
export function getDeviceId() {
  let deviceId = localStorage.getItem(KEYS.DEVICE_ID);
  if (!deviceId) {
    deviceId = 'device_' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem(KEYS.DEVICE_ID, deviceId);
  }
  return deviceId;
}

// Team Profiles
export function getTeamProfiles() {
  const data = localStorage.getItem(KEYS.TEAM_PROFILES);
  return data ? JSON.parse(data) : {};
}

export function saveTeamProfile(profile) {
  const profiles = getTeamProfiles();
  profiles[profile.teamNumber] = {
    ...profile,
    updatedAt: new Date().toISOString()
  };
  localStorage.setItem(KEYS.TEAM_PROFILES, JSON.stringify(profiles));
  markPendingSync('teamProfile', profile.teamNumber);
}

export function getTeamProfile(teamNumber) {
  const profiles = getTeamProfiles();
  return profiles[teamNumber] || null;
}

// Match Records
export function getMatchRecords() {
  const data = localStorage.getItem(KEYS.MATCH_RECORDS);
  return data ? JSON.parse(data) : [];
}

export function saveMatchRecord(record) {
  const records = getMatchRecords();
  const recordWithMeta = {
    ...record,
    scouterDeviceId: getDeviceId(),
    createdAt: new Date().toISOString()
  };

  // Check if record already exists (same team, match, device)
  const existingIndex = records.findIndex(
    r => r.teamNumber === record.teamNumber &&
         r.matchNumber === record.matchNumber &&
         r.scouterDeviceId === recordWithMeta.scouterDeviceId
  );

  if (existingIndex >= 0) {
    records[existingIndex] = recordWithMeta;
  } else {
    records.push(recordWithMeta);
  }

  localStorage.setItem(KEYS.MATCH_RECORDS, JSON.stringify(records));
  markPendingSync('matchRecord', `${record.teamNumber}_${record.matchNumber}`);
}

// Pending Sync Tracking
export function getPendingSync() {
  const data = localStorage.getItem(KEYS.PENDING_SYNC);
  return data ? JSON.parse(data) : { teamProfiles: [], matchRecords: [] };
}

function markPendingSync(type, id) {
  const pending = getPendingSync();
  if (type === 'teamProfile' && !pending.teamProfiles.includes(id)) {
    pending.teamProfiles.push(id);
  } else if (type === 'matchRecord' && !pending.matchRecords.includes(id)) {
    pending.matchRecords.push(id);
  }
  localStorage.setItem(KEYS.PENDING_SYNC, JSON.stringify(pending));
}

export function clearPendingSync(type, id) {
  const pending = getPendingSync();
  if (type === 'teamProfile') {
    pending.teamProfiles = pending.teamProfiles.filter(t => t !== id);
  } else if (type === 'matchRecord') {
    pending.matchRecords = pending.matchRecords.filter(r => r !== id);
  }
  localStorage.setItem(KEYS.PENDING_SYNC, JSON.stringify(pending));
}

export function hasPendingData() {
  const pending = getPendingSync();
  return pending.teamProfiles.length > 0 || pending.matchRecords.length > 0;
}

// Delete a team profile
export function deleteTeamProfile(teamNumber) {
  const profiles = getTeamProfiles();
  delete profiles[teamNumber];
  localStorage.setItem(KEYS.TEAM_PROFILES, JSON.stringify(profiles));

  // Also remove from pending sync
  const pending = getPendingSync();
  pending.teamProfiles = pending.teamProfiles.filter(t => t !== teamNumber);
  localStorage.setItem(KEYS.PENDING_SYNC, JSON.stringify(pending));
}

// Delete a match record
export function deleteMatchRecord(teamNumber, matchNumber) {
  const records = getMatchRecords();
  const deviceId = getDeviceId();
  const filtered = records.filter(
    r => !(r.teamNumber === teamNumber && r.matchNumber === matchNumber && r.scouterDeviceId === deviceId)
  );
  localStorage.setItem(KEYS.MATCH_RECORDS, JSON.stringify(filtered));

  // Remove from pending sync
  const pending = getPendingSync();
  const recordId = `${teamNumber}_${matchNumber}`;
  pending.matchRecords = pending.matchRecords.filter(r => r !== recordId);
  localStorage.setItem(KEYS.PENDING_SYNC, JSON.stringify(pending));
}

// Clear all match records (keeps team profiles)
export function clearAllMatchRecords() {
  localStorage.setItem(KEYS.MATCH_RECORDS, JSON.stringify([]));
  const pending = getPendingSync();
  pending.matchRecords = [];
  localStorage.setItem(KEYS.PENDING_SYNC, JSON.stringify(pending));
}

// Merge cloud data with local (cloud wins for conflicts)
export function mergeTeamProfiles(cloudProfiles) {
  const localProfiles = getTeamProfiles();

  cloudProfiles.forEach(cloud => {
    const local = localProfiles[cloud.team_number];
    // Cloud wins if no local or cloud is newer
    if (!local || new Date(cloud.updated_at) > new Date(local.updatedAt)) {
      localProfiles[cloud.team_number] = {
        teamNumber: cloud.team_number,
        description: cloud.description,
        ballsPerSecond: cloud.balls_per_second,
        photoUrl: cloud.photo_url,
        updatedAt: cloud.updated_at
      };
    }
  });

  localStorage.setItem(KEYS.TEAM_PROFILES, JSON.stringify(localProfiles));
}

// Current Event Management
// Stores: { key, name, teams: [{team_number, nickname, city, state_prov}], loadedAt }

export function getCurrentEvent() {
  const data = localStorage.getItem(KEYS.CURRENT_EVENT);
  return data ? JSON.parse(data) : null;
}

export function setCurrentEvent(key, name, teams, startDate, endDate) {
  const eventData = {
    key,
    name,
    teams,
    startDate,
    endDate,
    loadedAt: new Date().toISOString()
  };
  localStorage.setItem(KEYS.CURRENT_EVENT, JSON.stringify(eventData));
}

export function clearCurrentEvent() {
  localStorage.removeItem(KEYS.CURRENT_EVENT);
}
