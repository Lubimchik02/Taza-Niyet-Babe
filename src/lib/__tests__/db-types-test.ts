import { difficultyColors, type Difficulty } from '@/theme/colors';

import type { QuestDifficulty } from '../db';

// Проверка на уровне типов: перечисление сложности в БД и цвета сложности в теме совпадают.
// Если в БД добавят новую сложность, без цвета для неё TypeScript упадёт здесь.
type Same<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;
const difficultiesMatch: Same<QuestDifficulty, Difficulty> = true;

describe('типы БД', () => {
  it('у каждой сложности из БД есть цвет', () => {
    const fromDb: QuestDifficulty[] = ['easy', 'medium', 'hard', 'extreme'];
    expect(difficultiesMatch).toBe(true);
    expect(Object.keys(difficultyColors).sort()).toEqual([...fromDb].sort());
  });
});
