import { Pressable, View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';

import { AppText } from './AppText';

interface ChoiceGroupProps<T extends string> {
  label: string;
  value: T;
  options: readonly { value: T; label: string }[];
  onChange: (value: T) => void;
}

/** Группа взаимоисключающих вариантов (аналог radio) с крупными целями касания. */
export function ChoiceGroup<T extends string>({
  label,
  value,
  options,
  onChange,
}: ChoiceGroupProps<T>) {
  const { colors, spacing, radius, touchTarget } = useTheme();

  return (
    <View style={{ gap: spacing.sm }} accessibilityRole="radiogroup" accessibilityLabel={label}>
      <AppText variant="heading">{label}</AppText>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
        {options.map((option) => {
          const selected = option.value === value;
          return (
            <Pressable
              key={option.value}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected }}
              accessibilityLabel={option.label}
              onPress={() => onChange(option.value)}
              style={{
                minHeight: touchTarget.min,
                justifyContent: 'center',
                paddingHorizontal: spacing.lg,
                borderRadius: radius.pill,
                borderWidth: 2,
                borderColor: selected ? colors.primary : colors.border,
                backgroundColor: selected ? colors.primaryMuted : colors.surface,
              }}
            >
              <AppText variant="bodyStrong" tone={selected ? 'primary' : 'default'}>
                {option.label}
              </AppText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
