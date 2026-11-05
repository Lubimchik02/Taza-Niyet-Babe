/**
 * Палитра Taza Niyet: свежесть и чистота.
 * Основной — зелёный, акценты — бирюзовый и солнечно-жёлтый (награды).
 * Пары текст/фон проверяются на контраст WCAG AA в тестах (src/theme/__tests__).
 */

export type ColorScheme = 'light' | 'dark';

export interface ThemeColors {
  background: string;
  surface: string;
  surfaceMuted: string;
  border: string;
  text: string;
  textMuted: string;
  primary: string;
  onPrimary: string;
  primaryMuted: string;
  accent: string;
  onAccent: string;
  reward: string;
  onReward: string;
  danger: string;
  onDanger: string;
  success: string;
  focus: string;
}

/** Цвета сложности квеста — одинаковые в обеих темах, текст поверх — белый/тёмный. */
export const difficultyColors = {
  easy: { bg: '#23824A', fg: '#FFFFFF' },
  medium: { bg: '#0F7F8C', fg: '#FFFFFF' },
  hard: { bg: '#B4540A', fg: '#FFFFFF' },
  extreme: { bg: '#B3261E', fg: '#FFFFFF' },
} as const;

export type Difficulty = keyof typeof difficultyColors;

export const lightColors: ThemeColors = {
  background: '#F4FAF6',
  surface: '#FFFFFF',
  surfaceMuted: '#E6F2EA',
  border: '#C9DDD0',
  text: '#11261A',
  textMuted: '#4A6153',
  primary: '#1B7A47',
  onPrimary: '#FFFFFF',
  primaryMuted: '#E2F3E8',
  accent: '#0E7C86',
  onAccent: '#FFFFFF',
  reward: '#F5B700',
  onReward: '#2B2100',
  danger: '#B3261E',
  onDanger: '#FFFFFF',
  success: '#1B7A47',
  focus: '#0E7C86',
};

export const darkColors: ThemeColors = {
  background: '#0D1712',
  surface: '#15231B',
  surfaceMuted: '#1D3026',
  border: '#2F4A3B',
  text: '#E8F3EC',
  textMuted: '#A5BDAE',
  primary: '#5CCB8A',
  onPrimary: '#05210F',
  primaryMuted: '#1F3D2B',
  accent: '#4FD1DB',
  onAccent: '#032326',
  reward: '#FFCB3D',
  onReward: '#2B2100',
  danger: '#FF8A80',
  onDanger: '#3A0400',
  success: '#5CCB8A',
  focus: '#4FD1DB',
};

export const palettes: Record<ColorScheme, ThemeColors> = {
  light: lightColors,
  dark: darkColors,
};
