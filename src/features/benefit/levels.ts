/**
 * Уровни волонтёра по сумме баллов. Источник правды — таблица public.levels;
 * здесь те же пороги для прогресс-бара (сверяются тестами с заданием и с pgTAP).
 */

export const LEVELS = [
  { code: 'newcomer', minPoints: 0 },
  { code: 'helper', minPoints: 100 },
  { code: 'activist', minPoints: 300 },
  { code: 'leader', minPoints: 700 },
  { code: 'ambassador', minPoints: 1500 },
] as const;

export type LevelCode = (typeof LEVELS)[number]['code'];

export interface LevelProgress {
  current: LevelCode;
  next: LevelCode | null;
  /** 0…1 — доля пути от текущего уровня до следующего. */
  progress: number;
  pointsToNext: number;
}

export function levelProgress(points: number): LevelProgress {
  const safe = Math.max(0, points);
  let index = 0;
  LEVELS.forEach((level, i) => {
    if (safe >= level.minPoints) index = i;
  });
  const current = LEVELS[index] ?? LEVELS[0];
  const next = LEVELS[index + 1];
  if (!next) return { current: current.code, next: null, progress: 1, pointsToNext: 0 };
  return {
    current: current.code,
    next: next.code,
    progress: (safe - current.minPoints) / (next.minPoints - current.minPoints),
    pointsToNext: next.minPoints - safe,
  };
}

/** Открыт ли бонус уровня `perkLevel` при текущем уровне. */
export function isPerkUnlocked(current: LevelCode, perkLevel: LevelCode): boolean {
  const pos = (code: LevelCode) => LEVELS.findIndex((l) => l.code === code);
  return pos(current) >= pos(perkLevel);
}
