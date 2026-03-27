// Local storage keys
const KEYS = {
  TEAM_PROFILES: 'frc_team_profiles',
  MATCH_RECORDS: 'frc_match_records',
  PENDING_SYNC: 'frc_pending_sync',
  DEVICE_ID: 'frc_device_id',
  CURRENT_EVENT: 'frc_current_event',
  MATCH_SCHEDULE: 'frc_match_schedule',
  FIELD_IMAGE: 'frc_field_image',
  SCOUTERS: 'frc_scouters',
  SCOUTING_GROUP_SIZE: 'frc_scouting_group_size',
  PICK_LIST: 'frc_pick_list',
  SCRATCHED_TEAMS: 'frc_scratched_teams',
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
  try {
    localStorage.setItem(KEYS.TEAM_PROFILES, JSON.stringify(profiles));
  } catch (e) {
    // localStorage quota exceeded — retry without base64 photo
    if (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED') {
      profiles[profile.teamNumber] = { ...profiles[profile.teamNumber], photoBase64: null };
      try {
        localStorage.setItem(KEYS.TEAM_PROFILES, JSON.stringify(profiles));
        console.warn('Photo too large for local storage — saved without base64. Use Supabase sync to store photos.');
      } catch (e2) {
        console.error('Failed to save team profile even without photo:', e2);
      }
    }
  }
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

  try {
    localStorage.setItem(KEYS.MATCH_RECORDS, JSON.stringify(records));
  } catch (e) {
    console.error('Failed to save match record to localStorage:', e);
    alert('Save failed — storage may be full. Try clearing old data in Admin.');
    return;
  }
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

// Merge cloud match records into local (adds records not already present locally)
export function mergeMatchRecords(cloudRecords) {
  const local = getMatchRecords();

  cloudRecords.forEach(cloud => {
    const exists = local.some(
      r => r.teamNumber === cloud.team_number &&
           r.matchNumber === cloud.match_number &&
           r.scouterDeviceId === cloud.scouter_device_id
    );
    if (!exists) {
      local.push({
        teamNumber: cloud.team_number,
        matchNumber: cloud.match_number,
        allianceColor: cloud.alliance_color,
        autoFiringSeconds: cloud.auto_firing_seconds,
        autoAccuracy: cloud.auto_accuracy,
        autoClimb: cloud.auto_climb || 'None',
        teleopFiringSeconds: cloud.teleop_firing_seconds,
        teleopAccuracy: cloud.teleop_accuracy,
        teleopClimb: cloud.teleop_climb || 'None',
        pickupLocation: cloud.pickup_location,
        defenseRating: cloud.defense_rating,
        notes: cloud.notes,
        scouterDeviceId: cloud.scouter_device_id,
        createdAt: cloud.created_at
      });
    }
  });

  localStorage.setItem(KEYS.MATCH_RECORDS, JSON.stringify(local));
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
        trenchCapability: cloud.trench_capability || 'trench',
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
  // Clear cached schedule when event changes
  localStorage.removeItem(KEYS.MATCH_SCHEDULE);
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
  localStorage.removeItem(KEYS.MATCH_SCHEDULE);
}

// Match Schedule (cached from TBA for Drive Team page)
export function getMatchSchedule() {
  const data = localStorage.getItem(KEYS.MATCH_SCHEDULE);
  return data ? JSON.parse(data) : null;
}

export function setMatchSchedule(schedule) {
  localStorage.setItem(KEYS.MATCH_SCHEDULE, JSON.stringify(schedule));
}

// Field image (base64) for field drawing tool
export function getFieldImage() {
  return localStorage.getItem(KEYS.FIELD_IMAGE) || null;
}

export function setFieldImage(base64) {
  localStorage.setItem(KEYS.FIELD_IMAGE, base64);
}

export function clearFieldImage() {
  localStorage.removeItem(KEYS.FIELD_IMAGE);
}

// Scouting Schedule — scouter names
export function getScouters() {
  const data = localStorage.getItem(KEYS.SCOUTERS);
  return data ? JSON.parse(data) : [];
}

export function setScouters(scouters) {
  localStorage.setItem(KEYS.SCOUTERS, JSON.stringify(scouters));
}

// Scouting Schedule — matches-per-group
export function getScoutingGroupSize() {
  const val = localStorage.getItem(KEYS.SCOUTING_GROUP_SIZE);
  return val ? parseInt(val, 10) : 3;
}

export function setScoutingGroupSize(n) {
  localStorage.setItem(KEYS.SCOUTING_GROUP_SIZE, String(n));
}

// Restore match records from a backup (camelCase app format — overwrites local)
export function restoreMatchRecords(records) {
  localStorage.setItem(KEYS.MATCH_RECORDS, JSON.stringify(records));
}

// Restore team profiles from a backup (keyed object by teamNumber — overwrites local)
export function restoreTeamProfiles(profilesObj) {
  localStorage.setItem(KEYS.TEAM_PROFILES, JSON.stringify(profilesObj));
}

// Alliance Selection — pick list (ordered array of team numbers)
export function getPickList() {
  const data = localStorage.getItem(KEYS.PICK_LIST);
  return data ? JSON.parse(data) : [];
}

export function setPickList(list) {
  localStorage.setItem(KEYS.PICK_LIST, JSON.stringify(list));
}

export function clearPickList() {
  localStorage.removeItem(KEYS.PICK_LIST);
}

// Alliance Selection — scratched teams (array of team numbers marked as picked/unavailable)
export function getScratchedTeams() {
  const data = localStorage.getItem(KEYS.SCRATCHED_TEAMS);
  return data ? JSON.parse(data) : [];
}

export function setScratchedTeams(teams) {
  localStorage.setItem(KEYS.SCRATCHED_TEAMS, JSON.stringify(teams));
}

export function clearScratchedTeams() {
  localStorage.removeItem(KEYS.SCRATCHED_TEAMS);
}

// Backup View (sessionStorage — auto-clears on tab close, never touches live data)
export function setBackupView(payload) {
  sessionStorage.setItem('frc_backup_view', JSON.stringify(payload));
}

export function getBackupView() {
  const d = sessionStorage.getItem('frc_backup_view');
  return d ? JSON.parse(d) : null;
}

export function clearBackupView() {
  sessionStorage.removeItem('frc_backup_view');
}
