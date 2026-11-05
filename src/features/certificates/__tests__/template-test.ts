import {
  buildCertificateHtml,
  escapeHtml,
  type CertificateData,
  type CertificateLabels,
} from '../template';
import { qrSvg, verifyUrl } from '../verify-url';

const labels: CertificateLabels = {
  title: 'Сертификат волонтёра',
  subtitle: 'Подтверждённое волонтёрство',
  awardedTo: 'Настоящим подтверждается, что',
  organization: 'Организация',
  hours: 'подтверждённых часов',
  quests: 'квестов',
  avgRating: 'средняя оценка',
  skills: 'Навыки',
  questList: 'Квесты',
  columnDate: 'Дата',
  columnQuest: 'Квест',
  columnHours: 'Часы',
  columnRating: 'Оценка',
  verifyTitle: 'Проверить подлинность',
  verifyHint: 'Отсканируйте QR-код',
  issued: 'Выдан',
  number: '№',
  revoked: 'ОТОЗВАН',
  duration: (m) => `${Math.floor(m / 60)} ч ${m % 60} мин`,
};

const data: CertificateData = {
  id: '11111111-2222-4333-8444-555555555555',
  full_name: 'Арман Касымов',
  org_name: 'Taza Qala',
  total_minutes: 420,
  quests_count: 2,
  avg_rating: 5,
  skills: [
    { code: 'ecology', name: { kk: 'Экология', ru: 'Экология', en: 'Ecology' }, xp: 40 },
    { code: 'leadership', name: { kk: 'Көшбасшылық', ru: 'Лидерство', en: 'Leadership' }, xp: 0 },
  ],
  quests: [
    { title: 'Субботник в парке Горького', date: '2026-10-22T04:00:00Z', minutes: 180, rating: 5 },
  ],
  issued_at: '2026-11-05T10:00:00Z',
  revoked_at: null,
};

const build = (overrides: Partial<CertificateData> = {}, lang: 'kk' | 'ru' | 'en' = 'ru') =>
  buildCertificateHtml({
    data: { ...data, ...overrides },
    labels,
    qrSvg: '<svg id="qr"></svg>',
    verifyUrl: verifyUrl(data.id, 'https://taza-niyet.kz'),
    locale: 'ru',
    lang,
  });

describe('HTML сертификата', () => {
  it('содержит ФИО, организацию, часы, квесты, QR и ссылку проверки', () => {
    const html = build();
    for (const part of [
      'Арман Касымов',
      'Taza Qala',
      '7 ч 0 мин',
      'Субботник в парке Горького',
      '<svg id="qr"></svg>',
      'https://taza-niyet.kz/verify/11111111-2222-4333-8444-555555555555',
    ]) {
      expect(html).toContain(part);
    }
  });

  it('навыки — только прокачанные, на языке документа', () => {
    expect(build()).toContain('Экология · 40 XP');
    expect(build()).not.toContain('Лидерство');
    expect(build({}, 'en')).toContain('Ecology · 40 XP');
  });

  it('пользовательские строки экранируются: имя не может стать кодом', () => {
    const html = build({ full_name: '<script>alert(1)</script>', org_name: 'A & "B"' });
    expect(html).not.toContain('<script>alert(1)</script>');
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(html).toContain('A &amp; &quot;B&quot;');
  });

  it('отозванный сертификат помечен поверх документа', () => {
    expect(build()).not.toContain('class="revoked"');
    expect(build({ revoked_at: '2026-11-06T00:00:00Z' })).toContain('ОТОЗВАН');
  });

  it('без оценки — прочерк', () => {
    expect(build({ avg_rating: null })).toContain('<b>—</b>');
  });
});

describe('escapeHtml', () => {
  it('экранирует все опасные символы', () => {
    expect(escapeHtml(`<a href="x" onclick='y'>&</a>`)).toBe(
      '&lt;a href=&quot;x&quot; onclick=&#39;y&#39;&gt;&amp;&lt;/a&gt;',
    );
  });
});

describe('QR проверки', () => {
  it('ссылка ведёт на verify/{id}', () => {
    expect(verifyUrl('abc', 'https://taza-niyet.kz')).toBe('https://taza-niyet.kz/verify/abc');
  });

  it('QR — валидный SVG', async () => {
    const svg = await qrSvg('https://taza-niyet.kz/verify/abc');
    expect(svg.startsWith('<svg')).toBe(true);
    expect(svg).toContain('</svg>');
  });
});
