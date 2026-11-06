import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { QueryState } from '@/components/ui/QueryState';
import { Screen } from '@/components/ui/Screen';
import { useBenefit } from '@/features/benefit/queries';
import { NotificationItem } from '@/features/notifications/components/NotificationItem';
import { PushStatusCard } from '@/features/notifications/components/PushStatusCard';
import { useMarkRead, useNotifications, useUnreadCount } from '@/features/notifications/queries';
import { targetOfRow, type NotificationRow } from '@/features/notifications/types';
import type { Language } from '@/i18n/languages';
import { useTheme } from '@/theme/ThemeProvider';

/** Лента уведомлений: то же, что приходит пушем, плюс то, что пушем не отправляется. */
export default function NotificationsScreen() {
  const { t, i18n } = useTranslation();
  const { spacing } = useTheme();
  const list = useNotifications();
  const unread = useUnreadCount();
  const markRead = useMarkRead();
  const items = list.data?.pages.flat() ?? [];
  // Названия достижений — из каталога «Моей выгоды» (уже в кэше, если вкладку открывали).
  const benefit = useBenefit();
  const lang = (['kk', 'ru', 'en'].includes(i18n.language) ? i18n.language : 'ru') as Language;
  const achievementName = (code: unknown) =>
    benefit.data?.achievements.find((a) => a.code === code)?.name[lang] ?? null;

  const open = (item: NotificationRow) => {
    if (item.read_at === null) markRead.mutate(item.id);
    const target = targetOfRow(item);
    if (target) router.push(target);
  };

  return (
    <Screen scroll edges={['top']}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
        <AppText variant="title" style={{ flex: 1 }}>
          {t('notifications.title')}
        </AppText>
      </View>

      <PushStatusCard hideWhenGranted />

      <QueryState
        isLoading={list.isLoading}
        error={list.error}
        onRetry={() => void list.refetch()}
      />
      {list.data && items.length === 0 ? (
        <EmptyState icon="notifications-outline" title={t('notifications.empty')} />
      ) : null}

      {(unread.data ?? 0) > 0 ? (
        <Button
          variant="secondary"
          title={t('notifications.markAllRead')}
          loading={markRead.isPending}
          onPress={() => markRead.mutate(undefined)}
        />
      ) : null}

      {items.length > 0 ? (
        <Card style={{ paddingVertical: 0 }}>
          {items.map((item) => (
            <NotificationItem
              key={item.id}
              item={item}
              achievementName={achievementName(item.payload.code)}
              onPress={open}
            />
          ))}
        </Card>
      ) : null}

      {list.hasNextPage ? (
        <Button
          variant="secondary"
          title={t('notifications.loadMore')}
          loading={list.isFetchingNextPage}
          onPress={() => void list.fetchNextPage()}
        />
      ) : null}

      <Button
        variant="ghost"
        title={t('notifications.settings')}
        onPress={() => router.push('/notification-settings')}
      />
    </Screen>
  );
}
