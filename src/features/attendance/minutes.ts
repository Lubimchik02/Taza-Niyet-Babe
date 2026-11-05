/** Минуты на клиенте — только для показа и правки; расчёт часов делает сервер. */

export const MINUTE_STEP = 15;
export const MAX_MINUTES = 24 * 60;

/** Те же правила, что private.round_up_15 на сервере. */
export function roundUpTo15(minutes: number): number {
  return Math.ceil(Math.max(0, minutes) / MINUTE_STEP) * MINUTE_STEP;
}

/** Шаг ±15 минут в пределах суток. */
export function stepMinutes(current: number, delta: number): number {
  return Math.min(MAX_MINUTES, Math.max(0, current + delta));
}

/** 90 → { hours: 1, minutes: 30 } для строки «1 ч 30 мин». */
export function splitMinutes(total: number): { hours: number; minutes: number } {
  return { hours: Math.floor(total / 60), minutes: total % 60 };
}

/**
 * Меняет время «ЧЧ:ММ» у момента, сохраняя его дату в поясе устройства (координатор правит
 * время на своём телефоне). null — время введено неверно.
 */
export function replaceClock(iso: string, clock: string): string | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(clock.trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  const date = new Date(iso);
  date.setHours(hours, minutes, 0, 0);
  return date.toISOString();
}

/** «09:05» в поясе устройства. */
export function clockOf(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/** Средняя из трёх оценок, округлённая (её множитель пойдёт в баллы на этапе 6). */
export function averageRating(...ratings: number[]): number {
  return Math.round(ratings.reduce((a, b) => a + b, 0) / ratings.length);
}
