import { Pressable, View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';

import { AppText } from './AppText';

interface ToggleProps {
  label: string;
  hint?: string;
  value: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}

/** Переключатель: вся строка — цель касания, для экранного чтеца — switch с состоянием. */
export function Toggle({ label, hint, value, onChange, disabled }: ToggleProps) {
  const { colors, radius, spacing, touchTarget } = useTheme();
  return (
    <Pressable
      role="switch"
      aria-checked={value}
      aria-label={label}
      aria-disabled={disabled}
      accessibilityHint={hint}
      disabled={disabled}
      onPress={() => onChange(!value)}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        minHeight: touchTarget.large,
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <View style={{ flex: 1, gap: spacing.xs }}>
        <AppText variant="bodyStrong">{label}</AppText>
        {hint ? (
          <AppText variant="caption" tone="muted">
            {hint}
          </AppText>
        ) : null}
      </View>
      <View
        style={{
          width: 56,
          height: 32,
          borderRadius: radius.pill,
          padding: 3,
          backgroundColor: value ? colors.primary : colors.border,
          alignItems: value ? 'flex-end' : 'flex-start',
        }}
      >
        <View
          style={{
            width: 26,
            height: 26,
            borderRadius: radius.pill,
            backgroundColor: colors.surface,
          }}
        />
      </View>
    </Pressable>
  );
}
