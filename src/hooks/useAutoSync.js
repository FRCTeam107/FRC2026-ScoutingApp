import { useState, useEffect, useCallback, useRef } from 'react';
import { useOnlineStatus } from './useOnlineStatus';
import {
  getTeamProfiles,
  getMatchRecords,
  getPendingSync,
  clearPendingSync,
  hasPendingData,
  mergeTeamProfiles,
  mergeMatchRecords
} from '../lib/storage';
import {
  syncTeamProfile,
  syncMatchRecord,
  uploadPhoto,
  fetchTeamProfiles,
  fetchMatchRecords
} from '../lib/supabase';

export function useAutoSync() {
  const isOnline = useOnlineStatus();
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState(null);
  const [syncError, setSyncError] = useState(null);
  // Prevent auto-retry loop after errors
  const syncingRef = useRef(false);

  const syncAll = useCallback(async () => {
    if (!isOnline || syncingRef.current) return;

    syncingRef.current = true;
    setIsSyncing(true);
    setSyncError(null);

    try {
      // Push pending local data up
      const pending = getPendingSync();

      const profiles = getTeamProfiles();
      for (const teamNumber of pending.teamProfiles) {
        const profile = profiles[teamNumber];
        if (profile) {
          if (profile.photoBase64) {
            try {
              const photoUrl = await uploadPhoto(teamNumber, profile.photoBase64);
              profile.photoUrl = photoUrl;
              delete profile.photoBase64;
            } catch (err) {
              console.error('Photo upload failed:', err);
            }
          }
          await syncTeamProfile(profile);
          clearPendingSync('teamProfile', teamNumber);
        }
      }

      const records = getMatchRecords();
      for (const recordId of pending.matchRecords) {
        const [teamNum, matchNum] = recordId.split('_');
        const record = records.find(
          r => r.teamNumber === parseInt(teamNum) && r.matchNumber === parseInt(matchNum)
        );
        if (record) {
          await syncMatchRecord(record);
          clearPendingSync('matchRecord', recordId);
        }
      }

      // Pull latest data from Supabase
      const [cloudProfiles, cloudRecords] = await Promise.all([
        fetchTeamProfiles(),
        fetchMatchRecords()
      ]);

      mergeTeamProfiles(cloudProfiles);
      mergeMatchRecords(cloudRecords);

      setLastSyncTime(new Date());
      setIsSyncing(false);
      syncingRef.current = false;

      // Notify pages to re-read localStorage
      window.dispatchEvent(new CustomEvent('scouting-sync-complete'));
    } catch (error) {
      console.error('Sync failed:', error);
      setSyncError(error.message);
      setIsSyncing(false);
      syncingRef.current = false;
    }
  }, [isOnline]);

  // Auto-sync when coming online (only if pending data, won't loop on error)
  useEffect(() => {
    if (isOnline && hasPendingData() && !syncingRef.current) {
      syncAll();
    }
  }, [isOnline, syncAll]);

  return {
    isOnline,
    isSyncing,
    lastSyncTime,
    syncError,
    syncNow: syncAll,
    hasPendingData: hasPendingData()
  };
}
