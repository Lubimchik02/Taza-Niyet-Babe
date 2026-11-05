import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ConfirmButton } from '@/components/ui/ConfirmButton';
import { QueryState } from '@/components/ui/QueryState';
import { Screen } from '@/components/ui/Screen';
import type { ShiftRow } from '@/features/attendance/api';
import { ShiftQr } from '@/features/attendance/components/ShiftQr';
import { useFinishShift, useLiveShift, useShiftSummary } from '@/features/attendance/queries';
import { submitAttendance, usePendingAttendanceCount } from '@/features/attendance/queue';
import { useQuest } from '@/features/quests/queries';
import { toDbError } from '@/lib/db-errors';
import { useTheme } from '@/theme/ThemeProvider';

/** Экран смены координатора: QR, кто на месте (в реальном времени), ручные отметки, завершение. */
export default function ShiftScreen() {
  const { t, i18n } = useTranslation();
  const { questId } = useLocalSearchParams<{ questId: string }>();
  const quest = useQuest(questId);
  const live = quest.data?.status === 'in_progress';
  const summary = useShiftSummary(questId, quest.data?.can_manage ?? false);
  useLiveShift(questId, live);
  const finish = useFinishShift();
  const pending = usePendingAttendanceCount();
  const [error, setError] = useState<string | null>(null);

  const rows = summary.data ?? [];
  const present = rows.filter((r) => r.present);
  const left = rows.filter((r) => !r.present && r.sessions.length > 0);
  const notArrived = rows.filter((r) => r.sessions.length === 0);
  const clock = (iso: string) =>
    new Date(iso).toLocaleTimeString(i18n.language, { hour: '2-digit', minute: '2-digit' });

  const manual = async (kind: 'manual_check_in' | 'manual_check_out', userId: string) => {
    setError(null);
    const result = await submitAttendance(kind, { questId, userId });
    if (result.status === 'rejected') setError(t(`errors.${result.code}`));
    void summary.refetch();
  };

  if (!quest.data) {
    return (
      <Screen edges={['bottom']}>
        <QueryState
          isLoading={quest.isLoading}
          error={quest.error}
          onRetry={() => void quest.refetch()}
        />
      </Screen>
    );
  }

  return (
    <Screen scroll edges={['bottom']}>
      <Stack.Screen options={{ title: t('attendance.shiftTitle') }} />
      <AppText variant="title">{quest.data.title}</AppText>

      {live ? <ShiftQr questId={questId} title={quest.data.title} /> : null}
      {pending > 0 ? (
        <AppText tone="muted">{t('attendance.pendingSync', { count: pending })}</AppText>
      ) : null}
      {error ? (
        <AppText tone="danger" accessibilityRole="alert">
          {error}
        </AppText>
      ) : null}

      <QueryState
        isLoading={summary.isLoading}
        error={summary.error}
        onRetry={() => void summary.refetch()}
      />

      <Group title={`${t('attendance.present')} · ${present.length}`}>
        {present.map((r) => (
          <Person
            key={r.user_id}
            row={r}
            subtitle={t('attendance.since', { time: clock(r.sessions.at(-1)?.check_in_at ?? '') })}
            action={
              live
                ? {
                    title: t('attendance.markLeft'),
                    onPress: () => void manual('manual_check_out', r.user_id),
                  }
                : null
            }
          />
        ))}
      </Group>
      <Group title={`${t('attendance.notArrived')} · ${notArrived.length}`}>
        {notArrived.map((r) => (
          <Person
            key={r.user_id}
            row={r}
            subtitle=""
            action={
              live
                ? {
                    title: t('attendance.markArrived'),
                    onPress: () => void manual('manual_check_in', r.user_id),
                  }
                : null
            }
          />
        ))}
      </Group>
      <Group title={`${t('attendance.left')} · ${left.length}`}>
        {left.map((r) => (
          <Person
            key={r.user_id}
            row={r}
            subtitle={r.sessions
              .map((s) =>
                t('attendance.interval', {
                  from: clock(s.check_in_at),
                  to: s.check_out_at ? clock(s.check_out_at) : '…',
                }),
              )
              .join(', ')}
            action={
              live
                ? {
                    title: t('attendance.markArrived'),
                    onPress: () => void manual('manual_check_in', r.user_id),
                  }
                : null
            }
          />
        ))}
      </Group>

      {live ? (
        <ConfirmButton
          variant="danger"
          title={t('attendance.finish')}
          confirmTitle={t('attendance.confirmFinish')}
          loading={finish.isPending}
          onConfirm={() =>
            void finish
              .mutateAsync(questId)
              .then(() =>
                router.replace({ pathname: '/quests/[questId]/confirm', params: { questId } }),
              )
              .catch((e: unknown) => setError(t(`errors.${toDbError(e).code}`)))
          }
        />
      ) : quest.data.status === 'completed' ? (
        <Button
          title={t('attendance.confirmHours')}
          onPress={() =>
            router.replace({ pathname: '/quests/[questId]/confirm', params: { questId } })
          }
        />
      ) : null}
    </Screen>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  const { spacing } = useTheme();
  return (
    <Card>
      <AppText variant="heading">{title}</AppText>
      <View style={{ gap: spacing.md }}>{children}</View>
    </Card>
  );
}

function Person({
  row,
  subtitle,
  action,
}: {
  row: ShiftRow;
  subtitle: string;
  action: { title: string; onPress: () => void } | null;
}) {
  const { t } = useTranslation();
  const { spacing } = useTheme();
  const flags = [
    ...row.methods.filter((m) => m !== 'qr').map((m) => t(`attendance.methods.${m as 'manual'}`)),
    ...(row.offline ? [t('attendance.offline')] : []),
  ];
  return (
    <View style={{ gap: spacing.xs }}>
      <AppText variant="bodyStrong">{row.full_name || '—'}</AppText>
      {subtitle || flags.length ? (
        <AppText tone="muted">{[subtitle, ...flags].filter(Boolean).join(' · ')}</AppText>
      ) : null}
      {action ? <Button variant="secondary" title={action.title} onPress={action.onPress} /> : null}
    </View>
  );
}
