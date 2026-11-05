import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Card } from '@/components/ui/Card';
import { QueryState } from '@/components/ui/QueryState';
import { Screen } from '@/components/ui/Screen';
import { CertificateView } from '@/features/certificates/components/CertificateView';
import { useCertificate } from '@/features/certificates/queries';
import { useTheme } from '@/theme/ThemeProvider';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Публичная страница проверки verify/{id}: открывается без входа (вуз, работодатель).
 * Данные — из БД через verify_certificate; поддельный PDF здесь не подтвердится.
 */
export default function VerifyScreen() {
  const { t } = useTranslation();
  const { colors, spacing } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const valid = typeof id === 'string' && UUID.test(id);
  const certificate = useCertificate(valid ? id : '', valid);
  const notFound = !valid || (certificate.isSuccess && !certificate.data);

  return (
    <Screen scroll>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
        <Ionicons name="leaf" size={28} color={colors.primary} />
        <AppText variant="heading" tone="primary">
          Taza Niyet
        </AppText>
      </View>
      <AppText variant="title">{t('certificates.verify.title')}</AppText>

      {valid ? (
        <QueryState
          isLoading={certificate.isLoading}
          error={certificate.error}
          onRetry={() => void certificate.refetch()}
        />
      ) : null}

      {notFound ? (
        <Card style={{ borderColor: colors.danger, borderWidth: 2 }}>
          <View style={{ flexDirection: 'row', gap: spacing.md, alignItems: 'center' }}>
            <Ionicons name="alert-circle" size={44} color={colors.danger} />
            <View style={{ flex: 1 }}>
              <AppText variant="heading" tone="danger" accessibilityRole="header">
                {t('certificates.verify.notFound')}
              </AppText>
              <AppText tone="muted">{t('certificates.verify.notFoundHint')}</AppText>
            </View>
          </View>
        </Card>
      ) : null}

      {certificate.data ? <CertificateView data={certificate.data} /> : null}

      <AppText variant="caption" tone="muted" align="center">
        {t('certificates.verify.about')}
      </AppText>
    </Screen>
  );
}
