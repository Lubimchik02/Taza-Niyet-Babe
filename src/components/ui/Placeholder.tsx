import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
import { View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';

import { AppText } from './AppText';

interface PlaceholderProps {
  icon: ComponentProps<typeof Ionicons>['name'];
  title: string;
  body: string;
}

/** Временное пустое состояние для разделов, которые появятся на следующих этапах. */
export function Placeholder({ icon, title, body }: PlaceholderProps) {
  const { colors, spacing } = useTheme();
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md }}>
      <Ionicons name={icon} size={64} color={colors.primary} accessibilityElementsHidden />
      <AppText variant="title" align="center">
        {title}
      </AppText>
      <AppText tone="muted" align="center">
        {body}
      </AppText>
    </View>
  );
}
