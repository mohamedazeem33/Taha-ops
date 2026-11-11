export interface LevelInfo {
  name: string;
  min: number;
  max: number | null;
}

export const LEVELS: LevelInfo[] = [
  { name: 'Rookie', min: 0, max: 99 },
  { name: 'Pro', min: 100, max: 299 },
  { name: 'Star', min: 300, max: 599 },
  { name: 'Legend', min: 600, max: null },
];

export function getLevel(totalPoints: number): LevelInfo {
  for (let i = LEVELS.length - 1; i >= 0; i -= 1) {
    if (totalPoints >= LEVELS[i].min) return LEVELS[i];
  }
  return LEVELS[0];
}

export function getNextLevel(totalPoints: number): LevelInfo | null {
  for (const level of LEVELS) {
    if (level.min > totalPoints) return level;
  }
  return null;
}

export function getLevelProgress(totalPoints: number) {
  const current = getLevel(totalPoints);
  const next = getNextLevel(totalPoints);
  if (!next || current.max === null) return { percent: 100, remaining: 0, nextLevel: null };
  const range = current.max - current.min;
  const earned = totalPoints - current.min;
  const percent = Math.min(100, Math.round((earned / range) * 100));
  const remaining = next.min - totalPoints;
  return { percent, remaining, nextLevel: next };
}
