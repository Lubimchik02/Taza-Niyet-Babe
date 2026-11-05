import {
  averageRating,
  clockOf,
  replaceClock,
  roundUpTo15,
  splitMinutes,
  stepMinutes,
} from '../minutes';
import { batchMinutesLeft, buildCheckinUrl, parseCheckinToken, pickCurrentToken } from '../qr';

jest.mock('expo-linking', () => ({
  createURL: (path: string) => `tazaniyet://${path.replace(/^\//, '')}`,
}));

const QUEST = '9e000000-0000-4000-8000-000000000003';
const TOKEN = `${QUEST}.59401234.${'ab12'.repeat(8)}`;

describe('parseCheckinToken', () => {
  it.each([
    [TOKEN],
    [`  ${TOKEN} `],
    [`tazaniyet://checkin/${TOKEN}`],
    [`exp://192.168.1.5:8081/--/checkin/${TOKEN}`],
    [buildCheckinUrl(TOKEN)],
  ])('распознаёт %p', (input) => {
    expect(parseCheckinToken(input)).toEqual({ token: TOKEN, questId: QUEST, window: 59401234 });
  });

  it.each([
    [''],
    ['tazaniyet://join/Ab3_dE-fGh1JkL9m'],
    [`${QUEST}.59401234.${'zz'.repeat(16)}`],
    [`${QUEST}.59401234.${'ab'.repeat(15)}`],
    [`not-a-uuid.59401234.${'ab12'.repeat(8)}`],
    [`${QUEST}.-5.${'ab12'.repeat(8)}`],
  ])('отклоняет %p', (input) => {
    expect(parseCheckinToken(input)).toBeNull();
  });
});

describe('пачка токенов координатора', () => {
  const batch = [0, 1, 2].map((i) => ({
    token: `t${i}`,
    valid_from: new Date(Date.UTC(2026, 10, 5, 9, 0, i * 30)).toISOString(),
    valid_until: new Date(Date.UTC(2026, 10, 5, 9, 0, (i + 1) * 30)).toISOString(),
  }));

  it('выбирает токен текущего окна', () => {
    expect(pickCurrentToken(batch, new Date(Date.UTC(2026, 10, 5, 9, 0, 45)))?.token).toBe('t1');
    expect(pickCurrentToken(batch, new Date(Date.UTC(2026, 10, 5, 9, 0, 30)))?.token).toBe('t1');
  });

  it('пачка закончилась — null, чтобы экран попросил сеть', () => {
    expect(pickCurrentToken(batch, new Date(Date.UTC(2026, 10, 5, 9, 2, 0)))).toBeNull();
    expect(batchMinutesLeft(batch, new Date(Date.UTC(2026, 10, 5, 9, 0, 30)))).toBe(1);
    expect(batchMinutesLeft([], new Date())).toBe(0);
  });
});

describe('минуты', () => {
  it('округление совпадает с серверным', () => {
    expect([0, 0.01, 15, 15.01, 130, 179.99].map(roundUpTo15)).toEqual([0, 15, 15, 30, 135, 180]);
  });

  it('шаг ±15 в пределах суток', () => {
    expect(stepMinutes(0, -15)).toBe(0);
    expect(stepMinutes(1435, 15)).toBe(1440);
    expect(stepMinutes(90, 15)).toBe(105);
  });

  it('часы и минуты', () => {
    expect(splitMinutes(90)).toEqual({ hours: 1, minutes: 30 });
    expect(splitMinutes(45)).toEqual({ hours: 0, minutes: 45 });
  });

  it('средняя оценка', () => {
    expect(averageRating(5, 4, 5)).toBe(5);
    expect(averageRating(3, 4, 3)).toBe(3);
  });
});

describe('replaceClock', () => {
  it('меняет время, сохраняя дату отметки', () => {
    const base = new Date(2026, 10, 5, 9, 12).toISOString();
    const result = replaceClock(base, '08:30');
    expect(result && new Date(result).getHours()).toBe(8);
    expect(result && new Date(result).getMinutes()).toBe(30);
    expect(result && new Date(result).getDate()).toBe(5);
  });

  it('смена через полночь: выход остаётся на своей (следующей) дате', () => {
    const out = new Date(2026, 10, 6, 0, 30).toISOString();
    const result = replaceClock(out, '01:15');
    expect(result && new Date(result).getDate()).toBe(6);
  });

  it.each(['24:00', '9:60', 'abc', ''])('отклоняет %p', (clock) => {
    expect(replaceClock(new Date().toISOString(), clock)).toBeNull();
  });

  it('clockOf показывает ЧЧ:ММ', () => {
    expect(clockOf(new Date(2026, 0, 1, 7, 5).toISOString())).toBe('07:05');
  });
});
