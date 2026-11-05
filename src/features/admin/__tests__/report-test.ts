import {
  buildReportCsv,
  changedFields,
  csvCell,
  localDateStamp,
  reportPeriod,
  summarizeByVolunteer,
  toCsv,
  type ReportCsvLabels,
  type ReportRow,
} from '../report';
import { buildReportHtml } from '../report-html';

const row = (patch: Partial<ReportRow>): ReportRow => ({
  quest_date: '2026-10-22T04:00:00Z',
  quest_title: 'Субботник',
  difficulty: 'easy',
  volunteer_id: 'v1',
  volunteer_name: 'Арман Касымов',
  minutes: 180,
  rating_quality: 5,
  rating_activity: 5,
  rating_teamwork: 4,
  points: 39,
  confirmed_by_name: 'Данияр Сапаров',
  confirmed_at: '2026-10-22T08:00:00Z',
  ...patch,
});

const labels: ReportCsvLabels = {
  date: 'Дата',
  quest: 'Квест',
  difficulty: 'Сложность',
  volunteer: 'Волонтёр',
  minutes: 'Минуты',
  hours: 'Часы',
  rating: 'Оценка',
  points: 'Баллы',
  confirmedBy: 'Подтвердил',
  confirmedAt: 'Дата подтверждения',
  difficulties: { easy: 'Лёгкая', hard: 'Сложная' },
};

