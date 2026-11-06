import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { QueryState } from '@/components/ui/QueryState';
import { Screen } from '@/components/ui/Screen';
import {
  useCertifiableOrgs,
  useIssueCertificate,
  useMyCertificates,
} from '@/features/certificates/queries';
import { toDbError } from '@/lib/db-errors';
import { useFormatDuration } from '@/lib/use-format-duration';

export default function CertificatesScreen() {
  const { t, i18n } = useTranslation();
  const duration = useFormatDuration();
  const mine = useMyCertificates();
  const orgs = useCertifiableOrgs();
  const issue = useIssueCertificate();
  const [error, setError] = useState<string | null>(null);

  const issueFor = async (orgId: string) => {
    setError(null);
    try {
      const certificate = await issue.mutateAsync(orgId);
      router.push({ pathname: '/certificates/[id]', params: { id: certificate.id } });
    } catch (e) {
      setError(t(`errors.${toDbError(e).code}`));
    }
  };

  return (
    <Screen scroll edges={['bottom']}>
      {orgs.data?.length ? (
        <Card>
          <AppText tone="muted">{t('certificates.issueHint')}</AppText>
          {orgs.data.map((org) => (
            <Button
              key={org.id}
              title={t('certificates.issueFor', { org: org.name })}
              loading={issue.isPending && issue.variables === org.id}
              onPress={() => void issueFor(org.id)}
            />
          ))}
        </Card>
      ) : null}
      {error ? (
        <AppText tone="danger" accessibilityRole="alert">
          {error}
        </AppText>
      ) : null}

      <QueryState
        isLoading={mine.isLoading}
        error={mine.error}
        onRetry={() => void mine.refetch()}
      />
      {mine.data?.length === 0 ? (
        <EmptyState
          icon="ribbon-outline"
          title={t('certificates.empty')}
          body={orgs.data?.length ? undefined : t('certificates.emptyHint')}
        />
      ) : null}
      {mine.data?.map((c) => (
        <Pressable
          key={c.id}
          role="button"
          aria-label={`${c.orgName}, ${duration(c.totalMinutes)}`}
          onPress={() => router.push({ pathname: '/certificates/[id]', params: { id: c.id } })}
        >
          <Card>
            <AppText variant="heading">{c.orgName}</AppText>
            <AppText>{duration(c.totalMinutes)}</AppText>
            <AppText tone={c.revokedAt ? 'danger' : 'muted'}>
              {c.revokedAt
                ? t('certificates.revokedBadge')
                : t('certificates.issuedAt', {
                    date: new Date(c.issuedAt).toLocaleDateString(i18n.language),
                  })}
            </AppText>
          </Card>
        </Pressable>
      ))}
    </Screen>
  );
}
