import { ActivityIndicator, Pressable, StyleSheet, View, type PressableProps } from 'react-native';

import { useReducedMotion } from '@/lib/use-reduced-motion';
import { useTheme } from '@/theme/ThemeProvider';

import { AppText } from './AppText';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

interface ButtonProps extends Omit<PressableProps, 'children' | 'style'> {
  title: string;
  variant?: Variant;
  loading?: boolean;
  /** Подсказка для экранного чтеца, если из title неочевидно, что произойдёт. */
  hint?: string;
}

/** Крупная кнопка (56 dp): ей должно быть удобно пользоваться в перчатках. */
export function Button({
  title,
  variant = 'primary',
  loading = false,
  disabled,
  hint,
  ...rest
}: ButtonProps) {
  const { colors, radius, spacing, touchTarget } = useTheme();
  const isDisabled = disabled || loading;
  const reducedMotion = useReducedMotion();

  const palette = {
    primary: { bg: colors.primary, fg: colors.onPrimary, border: colors.primary },
    secondary: { bg: colors.surface, fg: colors.primary, border: colors.primary },
    ghost: { bg: 'transparent', fg: colors.primary, border: 'transparent' },
    danger: { bg: colors.danger, fg: colors.onDanger, border: colors.danger },
  }[variant];

  return (
    <Pressable
      role="button"
      aria-label={title}
      accessibilityHint={hint}
      aria-disabled={isDisabled}
      aria-busy={loading}
      disabled={isDisabled}
      hitSlop={8}
      style={({ pressed }) => [
        styles.base,
        {
          minHeight: touchTarget.large,
          borderRadius: radius.lg,
          paddingHorizontal: spacing.xl,
          backgroundColor: palette.bg,
          borderColor: palette.border,
          opacity: isDisabled ? 0.5 : pressed ? 0.85 : 1,
          // Нажатие чувствуется и в перчатках: кнопка слегка «утапливается».
          transform: [{ scale: pressed && !isDisabled && !reducedMotion ? 0.97 : 1 }],
        },
      ]}
      {...rest}
    >
      <View style={styles.content}>
        {loading ? <ActivityIndicator color={palette.fg} /> : null}
        <AppText variant="button" style={{ color: palette.fg }}>
          {title}
        </AppText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
});
