import { useEffect } from 'react';
import { supabase, fetchTeamProfiles } from '../lib/supabase';
import { mergeTeamProfiles, getBackupView } from '../lib/storage';

function applyCloudRow(row) {
  // Map a single Supabase team_profiles row into localStorage via mergeTeamProfiles
  mergeTeamProfiles([row]);
  window.dispatchEvent(new CustomEvent('scouting-sync-complete'));
}

/**
 * Keeps team profiles (including photo URLs) in sync across devices.
 * On mount: fetches the full latest profile list from Supabase and merges into localStorage.
 * Realtime: any INSERT or UPDATE on team_profiles immediately updates localStorage
 *           and fires 'scouting-sync-complete' so pages re-render.
 */
export function useTeamProfileSync() {
  // Option A — initial pull on mount
  useEffect(() => {
    if (getBackupView()) return; // skip sync when viewing a backup
      .then((profiles) => {
        if (profiles?.length) {
          mergeTeamProfiles(profiles);
          window.dispatchEvent(new CustomEvent('scouting-sync-complete'));
        }
      })
      .catch(() => { /* stay with localStorage on error */ });
  }, []);

  // Option B — Realtime push
  useEffect(() => {
    if (getBackupView()) return; // skip realtime when viewing a backup
    const channel = supabase
      .channel('team-profiles-sync')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'team_profiles' },
        (payload) => applyCloudRow(payload.new)
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'team_profiles' },
        (payload) => applyCloudRow(payload.new)
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);
}
