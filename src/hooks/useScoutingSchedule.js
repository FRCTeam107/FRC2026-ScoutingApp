import { useState, useEffect } from 'react';
import { supabase, fetchScoutingSchedule } from '../lib/supabase';
import { getScouters, setScouters, getScoutingGroupSize, setScoutingGroupSize, setMatchSchedule } from '../lib/storage';

/**
 * Returns { scouters, groupSize, totalMatchCount, matchSchedule } kept in sync with Supabase Realtime.
 * When the admin loads an event or publishes/unpublishes, every subscribed device updates instantly.
 */
export function useScoutingSchedule() {
  const [scouters, setScoutersState]           = useState(() => getScouters());
  const [groupSize, setGroupSizeState]         = useState(() => getScoutingGroupSize());
  const [totalMatchCount, setTotalMatchCount]  = useState(80);
  const [matchSchedule, setMatchScheduleState] = useState(null);

  // On mount: pull the latest published data from Supabase
  useEffect(() => {
    fetchScoutingSchedule()
      .then(({ scouters: s, groupSize: g, totalMatchCount: t, matchSchedule: ms }) => {
        setScoutersState(s);
        setScouters(s);
        if (g > 0) {
          setGroupSizeState(g);
          setScoutingGroupSize(g);
        }
        if (t > 0) setTotalMatchCount(t);
        if (ms) {
          setMatchScheduleState(ms);
          setMatchSchedule(ms);
        }
      })
      .catch(() => { /* stay with localStorage values on error */ });
  }, []);

  // Realtime subscription — reacts when admin publishes or unpublishes (INSERT or UPDATE)
  useEffect(() => {
    const handleRow = (payload) => {
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
      if (key === 'match_schedule') {
        try {
          const ms = JSON.parse(value);
          setMatchScheduleState(ms);
          setMatchSchedule(ms);
        } catch { /* ignore malformed */ }
      }
    };

    const channel = supabase
      .channel('scouting-schedule-sync')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'app_settings' }, handleRow)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'app_settings' }, handleRow)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  return { scouters, groupSize, totalMatchCount, matchSchedule };
}
