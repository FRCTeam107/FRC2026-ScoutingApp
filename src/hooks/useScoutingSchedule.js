import { useState, useEffect } from 'react';
import { supabase, fetchScoutingSchedule } from '../lib/supabase';
import { getScouters, setScouters, getScoutingGroupSize, setScoutingGroupSize } from '../lib/storage';

/**
 * Returns { scouters, groupSize, totalMatchCount } kept in sync with Supabase Realtime.
 * When the admin publishes or unpublishes, every subscribed device updates instantly.
 * totalMatchCount ensures all devices use the same match range (not a local fallback).
 */
export function useScoutingSchedule() {
  const [scouters, setScoutersState]           = useState(() => getScouters());
  const [groupSize, setGroupSizeState]         = useState(() => getScoutingGroupSize());
  const [totalMatchCount, setTotalMatchCount]  = useState(80);

  // On mount: pull the latest published schedule from Supabase
  useEffect(() => {
    fetchScoutingSchedule()
      .then(({ scouters: s, groupSize: g, totalMatchCount: t }) => {
        setScoutersState(s);
        setScouters(s);
        if (g > 0) {
          setGroupSizeState(g);
          setScoutingGroupSize(g);
        }
        if (t > 0) setTotalMatchCount(t);
      })
      .catch(() => { /* stay with localStorage values on error */ });
  }, []);

  // Realtime subscription — reacts when admin publishes or unpublishes
  useEffect(() => {
    const channel = supabase
      .channel('scouting-schedule-sync')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'app_settings' },
        (payload) => {
          const { key, value } = payload.new ?? {};
          if (key === 'scouting_scouters') {
            try {
              const s = JSON.parse(value);
              setScoutersState(s);
              setScouters(s);
            } catch { /* ignore malformed */ }
          }
          if (key === 'scouting_group_size') {
            const g = parseInt(value, 10);
            if (!isNaN(g)) {
              setGroupSizeState(g);
              setScoutingGroupSize(g);
            }
          }
          if (key === 'scouting_total_matches') {
            const t = parseInt(value, 10);
            if (!isNaN(t)) setTotalMatchCount(t);
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  return { scouters, groupSize, totalMatchCount };
}
