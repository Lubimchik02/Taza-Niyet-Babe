import { useState } from 'react';
import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';

import { AppText } from './AppText';

interface TextFieldProps extends TextInputProps {
  label: string;
  error?: string;
}

export function TextField({ label, error, onFocus, onBlur, style, ...rest }: TextFieldProps) {
  const { colors, radius, spacing, typography, touchTarget } = useTheme();
  const [focused, setFocused] = useState(false);
  const borderColor = error ? colors.danger : focused ? colors.focus : colors.border;

  return (
    <View style={{ gap: spacing.xs }}>
      <AppText variant="bodyStrong">{label}</AppText>
      <TextInput
        accessibilityLabel={label}
        accessibilityHint={error}
        placeholderTextColor={colors.textMuted}
        maxFontSizeMultiplier={1.6}
        onFocus={(e) => {
          setFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          onBlur?.(e);
        }}
        style={[
          styles.input,
          typography.body,
          {
            minHeight: touchTarget.large,
            borderRadius: radius.md,
            paddingHorizontal: spacing.lg,
            backgroundColor: colors.surface,
            color: colors.text,
            borderColor,
          },
          style,
        ]}
        {...rest}
      />
      {error ? (
        <AppText variant="caption" tone="danger" accessibilityLiveRegion="polite">
          {error}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  input: {
    borderWidth: 2,
  },
});
