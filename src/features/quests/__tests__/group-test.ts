import { groupMyQuests } from '../group';

const now = new Date('2026-11-05T12:00:00Z');
const q = (id: string, starts: string, ends: string, status = 'published') => ({
  id,
  status,
  starts_at: starts,
  ends_at: ends,
});

describe('groupMyQuests', () => {
  it('раскладывает по группам и сортирует', () => {
    const groups = groupMyQuests(
      [
        q('later', '2026-11-20T04:00:00Z', '2026-11-20T07:00:00Z'),
        q('soon', '2026-11-06T04:00:00Z', '2026-11-06T07:00:00Z'),
        q('now', '2026-11-05T10:00:00Z', '2026-11-05T14:00:00Z', 'in_progress'),
        q('old', '2026-10-01T04:00:00Z', '2026-10-01T07:00:00Z', 'completed'),
        q('older', '2026-09-01T04:00:00Z', '2026-09-01T07:00:00Z', 'completed'),
      ],
      now,
    );
    expect(groups.active.map((x) => x.id)).toEqual(['now']);
    expect(groups.upcoming.map((x) => x.id)).toEqual(['soon', 'later']);
    expect(groups.past.map((x) => x.id)).toEqual(['old', 'older']);
  });

  it('завершённый досрочно квест — в прошедших, даже если плановое окончание впереди', () => {
    const groups = groupMyQuests(
      [q('done', '2026-11-05T10:00:00Z', '2026-11-05T14:00:00Z', 'completed')],
      now,
    );
    expect(groups.past).toHaveLength(1);
  });
});
