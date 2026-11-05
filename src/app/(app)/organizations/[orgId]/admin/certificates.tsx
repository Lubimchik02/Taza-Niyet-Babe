import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ConfirmButton } from '@/components/ui/ConfirmButton';
import { QueryState } from '@/components/ui/QueryState';
import { Screen } from '@/components/ui/Screen';
import { useOrgCertificates, useRevokeCertificate } from '@/features/admin/queries';
import { useFormatDuration } from '@/lib/use-format-duration';
import { useTheme } from '@/theme/ThemeProvider';

/** Сертификаты организации: открыть страницу проверки или отозвать (например, по итогам спора). */
export default function OrgCertificatesScreen() {
  const { t, i18n } = useTranslation();
  const { spacing } = useTheme();
  const duration = useFormatDuration();
  const { orgId } = useLocalSearchParams<{ orgId: string }>();
  const list = useOrgCertificates(orgId);
  const revoke = useRevokeCertificate(orgId);
  const date = (iso: string) => new Date(iso).toLocaleDateString(i18n.language);

  return (
    <Screen scroll edges={['bottom']}>
      <QueryState
        isLoading={list.isLoading}
        error={list.error}
        onRetry={() => void list.refetch()}
      />
      {list.data?.length === 0 ? <AppText tone="muted">{t('admin.noCertificates')}</AppText> : null}
      {list.data?.map((c) => (
        <Card key={c.id}>
          <AppText variant="heading">{c.full_name}</AppText>
          <AppText>
            {duration(c.total_minutes)} · {t('certificates.issuedAt', { date: date(c.issued_at) })}
          </AppText>
          {c.revoked_at ? (
            <AppText tone="danger">{t('admin.revokedAt', { date: date(c.revoked_at) })}</AppText>
          ) : null}
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <View style={{ flex: 1 }}>
              <Button
                variant="secondary"
                title={t('certificates.openVerify')}
                onPress={() => router.push({ pathname: '/verify/[id]', params: { id: c.id } })}
              />
            </View>
            {!c.revoked_at ? (
              <View style={{ flex: 1 }}>
                <ConfirmButton
                  variant="danger"
                  title={t('admin.revoke')}
                  confirmTitle={t('admin.confirmRevoke')}
                  loading={revoke.isPending && revoke.variables === c.id}
                  onConfirm={() => revoke.mutate(c.id)}
                />
              </View>
            ) : null}
          </View>
        </Card>
      ))}
    </Screen>
  );
}
