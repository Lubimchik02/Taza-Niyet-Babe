/**
 * HTML сертификата для печати в PDF (expo-print). Чистая функция: данные и переведённые
 * подписи — на входе, разметка — на выходе. Все пользовательские строки экранируются.
 * Цвета — фиксированные печатные (не тема приложения): документ печатается на белом.
 */

export interface CertificateQuest {
  title: string;
  date: string;
  minutes: number;
  rating: number;
}

export interface CertificateSkill {
  code: string;
  name: Record<'kk' | 'ru' | 'en', string>;
  xp: number;
}

export interface CertificateData {
  id: string;
  full_name: string;
  org_name: string;
  total_minutes: number;
  quests_count: number;
  avg_rating: number | null;
  skills: CertificateSkill[];
  quests: CertificateQuest[];
  issued_at: string;
  revoked_at: string | null;
}

export interface CertificateLabels {
  title: string;
  subtitle: string;
  awardedTo: string;
  organization: string;
  hours: string;
  quests: string;
  avgRating: string;
  skills: string;
  questList: string;
  columnDate: string;
  columnQuest: string;
  columnHours: string;
  columnRating: string;
  verifyTitle: string;
  verifyHint: string;
  issued: string;
  number: string;
  revoked: string;
  duration: (minutes: number) => string;
}

const HTML_ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (ch) => HTML_ESCAPES[ch] ?? ch);
}

export function buildCertificateHtml(input: {
  data: CertificateData;
  labels: CertificateLabels;
  qrSvg: string;
  verifyUrl: string;
  locale: string;
  lang: 'kk' | 'ru' | 'en';
}): string {
  const { data, labels, qrSvg, verifyUrl, locale, lang } = input;
  const e = escapeHtml;
  const date = (iso: string) =>
    new Date(iso).toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' });
  const rating =
    data.avg_rating === null
      ? '—'
      : data.avg_rating.toLocaleString(locale, { maximumFractionDigits: 1 });

  const skills = data.skills
    .filter((s) => s.xp > 0)
    .map((s) => `<span class="chip">${e(s.name[lang])} · ${s.xp} XP</span>`)
    .join('');
  const rows = data.quests
    .map(
      (q) => `<tr>
        <td>${e(date(q.date))}</td>
        <td>${e(q.title)}</td>
        <td class="num">${e(labels.duration(q.minutes))}</td>
        <td class="num">${'★'.repeat(Math.max(0, Math.min(5, q.rating)))}</td>
      </tr>`,
    )
    .join('');

  return `<!doctype html>
<html lang="${lang}">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${e(labels.title)} — ${e(data.full_name)}</title>
<style>
  @page { size: A4; margin: 16mm; }
  * { box-sizing: border-box; }
  body { font-family: -apple-system, Roboto, "Segoe UI", Arial, sans-serif; color: #11261A; margin: 0; }
  .frame { border: 3px solid #1B7A47; border-radius: 16px; padding: 28px; position: relative; }
  .head { text-align: center; border-bottom: 2px solid #E2F3E8; padding-bottom: 16px; }
  .brand { color: #1B7A47; font-weight: 800; letter-spacing: 2px; font-size: 14px; }
  h1 { font-size: 30px; margin: 8px 0 4px; letter-spacing: 1px; }
  .sub { color: #4A6153; margin: 0; }
  .awarded { text-align: center; margin: 24px 0 8px; color: #4A6153; }
  .name { text-align: center; font-size: 32px; font-weight: 800; margin: 0; }
  .org { text-align: center; margin: 6px 0 20px; }
  .stats { display: flex; gap: 12px; margin: 16px 0; }
  .stat { flex: 1; background: #F4FAF6; border-radius: 12px; padding: 12px; text-align: center; }
  .stat b { display: block; font-size: 24px; color: #1B7A47; }
  h2 { font-size: 16px; margin: 20px 0 8px; color: #1B7A47; }
  .chip { display: inline-block; background: #E2F3E8; color: #1B7A47; border-radius: 999px; padding: 4px 10px; margin: 0 6px 6px 0; font-size: 12px; font-weight: 600; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  th, td { text-align: left; padding: 6px 4px; border-bottom: 1px solid #E2F3E8; }
  th { color: #4A6153; font-weight: 600; }
  .num { text-align: right; white-space: nowrap; }
  .verify { display: flex; gap: 16px; align-items: center; margin-top: 24px; padding-top: 16px; border-top: 2px solid #E2F3E8; }
  .qr { width: 120px; height: 120px; flex: none; }
  .qr svg { width: 120px; height: 120px; }
  .small { font-size: 11px; color: #4A6153; word-break: break-all; }
  .revoked { position: absolute; top: 40%; left: 0; right: 0; text-align: center; transform: rotate(-18deg);
             font-size: 64px; font-weight: 900; color: rgba(179, 38, 30, 0.25); letter-spacing: 6px; }
</style>
</head>
<body>
<div class="frame">
  ${data.revoked_at ? `<div class="revoked">${e(labels.revoked)}</div>` : ''}
  <div class="head">
    <div class="brand">TAZA NIYET</div>
    <h1>${e(labels.title)}</h1>
    <p class="sub">${e(labels.subtitle)}</p>
  </div>
  <p class="awarded">${e(labels.awardedTo)}</p>
  <p class="name">${e(data.full_name)}</p>
  <p class="org">${e(labels.organization)}: <b>${e(data.org_name)}</b></p>

  <div class="stats">
    <div class="stat"><b>${e(labels.duration(data.total_minutes))}</b>${e(labels.hours)}</div>
    <div class="stat"><b>${data.quests_count}</b>${e(labels.quests)}</div>
    <div class="stat"><b>${e(rating)}</b>${e(labels.avgRating)}</div>
  </div>

  ${skills ? `<h2>${e(labels.skills)}</h2><div>${skills}</div>` : ''}

  <h2>${e(labels.questList)}</h2>
  <table>
    <thead><tr>
      <th>${e(labels.columnDate)}</th><th>${e(labels.columnQuest)}</th>
      <th class="num">${e(labels.columnHours)}</th><th class="num">${e(labels.columnRating)}</th>
    </tr></thead>
    <tbody>${rows}</tbody>
  </table>

  <div class="verify">
    <div class="qr">${qrSvg}</div>
    <div>
      <b>${e(labels.verifyTitle)}</b>
      <p class="small">${e(labels.verifyHint)}</p>
      <p class="small">${e(verifyUrl)}</p>
      <p class="small">${e(labels.number)}: ${e(data.id)} · ${e(labels.issued)}: ${e(date(data.issued_at))}</p>
    </div>
  </div>
</div>
</body>
</html>`;
}
