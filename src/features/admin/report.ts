/**
 * Отчёт по часам: CSV для таблиц и сводка по волонтёрам. Чистые функции — тестируются без UI.
 *
 * CSV: разделитель «;» и BOM в начале — так файл без настроек открывается в Excel
 * с русской/казахской локалью (там «,» — десятичный разделитель) и не ломает кириллицу.
 */

export interface ReportRow {
  quest_date: string;
  quest_title: string;
  difficulty: string;
  volunteer_id: string;
  volunteer_name: string;
  minutes: number;
  rating_quality: number;
  rating_activity: number;
  rating_teamwork: number;
  points: number;
  confirmed_by_name: string | null;
  confirmed_at: string;
}

export interface VolunteerSummary {
  volunteerId: string;
  name: string;
  quests: number;
  minutes: number;
  points: number;
  avgRating: number | null;
}

const BOM = '﻿';

export function csvCell(value: string | number | null | undefined, separator = ';'): string {
  const text = value === null || value === undefined ? '' : String(value);
  // Формулы в начале ячейки (=, +, -, @) Excel выполнит — экранируем апострофом (CSV-инъекция).
  const safe = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
  return safe.includes(separator) || /["\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

export function toCsv(
  rows: readonly (readonly (string | number | null | undefined)[])[],
  separator = ';',
): string {
  return (
    BOM + rows.map((r) => r.map((c) => csvCell(c, separator)).join(separator)).join('\r\n') + '\r\n'
  );
}

export function overallRating(
  r: Pick<ReportRow, 'rating_quality' | 'rating_activity' | 'rating_teamwork'>,
) {
  return Math.round((r.rating_quality + r.rating_activity + r.rating_teamwork) / 3);
}

/** Итоги по каждому волонтёру; квесты с 0 минут (не работал) в часы не идут. */
export function summarizeByVolunteer(rows: readonly ReportRow[]): VolunteerSummary[] {
  const map = new Map<string, VolunteerSummary & { ratingSum: number; rated: number }>();
  for (const r of rows) {
    const s = map.get(r.volunteer_id) ?? {
      volunteerId: r.volunteer_id,
      name: r.volunteer_name,
      quests: 0,
      minutes: 0,
      points: 0,
      avgRating: null,
      ratingSum: 0,
      rated: 0,
    };
    if (r.minutes > 0) {
      s.quests += 1;
      s.minutes += r.minutes;
      s.ratingSum += overallRating(r);
      s.rated += 1;
    }
    s.points += r.points;
    map.set(r.volunteer_id, s);
  }
  return [...map.values()]
    .map(({ ratingSum, rated, ...s }) => ({
      ...s,
      avgRating: rated > 0 ? Math.round((ratingSum / rated) * 100) / 100 : null,
    }))
    .sort((a, b) => b.minutes - a.minutes || a.name.localeCompare(b.name));
}

export interface ReportCsvLabels {
  date: string;
  quest: string;
  difficulty: string;
  volunteer: string;
  minutes: string;
  hours: string;
  rating: string;
  points: string;
  confirmedBy: string;
  confirmedAt: string;
  difficulties: Record<string, string>;
}

/** Подробный CSV: одна строка — одно подтверждение часов. Часы — с запятой (локаль Excel). */
export function buildReportCsv(
  rows: readonly ReportRow[],
  labels: ReportCsvLabels,
  locale: string,
): string {
  const date = (iso: string) => new Date(iso).toLocaleDateString(locale);
  const hours = (m: number) =>
    (m / 60).toLocaleString(locale, { maximumFractionDigits: 2, useGrouping: false });
  return toCsv([
    [
      labels.date,
      labels.quest,
      labels.difficulty,
      labels.volunteer,
      labels.minutes,
      labels.hours,
      labels.rating,
      labels.points,
      labels.confirmedBy,
      labels.confirmedAt,
    ],
    ...rows.map((r) => [
      date(r.quest_date),
      r.quest_title,
      labels.difficulties[r.difficulty] ?? r.difficulty,
      r.volunteer_name,
      r.minutes,
      hours(r.minutes),
      overallRating(r),
      r.points,
      r.confirmed_by_name ?? '',
      date(r.confirmed_at),
    ]),
  ]);
}

/** Поля, которые изменились в записи аудита (без служебного updated_at). */
export function changedFields(
  oldValue: Record<string, unknown> | null,
  newValue: Record<string, unknown> | null,
): string[] {
  if (!oldValue || !newValue) return [];
  const keys = new Set([...Object.keys(oldValue), ...Object.keys(newValue)]);
  return [...keys]
    .filter(
      (k) => k !== 'updated_at' && JSON.stringify(oldValue[k]) !== JSON.stringify(newValue[k]),
    )
    .sort();
}

export type ReportPeriodKind = 'month' | 'lastMonth' | 'year' | 'custom';

/**
 * Период отчёта в поясе устройства: [from, to) — конец не включается.
 * Для своего периода «по» — включительно: до начала следующего дня.
 * null — свои даты введены неверно или конец раньше начала.
 */
export function reportPeriod(
  kind: ReportPeriodKind,
  now: Date,
  custom?: { from: string; to: string },
): { from: Date; to: Date } | null {
  const y = now.getFullYear();
  const m = now.getMonth();
  if (kind === 'month') return { from: new Date(y, m, 1), to: new Date(y, m + 1, 1) };
  if (kind === 'lastMonth') return { from: new Date(y, m - 1, 1), to: new Date(y, m, 1) };
  if (kind === 'year') return { from: new Date(y, 0, 1), to: new Date(y + 1, 0, 1) };
  const parse = (text: string) => {
    const match = /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/.exec(text.trim());
    if (!match) return null;
    const date = new Date(Number(match[3]), Number(match[2]) - 1, Number(match[1]));
    return date.getDate() === Number(match[1]) && date.getMonth() === Number(match[2]) - 1
      ? date
      : null;
  };
  const from = custom ? parse(custom.from) : null;
  const toDay = custom ? parse(custom.to) : null;
  if (!from || !toDay) return null;
  const to = new Date(toDay.getFullYear(), toDay.getMonth(), toDay.getDate() + 1);
  return to > from ? { from, to } : null;
}

/** «2026-10-01» в поясе устройства — для имени файла (toISOString дал бы дату в UTC). */
export function localDateStamp(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}
