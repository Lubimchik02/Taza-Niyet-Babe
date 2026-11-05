import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useWindowDimensions, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

import { AppText } from '@/components/ui/AppText';
import { Card } from '@/components/ui/Card';

import { batchMinutesLeft, buildCheckinUrl, pickCurrentToken } from '../qr';
import { useShiftQrBatch } from '../queries';

/**
 * Динамический QR: меняется каждые 30 секунд. Токены берутся из пачки на час вперёд,
 * поэтому код продолжает работать, если у координатора пропала сеть.
 */
export function ShiftQr({ questId, title }: { questId: string; title: string }) {
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const batch = useShiftQrBatch(questId, true);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const tokens = batch.data ?? [];
  const current = pickCurrentToken(tokens, now);
  const secondsLeft = current
    ? Math.max(0, Math.ceil((new Date(current.valid_until).getTime() - now.getTime()) / 1000))
    : 0;
  const size = Math.min(width - 96, 340);

  return (
    <Card style={{ alignItems: 'center' }}>
      {current ? (
        <>
          {/* Чёрный на белом при любой теме — так камеры читают код надёжнее. */}
          <View
            accessible
            role="img"
            aria-label={t('attendance.qrLabel', { title })}
            style={{ padding: 16, backgroundColor: '#FFFFFF', borderRadius: 16 }}
          >
            <QRCode
              value={buildCheckinUrl(current.token)}
              size={size}
              color="#000000"
              backgroundColor="#FFFFFF"
              ecl="M"
            />
          </View>
          <AppText variant="bodyStrong" accessibilityLiveRegion="none">
            {t('attendance.qrRefreshIn', { seconds: secondsLeft })}
          </AppText>
        </>
      ) : (
        <AppText tone="danger" accessibilityRole="alert">
          {batch.isLoading ? t('common.loading') : t('attendance.qrUnavailable')}
        </AppText>
      )}
      <AppText tone="muted" align="center">
        {t('attendance.qrHint')}
      </AppText>
      {batch.isError && current ? (
        <AppText tone="muted" align="center">
          {t('attendance.qrOffline', { minutes: Math.floor(batchMinutesLeft(tokens, now)) })}
        </AppText>
      ) : null}
    </Card>
  );
}
