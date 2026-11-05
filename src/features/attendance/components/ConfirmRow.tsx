import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { RatingStars } from '@/components/ui/RatingStars';
import { TextField } from '@/components/ui/TextField';
import { toDbError } from '@/lib/db-errors';
import { useTheme } from '@/theme/ThemeProvider';

import type { SessionInfo, ShiftRow } from '../api';
import type { DraftPatch } from '../drafts';
import { clockOf, MINUTE_STEP, replaceClock, stepMinutes } from '../minutes';
import { useAdjustSession } from '../queries';
import { useFormatDuration } from '@/lib/use-format-duration';

export interface ConfirmDraft {
  minutes: number;
  reason: string;
  quality: number;
  activity: number;
  teamwork: number;
  comment: string;
}

export function initialDraft(row: ShiftRow): ConfirmDraft {
  return {
    minutes: row.rounded_minutes,
    reason: '',
    quality: 4,
    activity: 4,
    teamwork: 4,
    comment: '',
  };
}

interface ConfirmRowProps {
  row: ShiftRow;
  draft: ConfirmDraft;
  /** Только изменённые поля: родитель сливает их с актуальным черновиком (без устаревших замыканий). */
  onPatch: (patch: DraftPatch) => void;
  showErrors: boolean;
}

export function ConfirmRow({ row, draft, onPatch, showErrors }: ConfirmRowProps) {
  const { t } = useTranslation();
  const { colors, spacing } = useTheme();
  const changed = draft.minutes !== row.rounded_minutes;
  const duration = useFormatDuration();

  return (
    <Card
      style={row.needs_confirmation ? { borderColor: colors.reward, borderWidth: 2 } : undefined}
    >
      <AppText variant="heading">{row.full_name || '—'}</AppText>
      {row.needs_confirmation ? (
        <AppText tone="danger">{t('attendance.needsConfirmation')}</AppText>
      ) : null}

      {row.sessions.map((s) => (
        <SessionLine key={s.id} session={s} />
      ))}
      <AppText>{t('attendance.computed', { time: duration(row.rounded_minutes) })}</AppText>

      <View style={{ gap: spacing.sm }}>
        <AppText variant="bodyStrong">{t('attendance.minutesLabel')}</AppText>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <View style={{ flex: 1 }}>
            <Button
              variant="secondary"
              title={t('attendance.removeMinutes')}
              onPress={() => onPatch((d) => ({ minutes: stepMinutes(d.minutes, -MINUTE_STEP) }))}
            />
          </View>
          <AppText
            variant="heading"
            style={{ minWidth: 96, textAlign: 'center' }}
            accessibilityLiveRegion="polite"
          >
            {duration(draft.minutes)}
          </AppText>
          <View style={{ flex: 1 }}>
            <Button
              variant="secondary"
              title={t('attendance.addMinutes')}
              onPress={() => onPatch((d) => ({ minutes: stepMinutes(d.minutes, MINUTE_STEP) }))}
            />
          </View>
        </View>
        {changed ? (
          <TextField
            label={t('attendance.reasonLabel')}
            value={draft.reason}
            onChangeText={(reason) => onPatch({ reason })}
            error={
              showErrors && draft.reason.trim().length < 3 ? t('errors.reason_required') : undefined
            }
          />
        ) : null}
      </View>

      <RatingStars
        label={t('attendance.ratings.quality')}
        value={draft.quality}
        onChange={(quality) => onPatch({ quality })}
      />
      <RatingStars
        label={t('attendance.ratings.activity')}
        value={draft.activity}
        onChange={(activity) => onPatch({ activity })}
      />
      <RatingStars
        label={t('attendance.ratings.teamwork')}
        value={draft.teamwork}
        onChange={(teamwork) => onPatch({ teamwork })}
      />
      <TextField
        label={t('attendance.commentLabel')}
        value={draft.comment}
        onChangeText={(comment) => onPatch({ comment })}
        maxLength={1000}
        multiline
      />
    </Card>
  );
}

/** Отметка с возможностью поправить время входа/выхода (с причиной). */
function SessionLine({ session }: { session: SessionInfo }) {
  const { t } = useTranslation();
  const { spacing } = useTheme();
  const adjust = useAdjustSession();
  const [editing, setEditing] = useState(false);
  const [inTime, setInTime] = useState(clockOf(session.check_in_at));
  const [outTime, setOutTime] = useState(session.check_out_at ? clockOf(session.check_out_at) : '');
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  const flags = [
    t(`attendance.methods.${session.check_in_method}`),
    ...(session.check_out_method && session.check_out_method !== session.check_in_method
      ? [t(`attendance.methods.${session.check_out_method}`)]
      : []),
    ...(session.offline ? [t('attendance.offline')] : []),
  ];

  const save = async () => {
    setError(null);
    const checkInAt = replaceClock(session.check_in_at, inTime);
    const checkOutAt = replaceClock(session.check_out_at ?? session.check_in_at, outTime);
    if (!checkInAt || !checkOutAt) {
      setError(t('errors.invalid_time'));
      return;
    }
    try {
      await adjust.mutateAsync({ sessionId: session.id, checkInAt, checkOutAt, reason });
      setEditing(false);
      setReason('');
    } catch (e) {
      setError(t(`errors.${toDbError(e).code}`));
    }
  };

  return (
    <View style={{ gap: spacing.sm }}>
      <AppText tone="muted">
        {t('attendance.interval', {
          from: clockOf(session.check_in_at),
          to: session.check_out_at ? clockOf(session.check_out_at) : t('attendance.onSite'),
        })}
        {' · '}
        {flags.join(' · ')}
      </AppText>
      {editing ? (
        <View style={{ gap: spacing.sm }}>
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <View style={{ flex: 1 }}>
              <TextField
                label={t('attendance.timeIn')}
                value={inTime}
                onChangeText={setInTime}
                inputMode="numeric"
              />
            </View>
            <View style={{ flex: 1 }}>
              <TextField
                label={t('attendance.timeOut')}
                value={outTime}
                onChangeText={setOutTime}
                inputMode="numeric"
              />
            </View>
          </View>
          <TextField label={t('attendance.reasonLabel')} value={reason} onChangeText={setReason} />
          {error ? (
            <AppText tone="danger" accessibilityRole="alert">
              {error}
            </AppText>
          ) : null}
          <Button
            title={t('attendance.saveTime')}
            loading={adjust.isPending}
            onPress={() => void save()}
          />
          <Button variant="ghost" title={t('common.cancel')} onPress={() => setEditing(false)} />
        </View>
      ) : (
        <Button variant="ghost" title={t('attendance.editTime')} onPress={() => setEditing(true)} />
      )}
    </View>
  );
}
