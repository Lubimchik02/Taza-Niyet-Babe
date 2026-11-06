import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { RefreshControl, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { ChoiceGroup } from '@/components/ui/ChoiceGroup';
import { EmptyState } from '@/components/ui/EmptyState';
import { FadeIn } from '@/components/ui/FadeIn';
import { QueryState } from '@/components/ui/QueryState';
import { useMyOrganizations } from '@/features/organizations/queries';
import { FeedFiltersPanel } from '@/features/quests/components/FeedFiltersPanel';
import { QuestCard } from '@/features/quests/components/QuestCard';
import QuestMap from '@/features/quests/components/QuestMap';
import { applyFeedFilters, DEFAULT_FILTERS, type FeedFilters } from '@/features/quests/filters';
import { useQuestFeed } from '@/features/quests/queries';
import { useDeviceLocation } from '@/features/quests/use-device-location';
import { useTheme } from '@/theme/ThemeProvider';

type View_ = 'list' | 'map';

export default function QuestsScreen() {
  const { t } = useTranslation();
  const { colors, spacing } = useTheme();
  const orgs = useMyOrganizations();
  const feed = useQuestFeed();
  const location = useDeviceLocation();
  const [filters, setFilters] = useState<FeedFilters>(DEFAULT_FILTERS);
  const [showFilters, setShowFilters] = useState(false);
  const [view, setView] = useState<View_>('list');

  const quests = useMemo(
    () => applyFeedFilters(feed.data ?? [], filters, location.coords),
    [feed.data, filters, location.coords],
  );
  const canCreate = orgs.data?.some((o) => o.role === 'admin' || o.role === 'coordinator') ?? false;
  const noOrgs = orgs.data?.length === 0;
  const filtersActive =
    filters.difficulties.length > 0 || filters.period !== 'all' || filters.maxDistanceKm !== null;

  if (noOrgs) {
    return (
      <SafeAreaView
        edges={['top']}
        style={{
          flex: 1,
          justifyContent: 'center',
          backgroundColor: colors.background,
          padding: spacing.xl,
          gap: spacing.lg,
        }}
      >
        <EmptyState
          icon="compass-outline"
          title={t('tabs.quests')}
          body={t('placeholders.noOrganizations')}
          action={{ title: t('organizations.join'), onPress: () => router.push('/organizations') }}
        />
        <Button
          variant="secondary"
          title={t('organizations.find')}
          onPress={() => router.push('/organizations/search')}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        contentContainerStyle={{ padding: spacing.xl, gap: spacing.lg }}
        refreshControl={
          <RefreshControl
            refreshing={feed.isRefetching}
            onRefresh={() => void feed.refetch()}
            tintColor={colors.primary}
          />
        }
      >
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: spacing.md,
          }}
        >
          <AppText variant="title">{t('tabs.quests')}</AppText>
          {canCreate ? (
            <Button
              variant="secondary"
              title={t('quests.create')}
              onPress={() => router.push('/quests/new')}
            />
          ) : null}
        </View>

        <ChoiceGroup<View_>
          label={t('quests.list') + ' / ' + t('quests.map')}
          value={view}
          options={[
            { value: 'list', label: t('quests.list') },
            { value: 'map', label: t('quests.map') },
          ]}
          onChange={setView}
        />

        <Button
          variant="ghost"
          title={
            showFilters
              ? t('quests.hideFilters')
              : `${t('quests.filters')}${filtersActive ? ' •' : ''}`
          }
          onPress={() => setShowFilters((v) => !v)}
        />
        {showFilters ? (
          <FeedFiltersPanel
            value={filters}
            onChange={setFilters}
            hasLocation={location.coords !== null}
            onRequestLocation={() => void location.request()}
          />
        ) : null}

        <QueryState
          isLoading={feed.isLoading}
          error={feed.error}
          onRetry={() => void feed.refetch()}
        />

        {feed.data && quests.length === 0 ? (
          feed.data.length === 0 ? (
            <EmptyState
              icon="leaf-outline"
              title={t('quests.emptyNoQuests')}
              body={t('quests.emptyNoQuestsHint')}
            />
          ) : (
            <EmptyState
              icon="funnel-outline"
              title={t('quests.empty')}
              action={{
                title: t('quests.resetFilters'),
                onPress: () => setFilters(DEFAULT_FILTERS),
              }}
            />
          )
        ) : null}

        {view === 'map' && quests.length > 0 ? (
          <QuestMap quests={quests} origin={location.coords} />
        ) : (
          quests.map((q, index) => (
            <FadeIn key={q.id} delay={index * 40}>
              <QuestCard quest={q} />
            </FadeIn>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
