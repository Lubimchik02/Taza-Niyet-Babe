import { useSyncExternalStore } from 'react';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { Language } from '@/i18n/languages';
import { kvStorage } from '@/lib/storage';

export type ThemePreference = 'system' | 'light' | 'dark';

interface SettingsState {
  /** null — язык берётся из системы. */
  language: Language | null;
  theme: ThemePreference;
  onboardingDone: boolean;
  setLanguage: (language: Language | null) => void;
  setTheme: (theme: ThemePreference) => void;
  completeOnboarding: () => void;
}

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      language: null,
      theme: 'system',
      onboardingDone: false,
      setLanguage: (language) => set({ language }),
      setTheme: (theme) => set({ theme }),
      completeOnboarding: () => set({ onboardingDone: true }),
    }),
    {
      name: 'taza-niyet/settings',
      version: 1,
      storage: createJSONStorage(() => kvStorage),
      partialize: ({ language, theme, onboardingDone }) => ({ language, theme, onboardingDone }),
    },
  ),
);

/**
 * true, когда сохранённые настройки прочитаны с диска.
 * Хранилище синхронное, поэтому обычно это уже true к первому рендеру;
 * подписка нужна на случай асинхронного хранилища.
 */
export function useSettingsHydrated(): boolean {
  return useSyncExternalStore(
    (onChange) => useSettings.persist.onFinishHydration(onChange),
    () => useSettings.persist.hasHydrated(),
  );
}
