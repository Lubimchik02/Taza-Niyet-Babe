import { questPoints, questRewardRange } from '@/features/points/config';

import { questFormSchema, splitItems, toQuestPayload, type QuestFormValues } from '../schemas';

const valid: QuestFormValues = {
  title: 'Уборка у реки',
  description: '',
  difficulty: 'medium',
  address: 'Набережная Есентай',
  lat: '43,2187',
  lng: '76.9286',
  date: '08.11.2026',
  time: '09:00',
  durationHours: '3,5',
  capacity: '12',
  cancelDeadlineHours: '12',
  radiusM: '300',
  coordinatorContact: '',
  bringItems: 'Вода, Перчатки\nГоловной убор',
  providedItems: '',
  skillIds: [],
};

describe('questFormSchema', () => {
  it('принимает корректную форму (десятичная запятая допустима)', () => {
    expect(questFormSchema.safeParse(valid).success).toBe(true);
  });

  it.each([
    [{ title: 'аб' }, 'titleLength'],
    [{ lat: '91' }, 'coordinates'],
    [{ lng: 'abc' }, 'coordinates'],
    [{ capacity: '0' }, 'capacity'],
    [{ capacity: '2.5' }, 'capacity'],
    [{ durationHours: '25' }, 'duration'],
    [{ date: '31.02.2026' }, 'dateTime'],
    [{ radiusM: '10' }, 'radius'],
  ])('%p → %s', (patch, message) => {
    const result = questFormSchema.safeParse({ ...valid, ...patch });
    expect(result.success).toBe(false);
    expect(result.error?.issues.map((i) => i.message)).toContain(message);
  });
});

describe('toQuestPayload', () => {
  it('переводит местное время организации в UTC и считает окончание', () => {
    const payload = toQuestPayload(valid, 'Asia/Almaty', 'published');
    expect(payload.starts_at).toBe('2026-11-08T04:00:00.000Z');
    expect(payload.ends_at).toBe('2026-11-08T07:30:00.000Z');
    expect(payload.lat).toBeCloseTo(43.2187);
    expect(payload.capacity).toBe(12);
    expect(payload.bring_items).toEqual(['Вода', 'Перчатки', 'Головной убор']);
    expect(payload.status).toBe('published');
  });
});

describe('splitItems', () => {
  it('убирает пустые и ограничивает 20 пунктами', () => {
    expect(splitItems(' , a,,b \n\n c ')).toEqual(['a', 'b', 'c']);
    expect(splitItems(Array.from({ length: 30 }, (_, i) => `x${i}`).join(','))).toHaveLength(20);
  });
});

describe('баллы (формула задания)', () => {
  it.each([
    ['easy', 180, 4, 35], // 10 × 3 × 1.15 = 34.5 → 35
    ['easy', 135, 3, 23], // 10 × 2.25 × 1.0 = 22.5 → 23
    ['hard', 240, 5, 182], // 35 × 4 × 1.3
    ['extreme', 60, 1, 30], // 50 × 1 × 0.6
    ['medium', 90, 2, 24], // 20 × 1.5 × 0.8
  ] as const)('%s, %d мин, %d★ → %d', (difficulty, minutes, rating, expected) => {
    expect(questPoints(difficulty, minutes, rating)).toBe(expected);
  });

  it('ровно половина балла округляется вверх при любой оценке и длительности', () => {
    // 10 × 3 ч × 1.15 = 34.5; 20 × 0.75 ч × 1.3 = 19.5; 35 × 0.25 ч × 0.6 = 5.25
    expect(questPoints('easy', 180, 4)).toBe(35);
    expect(questPoints('medium', 45, 5)).toBe(20);
    expect(questPoints('hard', 15, 1)).toBe(5);
  });

  it('совпадает с округлением Postgres на всей сетке значений', () => {
    for (const difficulty of ['easy', 'medium', 'hard', 'extreme'] as const) {
      for (let minutes = 0; minutes <= 720; minutes += 15) {
        for (const rating of [1, 2, 3, 4, 5] as const) {
          const pct = { 1: 60, 2: 80, 3: 100, 4: 115, 5: 130 }[rating];
          const base = { easy: 10, medium: 20, hard: 35, extreme: 50 }[difficulty];
          // Точная арифметика: сотые доли балла как целое число.
          const hundredths = (base * minutes * pct) / 60;
          const expected = Math.floor((hundredths + 50) / 100);
          expect(questPoints(difficulty, minutes, rating)).toBe(expected);
        }
      }
    }
  });

  it('награда в карточке — от 3★ до 5★', () => {
    expect(questRewardRange('medium', 180)).toEqual({ base: 60, max: 78 });
  });
});
