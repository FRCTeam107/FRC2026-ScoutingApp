export const POSITIONS = ['R1', 'R2', 'R3', 'B1', 'B2', 'B3'];

export const POS_COLORS = {
  R1: '#ef4444',
  R2: '#dc2626',
  R3: '#b91c1c',
  B1: '#3b82f6',
  B2: '#2563eb',
  B3: '#1d4ed8',
};

// Generates a shift-based schedule assigning exactly 6 scouters per shift (one per robot).
// Each scouter keeps their robot position (R1–B3) when they carry into the next shift.
// With N > 6 scouters, the active window advances by (N-6) each shift so that
// (N-6) people rotate out and fresh ones rotate in holding the vacated slots.
// Falls back to totalMatchOverride (default 80) when no live schedule is loaded.
export function buildSchedule(matchSchedule, scouters, groupSize, totalMatchOverride = 80) {
  if (scouters.length < 6 || groupSize < 1) return [];

  let matchNums;
  if (matchSchedule) {
    matchNums = matchSchedule
      .filter(m => m.comp_level === 'qm')
      .sort((a, b) => a.match_number - b.match_number)
      .map(m => m.match_number);
  }
  if (!matchNums || !matchNums.length) {
    matchNums = Array.from({ length: totalMatchOverride }, (_, i) => i + 1);
  }

  const n = scouters.length;
  const step = n === 6 ? 0 : n - 6;
  const result = [];
  let positionMap = {};
  let windowStart = 0;

  for (let i = 0; i < matchNums.length; i += groupSize) {
    const chunk = matchNums.slice(i, i + groupSize);
    const active = Array.from({ length: 6 }, (_, j) => scouters[(windowStart + j) % n]);

    const carryOver = active.filter(s => positionMap[s] !== undefined);
    const incoming = active.filter(s => positionMap[s] === undefined);
    const vacated = POSITIONS.filter(p => !carryOver.some(s => positionMap[s] === p));

    const newMap = {};
    carryOver.forEach(s => { newMap[s] = positionMap[s]; });
    incoming.forEach((s, idx) => { newMap[s] = vacated[idx]; });
    positionMap = newMap;

    result.push({
      team: POSITIONS.map(pos => ({
        pos,
        name: active.find(s => positionMap[s] === pos),
      })),
      from: chunk[0],
      to: chunk[chunk.length - 1],
      count: chunk.length,
    });

    if (step > 0) windowStart = (windowStart + step) % n;
  }
  return result;
}
