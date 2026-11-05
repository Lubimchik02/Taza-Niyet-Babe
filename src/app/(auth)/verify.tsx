import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { requestOtp, verifyOtp } from '@/features/auth/api';
import { OtpFormView } from '@/features/auth/components/OtpFormView';
import { parseContact } from '@/features/auth/schemas';

export default function VerifyScreen() {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ contact?: string }>();
  // Параметры маршрута — пользовательский ввод: проверяем заново.
  const contact = typeof params.contact === 'string' ? parseContact(params.contact) : null;

  if (!contact) return <Redirect href="/sign-in" />;

  return (
    <Screen scroll>
      <View style={{ gap: 8, marginTop: 32 }}>
        <AppText variant="title">{t('auth.verifyTitle')}</AppText>
        <AppText tone="muted">{t('auth.verifySubtitle', { contact: contact.value })}</AppText>
      </View>
      {/* После успешной проверки onAuthStateChange обновит сессию, и guard переведёт в (app). */}
      <OtpFormView
        onVerify={(code) => verifyOtp(contact, code)}
        onResend={() => requestOtp(contact)}
      />
      <Button variant="secondary" title={t('auth.changeContact')} onPress={() => router.back()} />
    </Screen>
  );
}
