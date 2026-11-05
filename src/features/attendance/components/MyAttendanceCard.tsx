import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { RatingStars } from '@/components/ui/RatingStars';
import { useTheme } from '@/theme/ThemeProvider';

import { splitMinutes } from '../minutes';
import { useMyAttendance } from '../queries';
import { usePendingAttendanceCount } from '../queue';

interface MyAttendanceCardProps {
  questId: string;
  questStatus: string;
  signedUp: boolean;
}

/** Прозрачность для волонтёра: отметки, рассчитанные и подтверждённые часы, оценка, все правки. */
export function MyAttendanceCard({ questId, questStatus, signedUp }: MyAttendanceCardProps) {
  const { t, i18n } = useTranslation();
  const { spacing } = useTheme();
  const shiftOn = questStatus === 'in_progress';
  const mine = useMyAttendance(questId, signedUp && (shiftOn || questStatus === 'completed'));
  const pending = usePendingAttendanceCount();
  const data = mine.data;

  if (!signedUp || (!shiftOn && !data?.sessions.length)) return null;

  const clock = (iso: string) =>
    new Date(iso).toLocaleTimeString(i18n.language, { hour: '2-digit', minute: '2-digit' });
  const duration = (minutes: number) => {
    const { hours, minutes: m } = splitMinutes(minutes);
    return hours > 0
      ? t('attendance.hoursMinutes', { hours, minutes: m })
      : t('attendance.minutesOnly', { minutes: m });
  };
  const active = data?.sessions.some((s) => s.check_out_at === null) ?? false;
  const valueText = (field: string, value: string | null) =>
    value === null ? '—' : field === 'confirmed_minutes' ? duration(Number(value)) : clock(value);

  return (
    <Card>
      <AppText variant="heading">{t('attendance.myAttendance')}</AppText>

      {shiftOn ? (
        <Button
          title={active ? t('attendance.scanOut') : t('attendance.scanIn')}
          variant={active ? 'secondary' : 'primary'}
          onPress={() =>
            router.push({ pathname: '/scan', params: { mode: active ? 'out' : 'in' } })
          }
        />
      ) : null}
      {pending > 0 ? (
        <AppText tone="muted">{t('attendance.pendingSync', { count: pending })}</AppText>
      ) : null}

      {data?.sessions.length ? (
        <View style={{ gap: spacing.xs }}>
          <AppText variant="bodyStrong">{t('attendance.sessions')}</AppText>
          {data.sessions.map((s) => (
            <AppText key={s.id} tone="muted">
              {t('attendance.interval', {
                from: clock(s.check_in_at),
                to: s.check_out_at ? clock(s.check_out_at) : t('attendance.onSite'),
              })}
              {' · '}
              {t(`attendance.methods.${s.check_in_method}`)}
              {s.offline ? ` · ${t('attendance.offline')}` : ''}
            </AppText>
          ))}
          <AppText>{t('attendance.computed', { time: duration(data.roundedMinutes) })}</AppText>
        </View>
      ) : null}

      {data?.confirmation ? (
        <View style={{ gap: spacing.sm }}>
          <AppText variant="heading" tone="primary">
            ✓ {t('attendance.confirmed', { time: duration(data.confirmation.confirmed_minutes) })}
          </AppText>
          {data.confirmation.confirmed_by_name ? (
            <AppText tone="muted">
              {t('attendance.confirmedBy', { name: data.confirmation.confirmed_by_name })}
            </AppText>
          ) : null}
          <RatingStars
            label={t('attendance.ratings.quality')}
            value={data.confirmation.rating_quality}
          />
          <RatingStars
            label={t('attendance.ratings.activity')}
            value={data.confirmation.rating_activity}
          />
          <RatingStars
            label={t('attendance.ratings.teamwork')}
            value={data.confirmation.rating_teamwork}
          />
          {data.confirmation.comment ? (
            <AppText>
              {t('attendance.comment')}: «{data.confirmation.comment}»
            </AppText>
          ) : null}
        </View>
      ) : data?.sessions.length && !shiftOn ? (
        <AppText tone="muted">{t('attendance.awaitingConfirmation')}</AppText>
      ) : null}

      {data?.adjustments.length ? (
        <View style={{ gap: spacing.xs }}>
          <AppText variant="bodyStrong">{t('attendance.adjustments')}</AppText>
          {data.adjustments.map((a) => (
            <AppText key={`${a.field}-${a.created_at}`} tone="muted">
              {t('attendance.adjustmentLine', {
                field: t(`attendance.fields.${a.field}`),
                from: valueText(a.field, a.old_value),
                to: valueText(a.field, a.new_value),
                reason: a.reason,
              })}
            </AppText>
          ))}
        </View>
      ) : null}
    </Card>
  );
}
