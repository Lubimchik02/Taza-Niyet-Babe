import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Screen } from '@/components/ui/Screen';
import { requestOtp } from '@/features/auth/api';
import { SignInFormView } from '@/features/auth/components/SignInFormView';
import { isSupabaseConfigured } from '@/lib/supabase';

export default function SignInScreen() {
  const { t } = useTranslation();

  return (
    <Screen scroll>
      <View style={{ gap: 8, marginTop: 32 }}>
        <AppText variant="display" tone="primary">
          {t('common.appName')}
        </AppText>
        <AppText tone="muted">{t('common.tagline')}</AppText>
      </View>
      <View style={{ gap: 8, marginTop: 24 }}>
        <AppText variant="title">{t('auth.signInTitle')}</AppText>
        <AppText tone="muted">{t('auth.signInSubtitle')}</AppText>
      </View>
      {!isSupabaseConfigured ? (
        <AppText tone="danger" accessibilityRole="alert">
          {t('auth.errors.notConfigured')}
        </AppText>
      ) : null}
      <SignInFormView
        onSubmit={async (contact) => {
          await requestOtp(contact);
          router.push({ pathname: '/verify', params: { contact: contact.value } });
        }}
      />
    </Screen>
  );
}
