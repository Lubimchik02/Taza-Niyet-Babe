/**
 * Формула баллов (задание, раздел «Баллы»). Единственный источник значений в клиенте;
 * на этапе 6 те же значения переедут в серверный конфиг, а этот файл будет сверяться с ним тестом.
 *
 *   баллы = базовые_баллы_сложности × подтверждённые_часы × множитель_оценки
 */
import type { QuestDifficulty } from '@/lib/db';

export const POINTS_PER_HOUR: Record<QuestDifficulty, number> = {
  easy: 10,
  medium: 20,
  hard: 35,
  extreme: 50,
};

/**
 * Множитель оценки в процентах (0.6 … 1.3). Целые числа, потому что 1.15 в двоичной
 * плавающей точке — это 1.1499999…, и 34.5 баллов округлилось бы до 34 вместо 35.
 */
export const RATING_MULTIPLIER_PCT: Record<1 | 2 | 3 | 4 | 5, number> = {
  1: 60,
  2: 80,
  3: 100,
  4: 115,
  5: 130,
};

export type Rating = keyof typeof RATING_MULTIPLIER_PCT;

/** Округление до целого, половина — вверх (как round() в Postgres для numeric). */
export function questPoints(difficulty: QuestDifficulty, minutes: number, rating: Rating): number {
  // Числитель — целое число: деление выполняется один раз, без накопления ошибки.
  const numerator = POINTS_PER_HOUR[difficulty] * minutes * RATING_MULTIPLIER_PCT[rating];
  return Math.floor((numerator * 2 + 6000) / 12000);
}

/** Диапазон награды за квест для карточки: от оценки 3★ до максимальной 5★. */
export function questRewardRange(difficulty: QuestDifficulty, minutes: number) {
  return { base: questPoints(difficulty, minutes, 3), max: questPoints(difficulty, minutes, 5) };
}
