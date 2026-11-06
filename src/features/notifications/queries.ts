import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import { useSession } from '@/features/auth/session-store';
import { supabase } from '@/lib/supabase';

import * as api from './api';
import * as device from './device';
import { usePushState } from './push-store';
import { syncPushRegistration } from './registration';
import { targetOfPushData, type PushType } from './types';

export const notificationKeys = {
  all: ['notifications'] as const,
  list: () => [...notificationKeys.all, 'list'] as const,
  unread: () => [...notificationKeys.all, 'unread'] as const,
  muted: () => [...notificationKeys.all, 'muted'] as const,
};

export function useNotifications() {
  return useInfiniteQuery({
    queryKey: notificationKeys.list(),
    queryFn: ({ pageParam }) => api.fetchNotifications(pageParam),
    initialPageParam: null as string | null,
    getNextPageParam: (last) =>
      last.length === api.NOTIFICATIONS_PAGE ? (last.at(-1)?.created_at ?? null) : null,
  });
}

export function useUnreadCount() {
  const signedIn = useSession((s) => s.session !== null);
  return useQuery({
    queryKey: notificationKeys.unread(),
    queryFn: api.fetchUnreadCount,
    enabled: signedIn,
  });
}

export function useMarkRead() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id?: string) => api.markRead(id),
    onSettled: () => client.invalidateQueries({ queryKey: notificationKeys.all }),
  });
}

export function useMutedTypes() {
  const userId = useSession((s) => s.session?.user.id);
  return useQuery({
    queryKey: notificationKeys.muted(),
    queryFn: () => (userId ? api.fetchMutedTypes(userId) : Promise.resolve([])),
    enabled: userId !== undefined,
  });
}

export function useSaveMutedTypes() {
  const client = useQueryClient();
  const userId = useSession((s) => s.session?.user.id);
  return useMutation({
    mutationFn: (muted: PushType[]) =>
      userId ? api.saveMutedTypes(userId, muted) : Promise.resolve(),
    // Переключатель отзывается сразу; при ошибке вернётся сохранённое значение.
    onMutate: async (muted) => {
      await client.cancelQueries({ queryKey: notificationKeys.muted() });
      const previous = client.getQueryData<string[]>(notificationKeys.muted());
      client.setQueryData(notificationKeys.muted(), muted);
      return { previous };
    },
    onError: (_error, _muted, context) => {
      client.setQueryData(notificationKeys.muted(), context?.previous);
    },
    onSettled: () => client.invalidateQueries({ queryKey: notificationKeys.muted() }),
  });
}

/**
 * Всё, что нужно после входа: регистрация пушей, переход по нажатию на пуш
 * и обновление ленты в реальном времени. Вызывается один раз в layout (app).
 */
export function useNotificationsSetup() {
  const { t } = useTranslation();
  const client = useQueryClient();
  const userId = useSession((s) => s.session?.user.id);
  const channelName = t('notifications.channelName');

  useEffect(() => {
    device.configureForegroundPresentation();
  }, []);

  useEffect(() => {
    if (!userId) return;
    // Разрешение спрашиваем сразу после входа: без него не придут напоминания о квестах.
    syncPushRegistration({ ask: true, channelName }).catch(() => {
      usePushState.setState({ status: 'unknown', token: null });
    });
  }, [userId, channelName]);

  useEffect(
    () =>
      device.onNotificationTap((data) => {
        const { notificationId, href } = targetOfPushData(data);
        if (notificationId) {
          void api
            .markRead(notificationId)
            .finally(() => client.invalidateQueries({ queryKey: notificationKeys.all }));
        }
        router.push(href ?? '/notifications');
      }),
    [client],
  );

  useEffect(
    () =>
      device.onNotificationReceived(
        () => void client.invalidateQueries({ queryKey: notificationKeys.all }),
      ),
    [client],
  );

  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`notifications-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        () => void client.invalidateQueries({ queryKey: notificationKeys.all }),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [client, userId]);
}
