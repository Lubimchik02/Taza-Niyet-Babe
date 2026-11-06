import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Linking } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

import { usePushState } from '../push-store';
import { syncPushRegistration } from '../registration';

/** Состояние пушей на этом устройстве и действие, которое его исправит. */
export function PushStatusCard({ hideWhenGranted = false }: { hideWhenGranted?: boolean }) {
  const { t } = useTranslation();
  const status = usePushState((s) => s.status);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  if (hideWhenGranted && status === 'granted') return null;

  const enable = async () => {
    setBusy(true);
    setFailed(false);
    try {
      await syncPushRegistration({ ask: true, channelName: t('notifications.channelName') });
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <AppText aria-live="polite">{t(`notifications.status.${status}`)}</AppText>
      {status === 'undetermined' ? (
        <Button title={t('notifications.enable')} loading={busy} onPress={() => void enable()} />
      ) : null}
      {status === 'denied' ? (
        <Button
          variant="secondary"
          title={t('notifications.openSystemSettings')}
          onPress={() => void Linking.openSettings()}
        />
      ) : null}
      {failed ? (
        <AppText tone="danger" accessibilityRole="alert">
          {t('errors.invalid_push_token')}
        </AppText>
      ) : null}
    </Card>
  );
}
