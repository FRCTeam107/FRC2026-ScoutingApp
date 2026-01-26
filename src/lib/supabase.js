import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Upload photo to storage bucket
export async function uploadPhoto(teamNumber, base64Data) {
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
  const { error } = await supabase
    .from('team_profiles')
    .upsert({
      team_number: profile.teamNumber,
      description: profile.description,
      balls_per_second: profile.ballsPerSecond,
      photo_url: profile.photoUrl,
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'team_number'
    });

  if (error) throw error;
}

// Sync match record to Supabase
export async function syncMatchRecord(record) {
  const { error } = await supabase
    .from('match_records')
    .upsert({
      team_number: record.teamNumber,
      match_number: record.matchNumber,
      alliance_color: record.allianceColor,
      auto_firing_seconds: record.autoFiringSeconds,
      auto_accuracy: record.autoAccuracy,
      auto_climb: record.autoClimb,
      teleop_firing_seconds: record.teleopFiringSeconds,
      teleop_accuracy: record.teleopAccuracy,
      teleop_climb: record.teleopClimb,
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
  const { error } = await supabase
    .from('team_profiles')
    .delete()
    .eq('team_number', teamNumber);

  if (error) throw error;
}

// Verify admin password
export async function verifyAdminPassword(password) {
  const { data, error } = await supabase
    .from('app_settings')
    .select('value')
    .eq('key', 'admin_password')
    .single();

  if (error) throw error;
  return data.value === password;
}

// Delete all match records from Supabase
export async function deleteAllMatchRecords() {
  const { error } = await supabase
    .from('match_records')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

  if (error) throw error;
}

// Fetch all team profiles from Supabase
export async function fetchTeamProfiles() {
  const { data, error } = await supabase
    .from('team_profiles')
    .select('*')
    .order('team_number');

  if (error) throw error;
  return data;
}

// Fetch all match records from Supabase
export async function fetchMatchRecords() {
  const { data, error } = await supabase
    .from('match_records')
    .select('*')
    .order('match_number', { ascending: true });

  if (error) throw error;
  return data;
}
