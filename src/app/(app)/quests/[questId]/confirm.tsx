import { Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { QueryState } from '@/components/ui/QueryState';
import { RatingStars } from '@/components/ui/RatingStars';
import { Screen } from '@/components/ui/Screen';
import type { ConfirmItem } from '@/features/attendance/api';
import {
  ConfirmRow,
  initialDraft,
  type ConfirmDraft,
} from '@/features/attendance/components/ConfirmRow';
import { applyDraftPatch } from '@/features/attendance/drafts';
import { useConfirmHours, useShiftSummary } from '@/features/attendance/queries';
import { ContributionForm } from '@/features/benefit/components/ContributionForm';
import { useQuestContribution } from '@/features/benefit/queries';
import { toDbError } from '@/lib/db-errors';
import { useTheme } from '@/theme/ThemeProvider';
import { useFormatDuration } from '@/lib/use-format-duration';

/** Подтверждение часов: таблица пришедших, правки с причиной, оценки 1–5 и комментарий. */
export default function ConfirmHoursScreen() {
  const { t } = useTranslation();
  const { spacing } = useTheme();
  const { questId } = useLocalSearchParams<{ questId: string }>();
  const summary = useShiftSummary(questId);
  const contribution = useQuestContribution(questId);
  const confirm = useConfirmHours();
  const [drafts, setDrafts] = useState<Record<string, ConfirmDraft>>({});
  const [showErrors, setShowErrors] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const attended = (summary.data ?? []).filter((r) => r.sessions.length > 0);
  const pending = attended.filter((r) => !r.confirmation);
  const confirmed = attended.filter((r) => r.confirmation);
  const draftFor = (userId: string) => {
    const row = attended.find((r) => r.user_id === userId);
    return drafts[userId] ?? (row ? initialDraft(row) : null);
  };
  const duration = useFormatDuration();

  const submit = async () => {
    setError(null);
    const items: ConfirmItem[] = [];
    for (const row of pending) {
      const d = draftFor(row.user_id);
      if (!d) continue;
      const changed = d.minutes !== row.rounded_minutes;
      if (changed && d.reason.trim().length < 3) {
        setShowErrors(true);
        setError(t('errors.reason_required'));
        return;
      }
      items.push({
        user_id: row.user_id,
        minutes: d.minutes,
        ...(changed ? { reason: d.reason.trim() } : {}),
        rating_quality: d.quality,
        rating_activity: d.activity,
        rating_teamwork: d.teamwork,
        comment: d.comment.trim(),
      });
    }
    try {
      await confirm.mutateAsync({ questId, items });
      setDone(true);
    } catch (e) {
      setError(t(`errors.${toDbError(e).code}`));
    }
  };

  return (
    <Screen scroll edges={['bottom']}>
      <Stack.Screen options={{ title: t('attendance.confirmTitle') }} />
      <QueryState
        isLoading={summary.isLoading}
        error={summary.error}
        onRetry={() => void summary.refetch()}
      />
      {summary.data && attended.length === 0 ? (
        <AppText tone="muted">{t('attendance.noAttendees')}</AppText>
      ) : null}
      {done ? (
        <AppText variant="heading" tone="primary" accessibilityRole="alert">
          ✓ {t('attendance.confirmedAll')}
        </AppText>
      ) : null}

      {contribution.data ? (
        <ContributionForm
          questId={questId}
          bags={contribution.data.bags_collected}
          area={contribution.data.area_m2}
        />
      ) : null}

      {pending.map((row) => {
        const draft = draftFor(row.user_id);
        return draft ? (
          <ConfirmRow
            key={row.user_id}
            row={row}
            draft={draft}
            showErrors={showErrors}
            onPatch={(patch) =>
              setDrafts((all) => applyDraftPatch(all, row.user_id, initialDraft(row), patch))
            }
          />
        ) : null;
      })}

      {error ? (
        <AppText tone="danger" accessibilityRole="alert">
          {error}
        </AppText>
      ) : null}
      {pending.length > 0 ? (
        <Button
          title={t('attendance.confirmAll', { count: pending.length })}
          loading={confirm.isPending}
          onPress={() => void submit()}
        />
      ) : null}

      {confirmed.map((row) =>
        row.confirmation ? (
          <Card key={row.user_id}>
            <View style={{ gap: spacing.xs }}>
              <AppText variant="bodyStrong">
                ✓ {row.full_name || '—'} · {t('attendance.alreadyConfirmed')}
              </AppText>
              <AppText>{duration(row.confirmation.confirmed_minutes)}</AppText>
              <RatingStars
                label={t('attendance.ratings.quality')}
                value={row.confirmation.rating_quality}
              />
              <RatingStars
                label={t('attendance.ratings.activity')}
                value={row.confirmation.rating_activity}
              />
              <RatingStars
                label={t('attendance.ratings.teamwork')}
                value={row.confirmation.rating_teamwork}
              />
            </View>
          </Card>
        ) : null,
      )}
    </Screen>
  );
}
