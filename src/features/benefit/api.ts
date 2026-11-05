import { unwrap } from '@/lib/db-errors';
import { supabase } from '@/lib/supabase';

import type { LevelCode } from './levels';

type I18nText = Record<'kk' | 'ru' | 'en', string>;

export interface BenefitSkill {
  code: string;
  name: I18nText;
  xp: number;
}

export interface BenefitAchievement {
  code: string;
  name: I18nText;
  description: I18nText;
  icon: string;
  unlocked_at: string | null;
}

export type Benefit = NonNullable<Awaited<ReturnType<typeof fetchBenefit>>>;
export type HoursPeriod = 'week' | 'month' | 'year' | 'all';
export type LeaderboardPeriod = 'month' | 'all';

export async function fetchBenefit() {
  const rows = unwrap(await supabase.rpc('my_benefit'));
  const row = rows[0];
  if (!row) return null;
  return {
    ...row,
    level_code: row.level_code as LevelCode,
    next_level_code: row.next_level_code as LevelCode | null,
    avg_rating: row.avg_rating === null ? null : Number(row.avg_rating),
    skills: row.skills as unknown as BenefitSkill[],
    achievements: row.achievements as unknown as BenefitAchievement[],
  };
}

/** Начало периода в поясе устройства (для «часы за период»). */
export function periodStart(period: HoursPeriod, now: Date = new Date()): Date | null {
  if (period === 'all') return null;
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  if (period === 'week') start.setDate(start.getDate() - ((start.getDay() + 6) % 7)); // с понедельника
  if (period === 'month') start.setDate(1);
  if (period === 'year') start.setMonth(0, 1);
  return start;
}

export async function fetchHours(period: HoursPeriod) {
  const from = periodStart(period);
  const rows = unwrap(await supabase.rpc('my_hours', from ? { p_from: from.toISOString() } : {}));
  return rows[0] ?? { minutes: 0, quests: 0 };
}

export async function fetchLeaderboard(orgId: string, period: LeaderboardPeriod) {
  return unwrap(await supabase.rpc('org_leaderboard', { p_org_id: orgId, p_period: period }));
}

export async function setHideFromLeaderboard(userId: string, hide: boolean) {
  unwrap(await supabase.from('profiles').update({ hide_from_leaderboard: hide }).eq('id', userId));
}

export async function setQuestContribution(
  questId: string,
  bags: number | null,
  area: number | null,
) {
  return unwrap(
    await supabase.rpc('set_quest_contribution', {
      p_quest_id: questId,
      p_bags: bags as number,
      p_area_m2: area as number,
    }),
  );
}

export async function fetchQuestContribution(questId: string) {
  return unwrap(
    await supabase.from('quests').select('bags_collected, area_m2').eq('id', questId).maybeSingle(),
  );
}
