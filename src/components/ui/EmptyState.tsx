import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
import { View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';

import { AppText } from './AppText';
import { Button } from './Button';
import { FadeIn } from './FadeIn';

interface EmptyStateProps {
  icon: ComponentProps<typeof Ionicons>['name'];
  title: string;
  body?: string;
  /** Что сделать, чтобы здесь что-то появилось. */
  action?: { title: string; onPress: () => void };
}

/** Пустой список: иконка, объяснение и следующий шаг вместо голой пустоты. */
export function EmptyState({ icon, title, body, action }: EmptyStateProps) {
  const { colors, radius, spacing } = useTheme();
  return (
    <FadeIn>
      <View
        style={{ alignItems: 'center', gap: spacing.md, paddingVertical: spacing.xl }}
        accessible={!action}
        aria-label={body ? `${title}. ${body}` : title}
      >
        <View
          style={{
            width: 88,
            height: 88,
            borderRadius: radius.pill,
            backgroundColor: colors.primaryMuted,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons
            name={icon}
            size={44}
            color={colors.primary}
            accessibilityElementsHidden
            importantForAccessibility="no"
          />
        </View>
        <AppText variant="heading" align="center">
          {title}
        </AppText>
        {body ? (
          <AppText tone="muted" align="center">
            {body}
          </AppText>
        ) : null}
        {action ? (
          <View style={{ alignSelf: 'stretch' }}>
            <Button title={action.title} onPress={action.onPress} />
          </View>
        ) : null}
      </View>
    </FadeIn>
  );
}
