/**
 * Размеры и типографика.
 * Координатор работает на улице, часто в перчатках, поэтому цели касания крупные:
 * минимум 48 dp (рекомендация платформ), основные кнопки — 56 dp.
 */

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  pill: 999,
} as const;

export const touchTarget = {
  min: 48,
  large: 56,
} as const;

export const typography = {
  display: { fontSize: 34, lineHeight: 40, fontWeight: '800' },
  title: { fontSize: 26, lineHeight: 32, fontWeight: '700' },
  heading: { fontSize: 20, lineHeight: 26, fontWeight: '700' },
  body: { fontSize: 17, lineHeight: 24, fontWeight: '400' },
  bodyStrong: { fontSize: 17, lineHeight: 24, fontWeight: '600' },
  caption: { fontSize: 14, lineHeight: 20, fontWeight: '400' },
  button: { fontSize: 18, lineHeight: 24, fontWeight: '700' },
} as const;

export type TypographyVariant = keyof typeof typography;
