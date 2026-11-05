import { escapeHtml as e } from '@/features/certificates/template';

import { overallRating, type ReportRow, type VolunteerSummary } from './report';

export interface ReportHtmlLabels {
  title: string;
  period: string;
  generated: string;
  summary: string;
  details: string;
  volunteer: string;
  quests: string;
  hours: string;
  points: string;
  rating: string;
  date: string;
  quest: string;
  total: string;
  empty: string;
  duration: (minutes: number) => string;
}

/** Отчёт по часам за период для печати в PDF: сводка по волонтёрам и все подтверждения. */
export function buildReportHtml(input: {
  orgName: string;
  periodText: string;
  rows: readonly ReportRow[];
  summary: readonly VolunteerSummary[];
  labels: ReportHtmlLabels;
  locale: string;
  generatedAt: Date;
}): string {
  const { orgName, periodText, rows, summary, labels, locale, generatedAt } = input;
  const date = (iso: string) => new Date(iso).toLocaleDateString(locale);
  const totalMinutes = summary.reduce((sum, s) => sum + s.minutes, 0);
  const totalPoints = summary.reduce((sum, s) => sum + s.points, 0);

  const summaryRows = summary
    .map(
      (
        s,
      ) => `<tr><td>${e(s.name)}</td><td class="n">${s.quests}</td><td class="n">${e(labels.duration(s.minutes))}</td>
        <td class="n">${s.points}</td><td class="n">${s.avgRating === null ? '—' : e(s.avgRating.toLocaleString(locale))}</td></tr>`,
    )
    .join('');
  const detailRows = rows
    .map(
      (
        r,
      ) => `<tr><td>${e(date(r.quest_date))}</td><td>${e(r.quest_title)}</td><td>${e(r.volunteer_name)}</td>
        <td class="n">${e(labels.duration(r.minutes))}</td><td class="n">${overallRating(r)}</td><td class="n">${r.points}</td></tr>`,
    )
    .join('');

  return `<!doctype html><html><head><meta charset="utf-8" />
<title>${e(labels.title)} — ${e(orgName)}</title>
<style>
  @page { size: A4; margin: 14mm; }
  body { font-family: -apple-system, Roboto, "Segoe UI", Arial, sans-serif; color: #11261A; font-size: 12px; }
  h1 { font-size: 20px; margin: 0 0 4px; color: #1B7A47; }
  h2 { font-size: 14px; margin: 18px 0 6px; color: #1B7A47; }
  .meta { color: #4A6153; margin: 0 0 2px; }
  table { width: 100%; border-collapse: collapse; }
  th, td { text-align: left; padding: 5px 4px; border-bottom: 1px solid #E2F3E8; }
  th { color: #4A6153; font-weight: 600; }
  .n { text-align: right; white-space: nowrap; }
  tfoot td { font-weight: 700; border-top: 2px solid #1B7A47; }
</style></head><body>
<h1>${e(labels.title)}: ${e(orgName)}</h1>
<p class="meta">${e(labels.period)}: ${e(periodText)}</p>
<p class="meta">${e(labels.generated)}: ${e(generatedAt.toLocaleString(locale))}</p>
${
  rows.length === 0
    ? `<p>${e(labels.empty)}</p>`
    : `<h2>${e(labels.summary)}</h2>
<table><thead><tr><th>${e(labels.volunteer)}</th><th class="n">${e(labels.quests)}</th><th class="n">${e(labels.hours)}</th>
<th class="n">${e(labels.points)}</th><th class="n">${e(labels.rating)}</th></tr></thead>
<tbody>${summaryRows}</tbody>
<tfoot><tr><td>${e(labels.total)}</td><td class="n">${rows.filter((r) => r.minutes > 0).length}</td>
<td class="n">${e(labels.duration(totalMinutes))}</td><td class="n">${totalPoints}</td><td></td></tr></tfoot></table>
<h2>${e(labels.details)}</h2>
<table><thead><tr><th>${e(labels.date)}</th><th>${e(labels.quest)}</th><th>${e(labels.volunteer)}</th>
<th class="n">${e(labels.hours)}</th><th class="n">${e(labels.rating)}</th><th class="n">${e(labels.points)}</th></tr></thead>
<tbody>${detailRows}</tbody></table>`
}
</body></html>`;
}
