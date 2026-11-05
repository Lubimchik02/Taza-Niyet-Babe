import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { QueryState } from '@/components/ui/QueryState';
import { Screen } from '@/components/ui/Screen';
import { TextField } from '@/components/ui/TextField';
import type { DisputeItem } from '@/features/admin/api';
import { useDisputes, useResolveDispute } from '@/features/admin/queries';
import { MINUTE_STEP, stepMinutes } from '@/features/attendance/minutes';
import { toDbError } from '@/lib/db-errors';
import { useFormatDuration } from '@/lib/use-format-duration';
import { useTheme } from '@/theme/ThemeProvider';

export default function DisputesScreen() {
  const { t } = useTranslation();
  const { orgId } = useLocalSearchParams<{ orgId: string }>();
  const disputes = useDisputes(orgId);

  return (
    <Screen scroll edges={['bottom']}>
      <QueryState
        isLoading={disputes.isLoading}
        error={disputes.error}
        onRetry={() => void disputes.refetch()}
      />
      {disputes.data?.length === 0 ? <AppText tone="muted">{t('admin.noDisputes')}</AppText> : null}
      {disputes.data?.map((d) => (
        <DisputeCard key={d.id} dispute={d} />
      ))}
    </Screen>
  );
}

function DisputeCard({ dispute }: { dispute: DisputeItem }) {
  const { t, i18n } = useTranslation();
  const { colors, spacing } = useTheme();
  const duration = useFormatDuration();
  const resolve = useResolveDispute();
  const [resolution, setResolution] = useState('');
  const [minutes, setMinutes] = useState(dispute.confirmed_minutes);
  const [error, setError] = useState<string | null>(null);
  const open = dispute.status === 'open';

  const decide = async (status: 'resolved' | 'rejected') => {
    setError(null);
    try {
      await resolve.mutateAsync({
        disputeId: dispute.id,
        status,
        resolution,
        minutes: status === 'resolved' && minutes !== dispute.confirmed_minutes ? minutes : null,
      });
    } catch (e) {
      setError(t(`errors.${toDbError(e).code}`));
    }
  };

  return (
    <Card style={open ? { borderColor: colors.reward, borderWidth: 2 } : undefined}>
      <AppText variant="heading">
        {t('admin.disputeFrom', { name: dispute.full_name || '—' })}
      </AppText>
      <AppText>{t('admin.quest', { title: dispute.quest_title })}</AppText>
      <AppText tone="muted">
        {new Date(dispute.quest_starts_at).toLocaleDateString(i18n.language)} ·{' '}
        {t('admin.confirmed', { time: duration(dispute.confirmed_minutes) })}
        {dispute.confirmed_by_name
          ? ` · ${t('admin.confirmedBy', { name: dispute.confirmed_by_name })}`
          : ''}
      </AppText>
      <AppText>{t('admin.volunteerSays', { comment: dispute.comment })}</AppText>

      {open ? (
        <View style={{ gap: spacing.md }}>
          <TextField
            label={t('admin.resolutionLabel')}
            value={resolution}
            onChangeText={setResolution}
            multiline
          />
          <View style={{ gap: spacing.sm }}>
            <AppText variant="bodyStrong">{t('admin.newMinutes')}</AppText>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
              <View style={{ flex: 1 }}>
                <Button
                  variant="secondary"
                  title={t('attendance.removeMinutes')}
                  onPress={() => setMinutes((m) => stepMinutes(m, -MINUTE_STEP))}
                />
              </View>
              <AppText
                variant="heading"
                style={{ minWidth: 96, textAlign: 'center' }}
                accessibilityLiveRegion="polite"
              >
                {duration(minutes)}
              </AppText>
              <View style={{ flex: 1 }}>
                <Button
                  variant="secondary"
                  title={t('attendance.addMinutes')}
                  onPress={() => setMinutes((m) => stepMinutes(m, MINUTE_STEP))}
                />
              </View>
            </View>
          </View>
          {error ? (
            <AppText tone="danger" accessibilityRole="alert">
              {error}
            </AppText>
          ) : null}
          <Button
            title={t('admin.resolveFor')}
            loading={resolve.isPending}
            onPress={() => void decide('resolved')}
          />
          <Button
            variant="secondary"
            title={t('admin.reject')}
            disabled={resolve.isPending}
            onPress={() => void decide('rejected')}
          />
        </View>
      ) : (
        <View style={{ gap: spacing.xs }}>
          <AppText variant="bodyStrong" tone={dispute.status === 'resolved' ? 'primary' : 'danger'}>
            {dispute.status === 'resolved' ? t('admin.resolved') : t('admin.rejected')}
          </AppText>
          {dispute.resolution ? (
            <AppText tone="muted">
              {t('admin.resolutionText', { text: dispute.resolution })}
            </AppText>
          ) : null}
          {dispute.resolved_by_name ? (
            <AppText tone="muted">
              {t('admin.resolvedBy', { name: dispute.resolved_by_name })}
            </AppText>
          ) : null}
        </View>
      )}
    </Card>
  );
}
