import { renderHook } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { I18nextProvider } from 'react-i18next';

import i18n from '@/i18n';

import { useFormatDuration } from '../use-format-duration';

const wrapper = ({ children }: { children: ReactNode }) => (
  <I18nextProvider i18n={i18n}>{children}</I18nextProvider>
);

describe('useFormatDuration', () => {
  beforeAll(() => i18n.changeLanguage('ru'));

  it.each([
    [0, '0 мин'],
    [45, '45 мин'],
    [60, '1 ч'],
    [420, '7 ч'],
    [90, '1 ч 30 мин'],
    [-5, '0 мин'],
  ])('%d → %s', async (minutes, expected) => {
    const { result } = await renderHook(() => useFormatDuration(), { wrapper });
    expect(result.current(minutes)).toBe(expected);
  });
});
