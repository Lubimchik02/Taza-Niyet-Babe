import {
  durationMinutes,
  parseWallTime,
  timeZoneOffsetMinutes,
  utcToWallTime,
  wallTimeToUtc,
} from '../time';

describe('часовые пояса', () => {
  it('Алматы — UTC+5 (с марта 2024)', () => {
    expect(timeZoneOffsetMinutes(Date.UTC(2026, 10, 8, 4, 0), 'Asia/Almaty')).toBe(300);
  });

  it('09:00 в Алматы = 04:00 UTC', () => {
    const utc = wallTimeToUtc({ year: 2026, month: 11, day: 8, hour: 9, minute: 0 }, 'Asia/Almaty');
    expect(utc.toISOString()).toBe('2026-11-08T04:00:00.000Z');
  });

  it('квест после полуночи по местному времени — предыдущий день в UTC', () => {
    const utc = wallTimeToUtc({ year: 2026, month: 1, day: 1, hour: 2, minute: 30 }, 'Asia/Almaty');
    expect(utc.toISOString()).toBe('2025-12-31T21:30:00.000Z');
  });

  it('учитывает летнее время (Берлин: зимой +1, летом +2)', () => {
    expect(
      wallTimeToUtc(
        { year: 2026, month: 1, day: 15, hour: 10, minute: 0 },
        'Europe/Berlin',
      ).toISOString(),
    ).toBe('2026-01-15T09:00:00.000Z');
    expect(
      wallTimeToUtc(
        { year: 2026, month: 7, day: 15, hour: 10, minute: 0 },
        'Europe/Berlin',
      ).toISOString(),
    ).toBe('2026-07-15T08:00:00.000Z');
  });

  it('прямое и обратное преобразование сходятся', () => {
    const wall = { year: 2026, month: 3, day: 29, hour: 14, minute: 45 };
    for (const tz of ['Asia/Almaty', 'Asia/Aqtobe', 'Europe/Berlin', 'America/New_York', 'UTC']) {
      expect(utcToWallTime(wallTimeToUtc(wall, tz), tz)).toEqual(wall);
    }
  });
});

describe('parseWallTime', () => {
  it('разбирает дату и время', () => {
    expect(parseWallTime('8.11.2026', '9:05')).toEqual({
      year: 2026,
      month: 11,
      day: 8,
      hour: 9,
      minute: 5,
    });
  });

  it.each([
    ['31.02.2026', '10:00'],
    ['29.02.2026', '10:00'],
    ['01.13.2026', '10:00'],
    ['01.01.2026', '24:00'],
    ['01.01.2026', '10:60'],
    ['2026-01-01', '10:00'],
    ['', ''],
  ])('отклоняет %s %s', (date, time) => {
    expect(parseWallTime(date, time)).toBeNull();
  });

  it('29 февраля високосного года — существует', () => {
    expect(parseWallTime('29.02.2028', '10:00')).not.toBeNull();
  });
});

describe('durationMinutes', () => {
  it('считает длительность, в том числе через полночь', () => {
    expect(durationMinutes('2026-11-08T20:00:00Z', '2026-11-09T01:30:00Z')).toBe(330);
  });
});
