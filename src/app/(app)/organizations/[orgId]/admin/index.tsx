import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams, type Href } from 'expo-router';
import type { ComponentProps } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { useDisputes } from '@/features/admin/queries';
import { useTheme } from '@/theme/ThemeProvider';

export default function AdminPanelScreen() {
  const { t } = useTranslation();
  const { orgId } = useLocalSearchParams<{ orgId: string }>();
  const disputes = useDisputes(orgId);
  const openCount = disputes.data?.filter((d) => d.status === 'open').length ?? 0;

  const items: {
    icon: ComponentProps<typeof Ionicons>['name'];
    title: string;
    hint?: string;
    href: Href;
  }[] = [
    {
      icon: 'chatbubbles-outline',
      title: t('admin.disputes'),
      hint: t('admin.disputesOpen', { count: openCount }),
      href: { pathname: '/organizations/[orgId]/admin/disputes', params: { orgId } },
    },
    {
      icon: 'flag-outline',
      title: t('admin.tasks'),
      href: { pathname: '/organizations/[orgId]/tasks', params: { orgId } },
    },
    {
      icon: 'document-text-outline',
      title: t('admin.reports'),
      href: { pathname: '/organizations/[orgId]/admin/reports', params: { orgId } },
    },
    {
      icon: 'ribbon-outline',
      title: t('admin.certificates'),
      href: { pathname: '/organizations/[orgId]/admin/certificates', params: { orgId } },
    },
    {
      icon: 'list-outline',
      title: t('admin.audit'),
      href: { pathname: '/organizations/[orgId]/admin/audit', params: { orgId } },
    },
  ];

  return (
    <Screen scroll edges={['bottom']}>
      {items.map((item) => (
        <AdminLink key={item.title} {...item} />
      ))}
    </Screen>
  );
}

function AdminLink({
  icon,
  title,
  hint,
  href,
}: {
  icon: ComponentProps<typeof Ionicons>['name'];
  title: string;
  hint?: string;
  href: Href;
}) {
  const { colors, spacing } = useTheme();
  return (
    <Pressable
      role="button"
      aria-label={hint ? `${title}. ${hint}` : title}
      onPress={() => router.push(href)}
    >
      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
          <Ionicons name={icon} size={28} color={colors.primary} />
          <View style={{ flex: 1 }}>
            <AppText variant="heading">{title}</AppText>
            {hint ? <AppText tone="muted">{hint}</AppText> : null}
          </View>
          <Ionicons name="chevron-forward" size={22} color={colors.textMuted} />
        </View>
      </Card>
    </Pressable>
  );
}
