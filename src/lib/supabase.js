import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Guard: don't crash if env vars are missing (e.g. Vercel build without secrets)
export const supabase = (supabaseUrl && supabaseAnonKey)
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

export const isSupabaseConfigured = !!(supabaseUrl && supabaseAnonKey);

function requireSupabase() {
  if (!supabase) throw new Error('Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your Vercel environment variables.');
}

// Upload photo to storage bucket
export async function uploadPhoto(teamNumber, base64Data) {
  requireSupabase();
  // Convert base64 to blob
  const base64Response = await fetch(base64Data);
  const blob = await base64Response.blob();

  const filePath = `${teamNumber}.jpg`;

  const { data, error } = await supabase.storage
    .from('robot-photos')
    .upload(filePath, blob, {
      contentType: 'image/jpeg',
      upsert: true
    });

  if (error) throw error;

  // Get public URL
  const { data: urlData } = supabase.storage
    .from('robot-photos')
    .getPublicUrl(filePath);

  return urlData.publicUrl;
}

// Sync team profile to Supabase
export async function syncTeamProfile(profile) {
  requireSupabase();
  const { error } = await supabase
    .from('team_profiles')
    .upsert({
      team_number: profile.teamNumber,
      description: profile.description,
      balls_per_second: profile.ballsPerSecond,
      photo_url: profile.photoUrl,
      trench_capability: profile.trenchCapability,
      updated_at: profile.updatedAt || new Date().toISOString()
    }, {
      onConflict: 'team_number'
    });

  if (error) throw error;
}

// Sync match record to Supabase
export async function syncMatchRecord(record) {
  requireSupabase();
  const { error } = await supabase
    .from('match_records')
    .upsert({
      team_number: record.teamNumber,
      match_number: record.matchNumber,
      alliance_color: record.allianceColor,
      auto_firing_seconds: record.autoFiringSeconds,
      auto_accuracy: record.autoAccuracy,
      auto_climb: record.autoClimb,
      auto_pickup_location: record.autoPickupLocation,
      auton_focus: record.autonFocus,
      teleop_firing_seconds: record.teleopFiringSeconds,
      teleop_accuracy: record.teleopAccuracy,
      teleop_climb: record.teleopClimb,
      pickup_location: record.pickupLocation,
      endgame_focus: record.endgameFocus,
      defense_rating: record.defenseRating,
      notes: record.notes,
      scouter_device_id: record.scouterDeviceId
    }, {
      onConflict: 'team_number,match_number,scouter_device_id'
    });

  if (error) throw error;
}

// Delete team profile from Supabase
export async function deleteTeamProfileFromCloud(teamNumber) {
  requireSupabase();
  const { error } = await supabase
    .from('team_profiles')
    .delete()
    .eq('team_number', teamNumber);

  if (error) throw error;
}

// Verify admin password
export async function verifyAdminPassword(password) {
  requireSupabase();
  const { data, error } = await supabase
    .from('app_settings')
    .select('value')
    .eq('key', 'admin_password')
    .single();

  if (error) throw error;
  return data.value === password;
}

// Verify scouting area password (set in Supabase app_settings, key = 'scouting_password')
export async function verifyScoutingPassword(password) {
  requireSupabase();
  const { data, error } = await supabase
    .from('app_settings')
    .select('value')
    .eq('key', 'scouting_password')
    .single();

  if (error) throw error;
  return data.value === password;
}

// Delete all match records from Supabase
export async function deleteAllMatchRecords() {
  requireSupabase();
  const { error } = await supabase
    .from('match_records')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

  if (error) throw error;
}

// Fetch all team profiles from Supabase
export async function fetchTeamProfiles() {
  requireSupabase();
  const { data, error } = await supabase
    .from('team_profiles')
    .select('*')
    .order('team_number');

  if (error) throw error;
  return data;
}

// Fetch all match records from Supabase
export async function fetchMatchRecords() {
  requireSupabase();
  const { data, error } = await supabase
    .from('match_records')
    .select('*')
    .order('match_number', { ascending: true });

  if (error) throw error;
  return data;
}

// Publish scouting schedule config so all devices receive it
export async function publishScoutingSchedule(scouters, groupSize, totalMatchCount) {
  requireSupabase();
  const { error } = await supabase.from('app_settings').upsert([
    { key: 'scouting_scouters',      value: JSON.stringify(scouters) },
    { key: 'scouting_group_size',    value: String(groupSize) },
    { key: 'scouting_total_matches', value: String(totalMatchCount) },
  ], { onConflict: 'key' });

  if (error) throw error;
}

// Publish the full match schedule so all devices receive it without reloading the event
export async function publishMatchSchedule(matches) {
  requireSupabase();
  const { error } = await supabase.from('app_settings').upsert(
    { key: 'match_schedule', value: JSON.stringify(matches) },
    { onConflict: 'key' }
  );
  if (error) throw error;
}

// Remove the published schedule from all devices
export async function unpublishScoutingSchedule() {
  requireSupabase();
  const { error } = await supabase.from('app_settings').upsert([
    { key: 'scouting_scouters',      value: '[]' },
    { key: 'scouting_group_size',    value: '3' },
    { key: 'scouting_total_matches', value: '0' },
  ], { onConflict: 'key' });

  if (error) throw error;
}

// Export all scouting data from Supabase (returns raw DB rows)
export async function exportAllData() {
  requireSupabase();
  const [matchRes, profileRes] = await Promise.all([
    supabase.from('match_records').select('*').order('match_number', { ascending: true }),
    supabase.from('team_profiles').select('*').order('team_number'),
  ]);

  if (matchRes.error) throw matchRes.error;
  if (profileRes.error) throw profileRes.error;

  return {
    matchRecords: matchRes.data,
    teamProfiles: profileRes.data,
  };
}

// Fetch the currently published scouting schedule config
export async function fetchScoutingSchedule() {
  requireSupabase();
  const { data, error } = await supabase
    .from('app_settings')
    .select('key, value')
    .in('key', ['scouting_scouters', 'scouting_group_size', 'scouting_total_matches', 'match_schedule']);

  if (error) throw error;

  const row = (key) => data?.find(r => r.key === key)?.value;
  const rawSchedule = row('match_schedule');
  return {
    scouters:        JSON.parse(row('scouting_scouters')      || '[]'),
    groupSize:       parseInt(row('scouting_group_size')      || '3',  10),
    totalMatchCount: parseInt(row('scouting_total_matches')   || '80', 10),
    matchSchedule:   rawSchedule ? JSON.parse(rawSchedule) : null,
  };
}
