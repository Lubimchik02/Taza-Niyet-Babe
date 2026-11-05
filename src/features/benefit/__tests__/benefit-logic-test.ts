import { periodStart } from '../api';
import { parseCount } from '../components/ContributionForm';
import { isPerkUnlocked, LEVELS, levelProgress } from '../levels';
import { axisPoint, radarPolygon, toSvgPoints } from '../radar';

jest.mock('@/lib/supabase', () => ({ supabase: {} }));

describe('уровни', () => {
  it('порядок и пороги как в задании и в БД', () => {
    expect(LEVELS.map((l) => [l.code, l.minPoints])).toEqual([
      ['newcomer', 0],
      ['helper', 100],
      ['activist', 300],
      ['leader', 700],
      ['ambassador', 1500],
    ]);
  });

  it.each([
    [0, 'newcomer', 'helper', 0, 100],
    [50, 'newcomer', 'helper', 0.5, 50],
    [100, 'helper', 'activist', 0, 200],
    [372, 'activist', 'leader', 0.18, 328],
    [1499, 'leader', 'ambassador', 0.99875, 1],
  ] as const)('%d баллов → %s, дальше %s', (points, current, next, progress, toNext) => {
    const p = levelProgress(points);
    expect(p.current).toBe(current);
    expect(p.next).toBe(next);
    expect(p.progress).toBeCloseTo(progress, 4);
    expect(p.pointsToNext).toBe(toNext);
  });

  it('максимальный уровень — прогресс заполнен', () => {
    expect(levelProgress(5000)).toEqual({
      current: 'ambassador',
      next: null,
      progress: 1,
      pointsToNext: 0,
    });
  });

  it('отрицательные баллы (после компенсации) не ломают расчёт', () => {
    expect(levelProgress(-20).current).toBe('newcomer');
  });

  it('бонусы открываются на своём уровне и выше', () => {
    expect(isPerkUnlocked('activist', 'helper')).toBe(true);
    expect(isPerkUnlocked('activist', 'activist')).toBe(true);
    expect(isPerkUnlocked('activist', 'leader')).toBe(false);
  });
});

describe('радар навыков', () => {
  const c = { x: 100, y: 100 };

  it('первая ось смотрит вверх, оси равномерны', () => {
    expect(axisPoint(0, 4, 50, c)).toEqual({ x: 100, y: 50 });
    const right = axisPoint(1, 4, 50, c);
    expect(right.x).toBeCloseTo(150);
    expect(right.y).toBeCloseTo(100);
  });

  it('масштаб по максимуму, но не меньше 100 XP', () => {
    const small = radarPolygon([10, 0, 0], 50, c);
    expect(small[0]?.y).toBeCloseTo(95); // 10 из 100 → 5 пикселей от центра
    const big = radarPolygon([200, 100, 0], 50, c);
    expect(big[0]?.y).toBeCloseTo(50); // максимум — на краю
  });

  it('строка точек для SVG', () => {
    expect(
      toSvgPoints([
        { x: 1, y: 2.345 },
        { x: 3, y: 4 },
      ]),
    ).toBe('1.0,2.3 3.0,4.0');
  });
});

describe('periodStart', () => {
  // Четверг, 5 ноября 2026, 15:30 по местному времени.
  const now = new Date(2026, 10, 5, 15, 30);

  it('неделя — с понедельника, полночь', () => {
    const start = periodStart('week', now);
    expect([start?.getDate(), start?.getDay(), start?.getHours()]).toEqual([2, 1, 0]);
  });

  it('воскресенье относится к неделе, начавшейся в понедельник', () => {
    expect(periodStart('week', new Date(2026, 10, 8, 10, 0))?.getDate()).toBe(2);
  });

  it('месяц и год', () => {
    expect(periodStart('month', now)?.getDate()).toBe(1);
    const year = periodStart('year', now);
    expect([year?.getMonth(), year?.getDate()]).toEqual([0, 1]);
  });

  it('всё время — без начала', () => {
    expect(periodStart('all', now)).toBeNull();
  });
});

describe('parseCount (вклад команды)', () => {
  it.each([
    ['', null],
    ['  ', null],
    ['0', 0],
    ['24', 24],
  ])('%p → %p', (input, expected) => {
    expect(parseCount(input)).toBe(expected);
  });

  it.each(['-1', '2.5', 'abc'])('%p — ошибка', (input) => {
    expect(parseCount(input)).toBeNaN();
  });
});
