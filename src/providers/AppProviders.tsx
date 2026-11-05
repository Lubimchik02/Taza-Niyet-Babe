import { QueryClientProvider } from '@tanstack/react-query';
import { useEffect, type PropsWithChildren } from 'react';
import { I18nextProvider } from 'react-i18next';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { useSettings } from '@/features/settings/settings-store';
import i18n, { systemLanguage } from '@/i18n';
import { queryClient } from '@/lib/query-client';
import { AppThemeProvider } from '@/theme/ThemeProvider';

/** Синхронизирует язык i18next с выбором пользователя (или системой). */
function LanguageSync() {
  const language = useSettings((s) => s.language);
  useEffect(() => {
    const target = language ?? systemLanguage();
    if (i18n.language !== target) void i18n.changeLanguage(target);
  }, [language]);
  return null;
}

export function AppProviders({ children }: PropsWithChildren) {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <I18nextProvider i18n={i18n}>
          <LanguageSync />
          <AppThemeProvider>{children}</AppThemeProvider>
        </I18nextProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
