import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { RefreshControl, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ChoiceGroup } from '@/components/ui/ChoiceGroup';
import { QueryState } from '@/components/ui/QueryState';
import type { HoursPeriod } from '@/features/benefit/api';
import { Achievements } from '@/features/benefit/components/Achievements';
import { LevelCard } from '@/features/benefit/components/LevelCard';
import { Perks } from '@/features/benefit/components/Perks';
import { SkillsRadar } from '@/features/benefit/components/SkillsRadar';
import { useBenefit, useHours } from '@/features/benefit/queries';
import { useMyOrganizations } from '@/features/organizations/queries';
import type { Language } from '@/i18n/languages';
import { useTheme } from '@/theme/ThemeProvider';
import { useFormatDuration } from '@/lib/use-format-duration';

export default function BenefitScreen() {
  const { t, i18n } = useTranslation();
  const { colors, spacing } = useTheme();
  const benefit = useBenefit();
  const orgs = useMyOrganizations();
  const [period, setPeriod] = useState<HoursPeriod>('month');
  const hours = useHours(period);
  const b = benefit.data;
  const lang = (['kk', 'ru', 'en'].includes(i18n.language) ? i18n.language : 'ru') as Language;

  const duration = useFormatDuration();

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        contentContainerStyle={{ padding: spacing.xl, gap: spacing.lg }}
        refreshControl={
          <RefreshControl
            refreshing={benefit.isRefetching}
            onRefresh={() => void Promise.all([benefit.refetch(), hours.refetch()])}
            tintColor={colors.primary}
          />
        }
      >
        <AppText variant="title">{t('benefit.title')}</AppText>
        <QueryState
          isLoading={benefit.isLoading}
          error={benefit.error}
          onRetry={() => void benefit.refetch()}
        />

        {b ? (
          <>
            {/* Главный счётчик — подтверждённые часы: то, ради чего приложение. */}
            <Card style={{ borderColor: colors.primary, borderWidth: 2 }}>
              <AppText tone="muted">{t('benefit.confirmedHours')}</AppText>
              <AppText variant="display" tone="primary">
                {duration(b.total_minutes)}
              </AppText>
              <AppText tone="muted">{t('benefit.allTime')}</AppText>
              <View style={{ flexDirection: 'row', gap: spacing.md }}>
                <Stat value={duration(b.month_minutes)} label={t('benefit.thisMonth')} />
                <Stat value={duration(b.week_minutes)} label={t('benefit.thisWeek')} />
              </View>
              <AppText tone="muted">
                {t('benefit.questsCount', { count: b.quests_count })}
                {b.avg_rating !== null
                  ? ` · ${t('benefit.avgRating', { value: b.avg_rating.toLocaleString(i18n.language, { maximumFractionDigits: 1 }) })}`
                  : ''}
              </AppText>
            </Card>

            <Card>
              <ChoiceGroup<HoursPeriod>
                label={t('benefit.hoursPeriod')}
                value={period}
                options={(['week', 'month', 'year', 'all'] as const).map((p) => ({
                  value: p,
                  label: t(`benefit.periods.${p}`),
                }))}
                onChange={setPeriod}
              />
              <AppText variant="heading" accessibilityLiveRegion="polite">
                {hours.data
                  ? `${duration(hours.data.minutes)} · ${t('benefit.questsCount', { count: hours.data.quests })}`
                  : '…'}
              </AppText>
            </Card>

            <LevelCard points={b.total_points} />
            <Button
              title={t('benefit.certificates')}
              onPress={() => router.push('/certificates')}
            />

            <Card>
              <AppText variant="heading">{t('benefit.skills')}</AppText>
              {b.skills.some((s) => s.xp > 0) ? (
                <>
                  <SkillsRadar skills={b.skills} />
                  {b.skills
                    .filter((s) => s.xp > 0)
                    .sort((x, y) => y.xp - x.xp)
                    .map((s) => (
                      <AppText key={s.code}>
                        {s.name[lang]} · {s.xp} XP
                      </AppText>
                    ))}
                </>
              ) : (
                <AppText tone="muted">{t('benefit.skillsEmpty')}</AppText>
              )}
            </Card>

            <Achievements items={b.achievements} />
            <Perks current={b.level_code} />

            {b.team_bags > 0 || b.team_area_m2 > 0 ? (
              <Card>
                <AppText variant="heading">{t('benefit.contribution')}</AppText>
                {b.team_bags > 0 ? (
                  <AppText>{t('benefit.bags', { count: b.team_bags })}</AppText>
                ) : null}
                {b.team_area_m2 > 0 ? (
                  <AppText>{t('benefit.area', { count: b.team_area_m2 })}</AppText>
                ) : null}
              </Card>
            ) : null}

            {orgs.data?.map((org) => (
              <Button
                key={org.id}
                variant="secondary"
                title={`${t('benefit.openLeaderboard')}: ${org.name}`}
                onPress={() =>
                  router.push({
                    pathname: '/organizations/[orgId]/leaderboard',
                    params: { orgId: org.id },
                  })
                }
              />
            ))}
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  const { colors, radius, spacing } = useTheme();
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.surfaceMuted,
        borderRadius: radius.md,
        padding: spacing.md,
      }}
    >
      <AppText variant="heading">{value}</AppText>
      <AppText variant="caption" tone="muted">
        {label}
      </AppText>
    </View>
  );
}
