import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ConfirmButton } from '@/components/ui/ConfirmButton';
import { toDbError } from '@/lib/db-errors';
import { useTheme } from '@/theme/ThemeProvider';

import type { QuestDetails } from '../api';
import { useCancelSignUp, useSignUp } from '../queries';

/** Момент, после которого запись уже нельзя отменить. */
export function cancelDeadline(
  quest: Pick<QuestDetails, 'starts_at' | 'cancel_deadline_hours'>,
): Date {
  return new Date(new Date(quest.starts_at).getTime() - quest.cancel_deadline_hours * 3600_000);
}

/** Запись на квест в зависимости от состояния: принять, очередь, отмена. */
export function SignupPanel({ quest, now = new Date() }: { quest: QuestDetails; now?: Date }) {
  const { t, i18n } = useTranslation();
  const { spacing } = useTheme();
  const signUp = useSignUp();
  const cancel = useCancelSignUp();
  const [error, setError] = useState<string | null>(null);

  const run = async (action: () => Promise<unknown>) => {
    setError(null);
    try {
      await action();
    } catch (e) {
      setError(t(`errors.${toDbError(e).code}`));
    }
  };

  const open = quest.status === 'published' && new Date(quest.starts_at) > now;
  const full = quest.taken >= quest.capacity;
  const deadline = cancelDeadline(quest);
  const canCancel = now < deadline;
  const deadlineText = deadline.toLocaleString(i18n.language, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  let content;
  if (quest.my_status === 'signed_up') {
    content = (
      <>
        <AppText variant="heading" tone="primary">
          ✓ {t('quests.signedUp')}
        </AppText>
        {open && canCancel ? (
          <>
            <AppText tone="muted">{t('quests.cancelUntil', { date: deadlineText })}</AppText>
            <ConfirmButton
              variant="secondary"
              title={t('quests.cancel')}
              confirmTitle={t('quests.confirmCancel')}
              loading={cancel.isPending}
              onConfirm={() => void run(() => cancel.mutateAsync(quest.id))}
            />
          </>
        ) : open ? (
          <AppText tone="muted">{t('quests.cancelClosed')}</AppText>
        ) : null}
      </>
    );
  } else if (quest.my_status === 'waitlisted') {
    content = (
      <>
        <AppText variant="heading" tone="primary">
          {t('quests.waitlisted', { position: quest.my_waitlist_position ?? '—' })}
        </AppText>
        <AppText tone="muted">{t('quests.waitlistHint')}</AppText>
        <ConfirmButton
          variant="secondary"
          title={t('quests.leaveWaitlist')}
          confirmTitle={t('quests.confirmCancel')}
          loading={cancel.isPending}
          onConfirm={() => void run(() => cancel.mutateAsync(quest.id))}
        />
      </>
    );
  } else if (open) {
    content = (
      <>
        {full ? <AppText tone="muted">{t('quests.waitlistHint')}</AppText> : null}
        <Button
          title={full ? t('quests.joinWaitlist') : t('quests.accept')}
          loading={signUp.isPending}
          onPress={() => void run(() => signUp.mutateAsync(quest.id))}
        />
        <AppText variant="caption" tone="muted">
          {t('quests.cancelUntil', { date: deadlineText })}
        </AppText>
      </>
    );
  } else {
    content = <AppText tone="muted">{t('quests.closed')}</AppText>;
  }

  return (
    <Card>
      <View style={{ gap: spacing.md }}>{content}</View>
      {error ? (
        <AppText tone="danger" accessibilityRole="alert">
          {error}
        </AppText>
      ) : null}
    </Card>
  );
}
