import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';
import type { ComponentProps } from 'react';
import { useTranslation } from 'react-i18next';

import { useUnreadCount } from '@/features/notifications/queries';
import { useTheme } from '@/theme/ThemeProvider';

type IconName = ComponentProps<typeof Ionicons>['name'];

type TabIconProps = Parameters<
  NonNullable<
    NonNullable<ComponentProps<typeof Tabs.Screen>['options']> extends infer O
      ? O extends { tabBarIcon?: infer I }
        ? I
        : never
      : never
  >
>[0];

function tabIcon(name: IconName) {
  return function TabIcon({ color, size }: TabIconProps) {
    // Навигатор передаёт цвет строкой из tabBarActiveTintColor/InactiveTintColor.
    return (
      <Ionicons name={name} size={size} color={typeof color === 'string' ? color : undefined} />
    );
  };
}

export default function AppTabsLayout() {
  const { t } = useTranslation();
  const { colors, typography } = useTheme();
  const unread = useUnreadCount().data ?? 0;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          minHeight: 64,
        },
        tabBarLabelStyle: { fontSize: typography.caption.fontSize, fontWeight: '600' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: t('tabs.quests'), tabBarIcon: tabIcon('compass-outline') }}
      />
      <Tabs.Screen
        name="my-quests"
        options={{ title: t('tabs.myQuests'), tabBarIcon: tabIcon('list-outline') }}
      />
      <Tabs.Screen
        name="benefit"
        options={{ title: t('tabs.benefit'), tabBarIcon: tabIcon('trophy-outline') }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: t('tabs.notifications'),
          tabBarIcon: tabIcon('notifications-outline'),
          tabBarBadge: unread > 0 ? (unread > 99 ? '99+' : unread) : undefined,
          tabBarBadgeStyle: { backgroundColor: colors.danger, color: colors.onDanger },
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: t('tabs.profile'), tabBarIcon: tabIcon('person-circle-outline') }}
      />
    </Tabs>
  );
}
