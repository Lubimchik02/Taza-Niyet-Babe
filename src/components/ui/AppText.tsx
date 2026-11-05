import { Text, type TextProps } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import type { TypographyVariant } from '@/theme/tokens';

interface AppTextProps extends TextProps {
  variant?: TypographyVariant;
  tone?: 'default' | 'muted' | 'primary' | 'danger' | 'onPrimary';
  align?: 'left' | 'center' | 'right';
}

/** Текст с типографикой темы. Масштабирование шрифта системой разрешено (доступность). */
export function AppText({
  variant = 'body',
  tone = 'default',
  align,
  style,
  ...rest
}: AppTextProps) {
  const { colors, typography } = useTheme();
  const color = {
    default: colors.text,
    muted: colors.textMuted,
    primary: colors.primary,
    danger: colors.danger,
    onPrimary: colors.onPrimary,
  }[tone];
  const isHeading = variant === 'display' || variant === 'title' || variant === 'heading';

  return (
    <Text
      accessibilityRole={isHeading ? 'header' : undefined}
      maxFontSizeMultiplier={1.6}
      style={[typography[variant], { color, textAlign: align }, style]}
      {...rest}
    />
  );
}
