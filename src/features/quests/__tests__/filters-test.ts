import { applyFeedFilters, DEFAULT_FILTERS, periodEnd } from '../filters';

const now = new Date(2026, 10, 5, 12, 0); // 5 ноября, полдень по местному времени
const at = (days: number) => new Date(2026, 10, 5 + days, 10, 0).toISOString();
const home = { lat: 43.2389, lng: 76.8897 };

const quests = [
  { id: 'today-easy-near', difficulty: 'easy' as const, starts_at: at(0), lat: 43.24, lng: 76.89 },
  { id: 'week-hard-mid', difficulty: 'hard' as const, starts_at: at(5), lat: 43.2, lng: 76.95 },
  {
    id: 'month-extreme-far',
    difficulty: 'extreme' as const,
    starts_at: at(20),
    lat: 43.05,
    lng: 76.98,
  },
  { id: 'later-medium', difficulty: 'medium' as const, starts_at: at(45), lat: 43.24, lng: 76.9 },
];
const ids = (list: { id: string }[]) => list.map((q) => q.id);

describe('applyFeedFilters', () => {
  it('без фильтров — всё, с расстоянием, если известно местоположение', () => {
    const result = applyFeedFilters(quests, DEFAULT_FILTERS, home, now);
    expect(result).toHaveLength(4);
    expect(result[0]?.distanceM).toBeLessThan(500);
  });

  it('по сложности', () => {
    expect(
      ids(
        applyFeedFilters(
          quests,
          { ...DEFAULT_FILTERS, difficulties: ['hard', 'extreme'] },
          null,
          now,
        ),
      ),
    ).toEqual(['week-hard-mid', 'month-extreme-far']);
  });

  it('по периоду', () => {
    expect(
      ids(applyFeedFilters(quests, { ...DEFAULT_FILTERS, period: 'today' }, null, now)),
    ).toEqual(['today-easy-near']);
    expect(
      ids(applyFeedFilters(quests, { ...DEFAULT_FILTERS, period: 'week' }, null, now)),
    ).toHaveLength(2);
    expect(
      ids(applyFeedFilters(quests, { ...DEFAULT_FILTERS, period: 'month' }, null, now)),
    ).toHaveLength(3);
  });

  it('по расстоянию', () => {
    expect(
      ids(applyFeedFilters(quests, { ...DEFAULT_FILTERS, maxDistanceKm: 1 }, home, now)),
    ).toEqual(['today-easy-near', 'later-medium']);
  });

  it('без местоположения фильтр расстояния не прячет квесты', () => {
    expect(
      applyFeedFilters(quests, { ...DEFAULT_FILTERS, maxDistanceKm: 1 }, null, now),
    ).toHaveLength(4);
  });
});

describe('periodEnd', () => {
  it('«сегодня» — до конца дня', () => {
    expect(periodEnd('today', now)?.getHours()).toBe(23);
    expect(periodEnd('all', now)).toBeNull();
  });
});
