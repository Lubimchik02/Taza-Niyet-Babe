import { kvStorage } from '@/lib/storage';

import { useSettings } from '../settings-store';

describe('useSettings', () => {
  it('гидратирован сразу после создания (синхронное хранилище)', () => {
    expect(useSettings.persist.hasHydrated()).toBe(true);
  });

  it('сохраняет только настройки, без функций', () => {
    useSettings.getState().setTheme('dark');
    useSettings.getState().setLanguage('kk');
    useSettings.getState().completeOnboarding();

    const raw = kvStorage.getItem('taza-niyet/settings');
    expect(raw).not.toBeNull();
    expect(JSON.parse(raw ?? '{}')).toEqual({
      state: { language: 'kk', theme: 'dark', onboardingDone: true },
      version: 1,
    });
  });

  it('восстанавливает сохранённое состояние', async () => {
    kvStorage.setItem(
      'taza-niyet/settings',
      JSON.stringify({
        state: { language: 'en', theme: 'light', onboardingDone: true },
        version: 1,
      }),
    );
    await useSettings.persist.rehydrate();
    expect(useSettings.getState()).toMatchObject({ language: 'en', theme: 'light' });
  });
});
