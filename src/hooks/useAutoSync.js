import { useState, useEffect, useCallback } from 'react';
import { useOnlineStatus } from './useOnlineStatus';
import {
  getTeamProfiles,
  getMatchRecords,
  getPendingSync,
  clearPendingSync,
  hasPendingData
} from '../lib/storage';
import {
  syncTeamProfile,
  syncMatchRecord,
  uploadPhoto
} from '../lib/supabase';

export function useAutoSync() {
  const isOnline = useOnlineStatus();
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState(null);
  const [syncError, setSyncError] = useState(null);

  const syncAll = useCallback(async () => {
    if (!isOnline || isSyncing) return;

    const pending = getPendingSync();
    if (pending.teamProfiles.length === 0 && pending.matchRecords.length === 0) {
      return;
    }

    setIsSyncing(true);
    setSyncError(null);

    try {
      // Sync team profiles
      const profiles = getTeamProfiles();
      for (const teamNumber of pending.teamProfiles) {
        const profile = profiles[teamNumber];
        if (profile) {
          // Upload photo first if it's base64
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

      // Sync match records
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

      setLastSyncTime(new Date());
    } catch (error) {
      console.error('Sync failed:', error);
      setSyncError(error.message);
    } finally {
      setIsSyncing(false);
    }
  }, [isOnline, isSyncing]);

  // Auto-sync when coming online
  useEffect(() => {
    if (isOnline && hasPendingData()) {
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
