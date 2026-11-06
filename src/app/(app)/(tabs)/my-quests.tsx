import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/AppText';
import { EmptyState } from '@/components/ui/EmptyState';
import { Card } from '@/components/ui/Card';
import { QueryState } from '@/components/ui/QueryState';
import type { MyQuest } from '@/features/quests/api';
import { DifficultyBadge } from '@/features/quests/components/DifficultyBadge';
import { groupMyQuests } from '@/features/quests/group';
import { useMyQuests } from '@/features/quests/queries';
import { formatQuestTime } from '@/features/quests/time';
import { useTheme } from '@/theme/ThemeProvider';

export default function MyQuestsScreen() {
  const { t } = useTranslation();
  const { colors, spacing } = useTheme();
  const mine = useMyQuests();
  const groups = groupMyQuests(mine.data ?? []);

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        contentContainerStyle={{ padding: spacing.xl, gap: spacing.lg }}
        refreshControl={
          <RefreshControl
            refreshing={mine.isRefetching}
            onRefresh={() => void mine.refetch()}
            tintColor={colors.primary}
          />
        }
      >
        <AppText variant="title">{t('tabs.myQuests')}</AppText>
        <QueryState
          isLoading={mine.isLoading}
          error={mine.error}
          onRetry={() => void mine.refetch()}
        />

        {mine.data?.length === 0 ? (
          <EmptyState
            icon="calendar-outline"
            title={t('quests.my.empty')}
            action={{ title: t('quests.my.findQuests'), onPress: () => router.navigate('/') }}
          />
        ) : null}

        <Group title={t('quests.my.active')} quests={groups.active} />
        <Group title={t('quests.my.upcoming')} quests={groups.upcoming} />
        <Group title={t('quests.my.past')} quests={groups.past} />
      </ScrollView>
    </SafeAreaView>
  );
}

function Group({ title, quests }: { title: string; quests: MyQuest[] }) {
  const { t, i18n } = useTranslation();
  const { spacing } = useTheme();
  if (quests.length === 0) return null;

  return (
    <View style={{ gap: spacing.md }}>
      <AppText variant="heading">{title}</AppText>
      {quests.map((q) => (
        <Pressable
          key={q.id}
          role="button"
          aria-label={q.title}
          onPress={() => router.push({ pathname: '/quests/[questId]', params: { questId: q.id } })}
        >
          <Card>
            <View
              style={{
                flexDirection: 'row',
                gap: spacing.sm,
                alignItems: 'center',
                flexWrap: 'wrap',
              }}
            >
              <DifficultyBadge difficulty={q.difficulty} />
              <AppText variant="caption" tone="primary" style={{ fontWeight: '700' }}>
                {q.my_status === 'waitlisted'
                  ? t('quests.my.waitlistPosition', { position: q.my_waitlist_position ?? '—' })
                  : `✓ ${t('quests.signedUp')}`}
              </AppText>
            </View>
            <AppText variant="bodyStrong">{q.title}</AppText>
            <AppText tone="muted">{formatQuestTime(q.starts_at, q.ends_at, i18n.language)}</AppText>
            <AppText tone="muted">{q.address}</AppText>
          </Card>
        </Pressable>
      ))}
    </View>
  );
}
