/** Non-monetary progression. XP and divisions never convert to money (SPEC §8, Apple 3.1.5). */
export interface Division { name: string; min: number; color: string; edge: string; emoji: string }

export const DIVISIONS: Division[] = [
  { name: 'Bronze', min: 0, color: '#d98b4a', edge: '#a8622b', emoji: 'B' },
  { name: 'Silver', min: 200, color: '#aab4c8', edge: '#7f8aa3', emoji: 'S' },
  { name: 'Gold', min: 600, color: '#ffc83d', edge: '#e5a500', emoji: 'G' },
  { name: 'Sapphire', min: 1500, color: '#3da9ff', edge: '#1f8be0', emoji: 'S' },
  { name: 'Ruby', min: 3500, color: '#ff5c6c', edge: '#e03e50', emoji: 'R' },
  { name: 'Diamond', min: 8000, color: '#7c4dff', edge: '#5b2ed9', emoji: 'D' },
  { name: 'Legend', min: 20000, color: '#f5f5f5', edge: '#c9c9c9', emoji: 'L' },
];

export function divisionFor(xp: number): { current: Division; next: Division | null; progress: number } {
  let i = 0;
  for (let k = 0; k < DIVISIONS.length; k++) if (xp >= (DIVISIONS[k]?.min ?? 0)) i = k;
  const current = DIVISIONS[i] as Division;
  const next = DIVISIONS[i + 1] ?? null;
  const progress = next ? (xp - current.min) / (next.min - current.min) : 1;
  return { current, next, progress: Math.max(0, Math.min(1, progress)) };
}

export const DAILY_GOAL_XP = 30;

/** XP awarded per action (mirrors api awardXp). */
export const XP = { post: 5, call: 10, correctCall: 50, streakDay: 5 } as const;
