import type { QuestDifficulty } from '@/lib/db';

import { distanceMeters, type LatLng } from './geo';

export type Period = 'all' | 'today' | 'week' | 'month';
export type MaxDistanceKm = null | 1 | 5 | 20;

export interface FeedFilters {
  /** Пусто — все сложности. */
  difficulties: QuestDifficulty[];
  period: Period;
  /** null — без ограничения; работает, только если известно местоположение. */
  maxDistanceKm: MaxDistanceKm;
}

export const DEFAULT_FILTERS: FeedFilters = {
  difficulties: [],
  period: 'all',
  maxDistanceKm: null,
};

interface FilterableQuest {
  difficulty: QuestDifficulty;
  starts_at: string;
  lat: number;
  lng: number;
}

/** Конец периода в локальном времени устройства. */
export function periodEnd(period: Period, now: Date): Date | null {
  if (period === 'all') return null;
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);
  if (period === 'week') end.setDate(end.getDate() + 6);
  if (period === 'month') end.setDate(end.getDate() + 29);
  return end;
}

export function applyFeedFilters<T extends FilterableQuest>(
  quests: readonly T[],
  filters: FeedFilters,
  origin: LatLng | null,
  now: Date = new Date(),
): (T & { distanceM: number | null })[] {
  const end = periodEnd(filters.period, now);
  return quests
    .map((q) => ({ ...q, distanceM: origin ? distanceMeters(origin, q) : null }))
    .filter(
      (q) =>
        (filters.difficulties.length === 0 || filters.difficulties.includes(q.difficulty)) &&
        (end === null || new Date(q.starts_at) <= end) &&
        (filters.maxDistanceKm === null ||
          q.distanceM === null ||
          q.distanceM <= filters.maxDistanceKm * 1000),
    );
}