describe('CSV', () => {
  it('BOM, разделитель «;», перевод строки CRLF', () => {
    const csv = toCsv([
      ['a', 'b'],
      ['1', '2'],
    ]);
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    expect(csv.slice(1)).toBe('a;b\r\n1;2\r\n');
  });

  it.each([
    ['просто', 'просто'],
    ['с;точкой с запятой', '"с;точкой с запятой"'],
    ['с "кавычками"', '"с ""кавычками"""'],
    ['две\nстроки', '"две\nстроки"'],
    [null, ''],
    [42, '42'],
  ])('ячейка %p → %p', (input, expected) => {
    expect(csvCell(input)).toBe(expected);
  });

  it.each(['=HYPERLINK("http://evil")', '+1', '-2+3', '@SUM(A1)'])(
    'формула %p не выполнится в Excel (CSV-инъекция)',
    (input) => {
      expect(csvCell(input).replace(/^"/, '').startsWith("'")).toBe(true);
    },
  );

  it('отчёт: заголовок, сложность по-русски, часы с запятой', () => {
    const csv = buildReportCsv([row({ minutes: 135, difficulty: 'hard' })], labels, 'ru-RU');
    const [header, line] = csv.slice(1).split('\r\n');
    expect(header).toBe(
      'Дата;Квест;Сложность;Волонтёр;Минуты;Часы;Оценка;Баллы;Подтвердил;Дата подтверждения',
    );
    expect(line).toBe(
      '22.10.2026;Субботник;Сложная;Арман Касымов;135;2,25;5;39;Данияр Сапаров;22.10.2026',
    );
  });
});

describe('summarizeByVolunteer', () => {
  it('суммирует по волонтёру и сортирует по часам', () => {
    const summary = summarizeByVolunteer([
      row({}),
      row({ quest_title: 'Берег', minutes: 240, points: 182, rating_teamwork: 5 }),
      row({
        volunteer_id: 'v2',
        volunteer_name: 'Алия Бекова',
        minutes: 180,
        points: 35,
        rating_quality: 4,
      }),
    ]);
    expect(summary).toEqual([
      {
        volunteerId: 'v1',
        name: 'Арман Касымов',
        quests: 2,
        minutes: 420,
        points: 221,
        avgRating: 5,
      },
      { volunteerId: 'v2', name: 'Алия Бекова', quests: 1, minutes: 180, points: 35, avgRating: 4 },
    ]);
  });

  it('квест с 0 минут не считается отработанным', () => {
    const [s] = summarizeByVolunteer([
      row({ minutes: 0, points: 0, rating_quality: 1, rating_activity: 1, rating_teamwork: 1 }),
    ]);
    expect(s).toMatchObject({ quests: 0, minutes: 0, avgRating: null });
  });

  it('баллы — с учётом компенсаций (могут быть отрицательными)', () => {
    const [s] = summarizeByVolunteer([
      row({ points: 105 }),
      row({ quest_title: 'x', points: -10 }),
    ]);
    expect(s?.points).toBe(95);
  });
});

describe('changedFields', () => {
  it('показывает изменившиеся поля без updated_at', () => {
    expect(
      changedFields(
        { capacity: 3, title: 'A', updated_at: '1', tags: ['x'] },
        { capacity: 4, title: 'A', updated_at: '2', tags: ['x', 'y'] },
      ),
    ).toEqual(['capacity', 'tags']);
  });

  it('вставка и удаление — без списка полей', () => {
    expect(changedFields(null, { a: 1 })).toEqual([]);
    expect(changedFields({ a: 1 }, null)).toEqual([]);
  });
});

describe('HTML отчёта', () => {
  const base = {
    orgName: 'Taza Qala',
    periodText: '01.10.2026 — 31.10.2026',
    labels: {
      title: 'Отчёт по часам',
      period: 'Период',
      generated: 'Сформирован',
      summary: 'Итоги по волонтёрам',
      details: 'Все подтверждения',
      volunteer: 'Волонтёр',
      quests: 'Квесты',
      hours: 'Часы',
      points: 'Баллы',
      rating: 'Оценка',
      date: 'Дата',
      quest: 'Квест',
      total: 'Итого',
      empty: 'За период нет подтверждённых часов.',
      duration: (m: number) => `${m} мин`,
    },
    locale: 'ru',
    generatedAt: new Date('2026-11-05T12:00:00Z'),
  };

  it('сводка, итоги и подробности; строки экранированы', () => {
    const rows = [
      row({ volunteer_name: '<b>Хакер</b>' }),
      row({ volunteer_id: 'v2', volunteer_name: 'Алия', minutes: 60, points: 10 }),
    ];
    const html = buildReportHtml({ ...base, rows, summary: summarizeByVolunteer(rows) });
    expect(html).toContain('Отчёт по часам: Taza Qala');
    expect(html).toContain('&lt;b&gt;Хакер&lt;/b&gt;');
    expect(html).not.toContain('<b>Хакер</b>');
    expect(html).toContain('<td class="n">240 мин</td><td class="n">49</td>'); // итого: 180 + 60 мин, 39 + 10 баллов
  });

  it('пустой период — понятное сообщение', () => {
    expect(buildReportHtml({ ...base, rows: [], summary: [] })).toContain(
      'За период нет подтверждённых часов.',
    );
  });
});

describe('reportPeriod', () => {
  const now = new Date(2026, 10, 5, 15, 0); // 5 ноября 2026
  const ymd = (d: Date | undefined) =>
    d ? [d.getFullYear(), d.getMonth() + 1, d.getDate()] : null;

  it('этот и прошлый месяц, год', () => {
    const month = reportPeriod('month', now);
    expect([ymd(month?.from), ymd(month?.to)]).toEqual([
      [2026, 11, 1],
      [2026, 12, 1],
    ]);
    const last = reportPeriod('lastMonth', now);
    expect([ymd(last?.from), ymd(last?.to)]).toEqual([
      [2026, 10, 1],
      [2026, 11, 1],
    ]);
    const year = reportPeriod('year', now);
    expect([ymd(year?.from), ymd(year?.to)]).toEqual([
      [2026, 1, 1],
      [2027, 1, 1],
    ]);
  });

  it('прошлый месяц в январе — декабрь прошлого года', () => {
    const p = reportPeriod('lastMonth', new Date(2027, 0, 10));
    expect([ymd(p?.from), ymd(p?.to)]).toEqual([
      [2026, 12, 1],
      [2027, 1, 1],
    ]);
  });

  it('свой период: последний день входит целиком', () => {
    const p = reportPeriod('custom', now, { from: '01.10.2026', to: '31.10.2026' });
    expect([ymd(p?.from), ymd(p?.to)]).toEqual([
      [2026, 10, 1],
      [2026, 11, 1],
    ]);
  });

  it.each([
    [{ from: '31.02.2026', to: '01.03.2026' }],
    [{ from: '10.10.2026', to: '01.10.2026' }],
    [{ from: 'вчера', to: '01.10.2026' }],
  ])('неверный период %p → null', (custom) => {
    expect(reportPeriod('custom', now, custom)).toBeNull();
  });
});

describe('localDateStamp', () => {
  it('местная дата, а не UTC: полночь 1 октября не превращается в 30 сентября', () => {
    expect(localDateStamp(new Date(2026, 9, 1, 0, 0))).toBe('2026-10-01');
  });
});
