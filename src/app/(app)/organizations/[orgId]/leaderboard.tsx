import { Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Card } from '@/components/ui/Card';
import { ChoiceGroup } from '@/components/ui/ChoiceGroup';
import { QueryState } from '@/components/ui/QueryState';
import { Screen } from '@/components/ui/Screen';
import type { LeaderboardPeriod } from '@/features/benefit/api';
import { useBenefit, useLeaderboard } from '@/features/benefit/queries';
import { useMyOrganizations } from '@/features/organizations/queries';
import { useFormatDuration } from '@/lib/use-format-duration';
import { useTheme } from '@/theme/ThemeProvider';

const MEDALS = ['🥇', '🥈', '🥉'];

export default function LeaderboardScreen() {
  const { t } = useTranslation();
  const { colors, radius, spacing } = useTheme();
  const duration = useFormatDuration();
  const { orgId } = useLocalSearchParams<{ orgId: string }>();
  const [period, setPeriod] = useState<LeaderboardPeriod>('month');
  const board = useLeaderboard(orgId, period);
  const benefit = useBenefit();
  const orgName = useMyOrganizations().data?.find((o) => o.id === orgId)?.name ?? '';

  return (
    <Screen scroll edges={['bottom']}>
      <Stack.Screen options={{ title: t('benefit.leaderboardTitle', { org: orgName }) }} />
      <ChoiceGroup<LeaderboardPeriod>
        label={t('benefit.leaderboard')}
        value={period}
        options={[
          { value: 'month', label: t('benefit.periodMonth') },
          { value: 'all', label: t('benefit.periodAll') },
        ]}
        onChange={setPeriod}
      />
      {benefit.data?.hide_from_leaderboard ? (
        <AppText tone="muted">{t('benefit.hiddenNotice')}</AppText>
      ) : null}
      <QueryState
        isLoading={board.isLoading}
        error={board.error}
        onRetry={() => void board.refetch()}
      />
      {board.data?.length === 0 ? (
        <AppText tone="muted">{t('benefit.leaderboardEmpty')}</AppText>
      ) : null}

      <Card>
        {board.data?.map((row) => (
          <View
            key={row.user_id}
            accessible
            aria-label={`${t('benefit.leaderboardRow', { place: row.place, name: row.full_name, points: row.points })}${row.is_me ? `, ${t('benefit.you')}` : ''}`}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing.md,
              padding: spacing.sm,
              borderRadius: radius.md,
              backgroundColor: row.is_me ? colors.primaryMuted : 'transparent',
            }}
          >
            <AppText variant="heading" style={{ width: 40, textAlign: 'center' }}>
              {MEDALS[row.place - 1] ?? row.place}
            </AppText>
            <View style={{ flex: 1 }}>
              <AppText variant="bodyStrong">
                {row.full_name || '—'}
                {row.is_me ? ` (${t('benefit.you')})` : ''}
              </AppText>
              <AppText variant="caption" tone="muted">
                {duration(row.minutes)}
              </AppText>
            </View>
            <AppText variant="bodyStrong">{row.points}</AppText>
          </View>
        ))}
      </Card>
    </Screen>
  );
}
