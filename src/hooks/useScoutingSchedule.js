import { useState, useEffect } from 'react';
import { supabase, fetchScoutingSchedule } from '../lib/supabase';
import { getScouters, setScouters, getScoutingGroupSize, setScoutingGroupSize } from '../lib/storage';

/**
 * Returns { scouters, groupSize } kept in sync with Supabase in real-time.
 * When the admin publishes a new schedule it broadcasts via Supabase Realtime
 * and every subscribed device updates its local state + localStorage instantly.
 */
export function useScoutingSchedule() {
  const [scouters, setScoutersState]     = useState(() => getScouters());
  const [groupSize, setGroupSizeState]   = useState(() => getScoutingGroupSize());

  // On mount: pull the latest published schedule from Supabase
  useEffect(() => {
    fetchScoutingSchedule()
      .then(({ scouters: s, groupSize: g }) => {
        if (s.length > 0) {
          setScoutersState(s);
          setScouters(s);
        }
        if (g > 0) {
          setGroupSizeState(g);
          setScoutingGroupSize(g);
        }
      })
      .catch(() => { /* stay with localStorage values on error */ });
  }, []);

  // Realtime subscription — reacts when admin publishes
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
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  return { scouters, groupSize };
}
