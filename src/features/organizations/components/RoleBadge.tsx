import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import type { OrgRole } from '@/lib/db';
import { useTheme } from '@/theme/ThemeProvider';

export function RoleBadge({ role }: { role: OrgRole }) {
  const { t } = useTranslation();
  const { colors, radius, spacing } = useTheme();
  const palette = {
    admin: { bg: colors.reward, fg: colors.onReward },
    coordinator: { bg: colors.accent, fg: colors.onAccent },
    volunteer: { bg: colors.primaryMuted, fg: colors.primary },
  }[role];

  return (
    <View
      style={{
        alignSelf: 'flex-start',
        backgroundColor: palette.bg,
        borderRadius: radius.pill,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xs,
      }}
    >
      <AppText variant="caption" style={{ color: palette.fg, fontWeight: '700' }}>
        {t(`roles.${role}`)}
      </AppText>
    </View>
  );
}
