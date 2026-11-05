import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import { toDbError } from '@/lib/db-errors';
import { useTheme } from '@/theme/ThemeProvider';

import { useMyDispute, useOpenDispute } from '../queries';

/** Волонтёр не согласен с подтверждёнными часами — открывает спор и видит решение. */
export function DisputeSection({ confirmationId }: { confirmationId: string }) {
  const { t } = useTranslation();
  const { spacing } = useTheme();
  const dispute = useMyDispute(confirmationId);
  const open = useOpenDispute();
  const [editing, setEditing] = useState(false);
  const [comment, setComment] = useState('');
  const [error, setError] = useState<string | null>(null);
  const d = dispute.data;

  const submit = async () => {
    setError(null);
    try {
      await open.mutateAsync({ confirmationId, comment });
      setEditing(false);
      setComment('');
    } catch (e) {
      setError(t(`errors.${toDbError(e).code}`));
    }
  };

  // Форма — JSX-значение, а не вложенный компонент: иначе поле ввода пересоздаётся
  // при каждом символе и теряет фокус.
  const form = (
    <View style={{ gap: spacing.sm }}>
      <TextField
        label={t('disputes.commentLabel')}
        value={comment}
        onChangeText={setComment}
        multiline
        maxLength={2000}
        error={error ?? undefined}
      />
      <Button title={t('disputes.send')} loading={open.isPending} onPress={() => void submit()} />
      <Button variant="ghost" title={t('common.cancel')} onPress={() => setEditing(false)} />
    </View>
  );

  if (d) {
    const tone = d.status === 'resolved' ? 'primary' : d.status === 'rejected' ? 'danger' : 'muted';
    return (
      <View style={{ gap: spacing.xs }}>
        <AppText variant="bodyStrong" tone={tone}>
          {d.status === 'open'
            ? t('disputes.statusOpen')
            : d.status === 'resolved'
              ? t('disputes.statusResolved')
              : t('disputes.statusRejected')}
        </AppText>
        {d.resolution ? (
          <AppText tone="muted">{t('disputes.resolution', { text: d.resolution })}</AppText>
        ) : null}
        {d.status !== 'open' ? (
          <Button variant="ghost" title={t('disputes.open')} onPress={() => setEditing(true)} />
        ) : null}
        {editing ? form : null}
      </View>
    );
  }

  return editing ? (
    form
  ) : (
    <Button variant="ghost" title={t('disputes.title')} onPress={() => setEditing(true)} />
  );
}
