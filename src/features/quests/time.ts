/**
 * Время квестов. В БД — UTC. Координатор вводит местное время организации
 * (квест проходит там), волонтёр видит время в часовом поясе своего устройства.
 * Без внешних библиотек: смещение пояса берётся из Intl (есть в Hermes и Node).
 */

/** Смещение пояса относительно UTC в минутах в заданный момент (учитывает летнее время). */
export function timeZoneOffsetMinutes(utcMs: number, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(new Date(utcMs));
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((p) => p.type === type)?.value ?? 0);
  const asUtc = Date.UTC(
    get('year'),
    get('month') - 1,
    get('day'),
    get('hour'),
    get('minute'),
    get('second'),
  );
  return Math.round((asUtc - Math.floor(utcMs / 1000) * 1000) / 60000);
}

export interface WallTime {
  year: number;
  month: number; // 1–12
  day: number;
  hour: number;
  minute: number;
}

/** Местное время в поясе → момент UTC. */
export function wallTimeToUtc(t: WallTime, timeZone: string): Date {
  const guess = Date.UTC(t.year, t.month - 1, t.day, t.hour, t.minute);
  const offset = timeZoneOffsetMinutes(guess, timeZone);
  let utc = guess - offset * 60000;
  // Рядом с переходом на летнее время смещение в «угаданный» и настоящий момент различается.
  const corrected = timeZoneOffsetMinutes(utc, timeZone);
  if (corrected !== offset) utc = guess - corrected * 60000;
  return new Date(utc);
}

/** Момент UTC → местное время в поясе. */
export function utcToWallTime(date: Date, timeZone: string): WallTime {
  const shifted = new Date(
    date.getTime() + timeZoneOffsetMinutes(date.getTime(), timeZone) * 60000,
  );
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
    hour: shifted.getUTCHours(),
    minute: shifted.getUTCMinutes(),
  };
}

const pad = (n: number) => String(n).padStart(2, '0');

/** «08.11.2026» и «09:30» → WallTime; null, если дата или время не существуют. */
export function parseWallTime(date: string, time: string): WallTime | null {
  const d = /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/.exec(date.trim());
  const t = /^(\d{1,2}):(\d{2})$/.exec(time.trim());
  if (!d || !t) return null;
  const wall = {
    day: Number(d[1]),
    month: Number(d[2]),
    year: Number(d[3]),
    hour: Number(t[1]),
    minute: Number(t[2]),
  };
  if (wall.hour > 23 || wall.minute > 59) return null;
  // 31.02 и подобные: Date перенесёт день на следующий месяц — ловим это.
  const check = new Date(Date.UTC(wall.year, wall.month - 1, wall.day));
  if (check.getUTCMonth() !== wall.month - 1 || check.getUTCDate() !== wall.day) return null;
  return wall;
}

export function formatWallDate(t: WallTime): string {
  return `${pad(t.day)}.${pad(t.month)}.${t.year}`;
}

export function formatWallClock(t: WallTime): string {
  return `${pad(t.hour)}:${pad(t.minute)}`;
}

/** Пояс устройства — в нём волонтёр видит время. */
export function deviceTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
}

/** «сб, 8 нояб., 09:00–12:00» на языке интерфейса в поясе устройства. */
export function formatQuestTime(startsAt: string, endsAt: string, locale: string): string {
  const start = new Date(startsAt);
  const end = new Date(endsAt);
  const day = start.toLocaleDateString(locale, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
  const clock = (d: Date) => d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
  return `${day}, ${clock(start)}–${clock(end)}`;
}

export function durationMinutes(startsAt: string, endsAt: string): number {
  return Math.round((new Date(endsAt).getTime() - new Date(startsAt).getTime()) / 60000);
}
