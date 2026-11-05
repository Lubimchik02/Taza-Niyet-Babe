import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Linking, Share } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { QueryState } from '@/components/ui/QueryState';
import { Screen } from '@/components/ui/Screen';
import { CertificateView } from '@/features/certificates/components/CertificateView';
import { exportCertificatePdf } from '@/features/certificates/pdf';
import { useCertificate, useCertificateLabels } from '@/features/certificates/queries';
import { buildCertificateHtml } from '@/features/certificates/template';
import { qrSvg, verifyUrl } from '@/features/certificates/verify-url';

export default function CertificateScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const certificate = useCertificate(id);
  const { labels, lang, locale } = useCertificateLabels();
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const data = certificate.data;
  const url = verifyUrl(id);

  const exportPdf = async () => {
    if (!data) return;
    setError(null);
    setExporting(true);
    try {
      const html = buildCertificateHtml({
        data,
        labels,
        qrSvg: await qrSvg(url),
        verifyUrl: url,
        locale,
        lang,
      });
      await exportCertificatePdf(html, `${labels.title} — ${data.full_name}`);
    } catch {
      setError(t('errors.generic'));
    } finally {
      setExporting(false);
    }
  };

  if (!data) {
    return (
      <Screen edges={['bottom']}>
        <QueryState
          isLoading={certificate.isLoading}
          error={certificate.error ?? (certificate.isSuccess ? new Error('not_allowed') : null)}
          onRetry={() => void certificate.refetch()}
        />
      </Screen>
    );
  }

  return (
    <Screen scroll edges={['bottom']}>
      <CertificateView data={data} />
      <Button
        title={t('certificates.sharePdf')}
        loading={exporting}
        onPress={() => void exportPdf()}
      />
      <Button
        variant="secondary"
        title={t('certificates.shareLink')}
        onPress={() => void Share.share({ message: t('certificates.shareMessage', { url }) })}
      />
      <Button
        variant="ghost"
        title={t('certificates.openVerify')}
        onPress={() => void Linking.openURL(url)}
      />
      {error ? (
        <AppText tone="danger" accessibilityRole="alert">
          {error}
        </AppText>
      ) : null}
    </Screen>
  );
}
