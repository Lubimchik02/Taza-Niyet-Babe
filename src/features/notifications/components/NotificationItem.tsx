import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { useFormatDuration } from '@/lib/use-format-duration';
import { useTheme } from '@/theme/ThemeProvider';

import { notificationDetails, notificationKind, type NotificationRow } from '../types';

interface NotificationItemProps {
  item: NotificationRow;
  /** Название достижения (в уведомлении хранится только код). */
  achievementName?: string | null;
  onPress: (item: NotificationRow) => void;
}

const ROLES = ['admin', 'coordinator', 'volunteer'] as const;
type Role = (typeof ROLES)[number];

/** Строка ленты: заголовок по типу, квест, часы и баллы. Непрочитанное — с меткой. */
export function NotificationItem({ item, achievementName, onPress }: NotificationItemProps) {
  const { t, i18n } = useTranslation();
  const { colors, spacing, touchTarget } = useTheme();
  const formatDuration = useFormatDuration();

  const kind = notificationKind(item.type, item.payload);
  const key = `notifications.kinds.${kind}`;
  const title = i18n.exists(key)
    ? t(key as 'notifications.kinds.unknown')
    : t('notifications.kinds.unknown');

  const { subject, minutes, points } = notificationDetails(item);
  const role = item.payload.role;
  const lines = [
    item.type === 'dispute_resolved'
      ? t(
          item.payload.status === 'rejected'
            ? 'notifications.disputeRejected'
            : 'notifications.disputeResolved',
        )
      : null,
    subject,
    item.type === 'achievement_unlocked' ? (achievementName ?? null) : null,
    item.type === 'role_changed' && ROLES.includes(role as Role)
      ? t('notifications.newRole', { role: t(`roles.${role as Role}`) })
      : null,
    minutes !== null && item.type === 'hours_confirmed'
      ? t('notifications.hours', { duration: formatDuration(minutes) })
      : null,
    points !== null ? t('notifications.points', { points }) : null,
  ].filter((line): line is string => line !== null);

  const unread = item.read_at === null;
  const when = new Date(item.created_at).toLocaleString(i18n.language, {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
  const label = [unread ? t('notifications.unread') : null, title, ...lines, when]
    .filter(Boolean)
    .join('. ');

  return (
    <Pressable
      role="button"
      aria-label={label}
      onPress={() => onPress(item)}
      style={({ pressed }) => ({
        flexDirection: 'row',
        gap: spacing.md,
        minHeight: touchTarget.min,
        paddingVertical: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <View
        style={{
          width: 10,
          height: 10,
          marginTop: 7,
          borderRadius: 5,
          backgroundColor: unread ? colors.primary : 'transparent',
        }}
      />
      <View style={{ flex: 1, gap: 2 }}>
        <AppText variant={unread ? 'bodyStrong' : 'body'}>{title}</AppText>
        {lines.map((line) => (
          <AppText key={line} tone="muted">
            {line}
          </AppText>
        ))}
        <AppText variant="caption" tone="muted">
          {when}
        </AppText>
      </View>
    </Pressable>
  );
}
