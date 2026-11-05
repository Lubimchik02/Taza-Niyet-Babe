import type { PropsWithChildren } from 'react';
import { View, type ViewProps } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';

export function Card({ children, style, ...rest }: PropsWithChildren<ViewProps>) {
  const { colors, radius, spacing } = useTheme();
  return (
    <View
      style={[
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderWidth: 1,
          borderRadius: radius.lg,
          padding: spacing.lg,
          gap: spacing.md,
        },
        style,
      ]}
      {...rest}
    >
      {children}
    </View>
  );
}
