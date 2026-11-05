import { router, Stack } from 'expo-router';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import { usePendingInvite } from '@/features/organizations/pending-invite-store';
import { useTheme } from '@/theme/ThemeProvider';

export default function AppStackLayout() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const pendingCode = usePendingInvite((s) => s.code);
  const clearPending = usePendingInvite((s) => s.setCode);

  // Приглашение, открытое до входа, продолжаем сразу после входа.
  useEffect(() => {
    if (!pendingCode) return;
    clearPending(null);
    router.push({ pathname: '/join/[code]', params: { code: pendingCode } });
  }, [pendingCode, clearPending]);

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.primary,
        headerTitleStyle: { color: colors.text },
        contentStyle: { backgroundColor: colors.background },
        headerBackTitle: t('common.back'),
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="organizations/index" options={{ title: t('organizations.title') }} />
      <Stack.Screen name="organizations/new" options={{ title: t('organizations.form.title') }} />
      <Stack.Screen
        name="organizations/search"
        options={{ title: t('organizations.search.title') }}
      />
      <Stack.Screen name="organizations/[orgId]/index" options={{ title: '' }} />
      <Stack.Screen
        name="organizations/[orgId]/invite/[inviteId]"
        options={{ title: t('organizations.invite.title') }}
      />
      <Stack.Screen name="scan" options={{ title: t('organizations.scan.title') }} />
    </Stack>
  );
}
