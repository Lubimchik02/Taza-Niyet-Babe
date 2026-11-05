import { difficultyColors, palettes } from '../colors';
import { contrastRatio } from '../contrast';

/** WCAG AA: 4.5 для обычного текста, 3 для крупного текста и элементов интерфейса. */
const AA_TEXT = 4.5;
const AA_UI = 3;

describe('contrastRatio', () => {
  it('чёрный на белом = 21', () => {
    expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 5);
  });
  it('симметричен', () => {
    expect(contrastRatio('#1B7A47', '#FFFFFF')).toBeCloseTo(contrastRatio('#FFFFFF', '#1B7A47'));
  });
  it('падает на некорректном цвете', () => {
    expect(() => contrastRatio('red', '#FFFFFF')).toThrow();
  });
});

describe.each(Object.entries(palettes))('палитра %s', (_scheme, c) => {
  it.each([
    ['text / background', c.text, c.background],
    ['text / surface', c.text, c.surface],
    ['textMuted / background', c.textMuted, c.background],
    ['textMuted / surface', c.textMuted, c.surface],
    ['onPrimary / primary', c.onPrimary, c.primary],
    ['onAccent / accent', c.onAccent, c.accent],
    ['onReward / reward', c.onReward, c.reward],
    ['onDanger / danger', c.onDanger, c.danger],
    ['primary / surface', c.primary, c.surface],
    ['primary / primaryMuted', c.primary, c.primaryMuted],
    ['danger / background', c.danger, c.background],
  ])('%s ≥ AA для текста', (_pair, fg, bg) => {
    expect(contrastRatio(fg, bg)).toBeGreaterThanOrEqual(AA_TEXT);
  });

  it('рамка поля ввода в фокусе различима', () => {
    expect(contrastRatio(c.focus, c.surface)).toBeGreaterThanOrEqual(AA_UI);
  });
});

describe('цвета сложности', () => {
  it.each(Object.entries(difficultyColors))('%s: подпись читается', (_d, { bg, fg }) => {
    expect(contrastRatio(fg, bg)).toBeGreaterThanOrEqual(AA_TEXT);
  });
});
