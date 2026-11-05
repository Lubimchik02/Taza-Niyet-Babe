import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { toDbError } from '@/lib/db-errors';
import { useNow } from '@/lib/use-now';

import { useStartShift } from '../queries';

interface ShiftActionsProps {
  questId: string;
  status: string;
  startsAt: string;
}

/** Действия координатора в карточке квеста: начать смену, открыть её, подтвердить часы. */
export function ShiftActions({ questId, status, startsAt }: ShiftActionsProps) {
  const { t } = useTranslation();
  const start = useStartShift();
  const [error, setError] = useState<string | null>(null);
  const openShift = () => router.push({ pathname: '/quests/[questId]/shift', params: { questId } });
  // Начать можно за час до старта — раньше кнопку не показываем.
  const now = useNow();
  const canStart =
    status === 'published' && now.getTime() >= new Date(startsAt).getTime() - 3600_000;

  if (!canStart && status !== 'in_progress' && status !== 'completed') return null;

  return (
    <Card>
      <AppText variant="heading">{t('attendance.shiftTitle')}</AppText>
      {canStart ? (
        <Button
          title={t('attendance.startShift')}
          loading={start.isPending}
          onPress={() =>
            void start
              .mutateAsync(questId)
              .then(openShift)
              .catch((e: unknown) => setError(t(`errors.${toDbError(e).code}`)))
          }
        />
      ) : null}
      {status === 'in_progress' ? (
        <Button title={t('attendance.openShift')} onPress={openShift} />
      ) : null}
      {status === 'completed' ? (
        <Button
          title={t('attendance.confirmHours')}
          onPress={() =>
            router.push({ pathname: '/quests/[questId]/confirm', params: { questId } })
          }
        />
      ) : null}
      {error ? (
        <AppText tone="danger" accessibilityRole="alert">
          {error}
        </AppText>
      ) : null}
    </Card>
  );
}
