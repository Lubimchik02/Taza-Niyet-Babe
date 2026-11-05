import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { startSessionListener, useSession } from '@/features/auth/session-store';
import { useSettings, useSettingsHydrated } from '@/features/settings/settings-store';
import { AppProviders } from '@/providers/AppProviders';
import { useTheme } from '@/theme/ThemeProvider';

function RootNavigator() {
  const { colors, scheme } = useTheme();
  const session = useSession((s) => s.session);
  const sessionReady = useSession((s) => s.initialized);
  const settingsReady = useSettingsHydrated();
  const onboardingDone = useSettings((s) => s.onboardingDone);

  useEffect(() => startSessionListener(), []);

  if (!sessionReady || !settingsReady) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.background,
        }}
      >
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const signedIn = session !== null;
  // Куда вести пользователя в текущем состоянии. Явный redirectTo обязателен:
  // по умолчанию роутер уводит на имя группы (/(auth)), а это несуществующий URL.
  const home = signedIn ? '/' : onboardingDone ? '/sign-in' : '/onboarding';

  // Защита маршрутов на клиенте — только UX. Доступ к данным проверяет сервер (RLS).
  return (
    <>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Protected guard={signedIn} redirectTo={home}>
          <Stack.Screen name="(app)" />
        </Stack.Protected>
        <Stack.Protected guard={!signedIn && !onboardingDone} redirectTo={home}>
          <Stack.Screen name="onboarding" />
        </Stack.Protected>
        <Stack.Protected guard={!signedIn && onboardingDone} redirectTo={home}>
          <Stack.Screen name="(auth)" />
        </Stack.Protected>
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <AppProviders>
      <RootNavigator />
    </AppProviders>
  );
}
