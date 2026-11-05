import Ionicons from '@expo/vector-icons/Ionicons';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';

import { AppText } from './AppText';

interface RatingStarsProps {
  label: string;
  value: number;
  onChange?: (value: number) => void;
}

/** Оценка 1–5. Каждая звезда — цель касания 48 dp; для экранного чтеца — группа радиокнопок. */
export function RatingStars({ label, value, onChange }: RatingStarsProps) {
  const { t } = useTranslation();
  const { colors, spacing } = useTheme();
  const readOnly = !onChange;

  return (
    <View
      style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' }}
      role={readOnly ? undefined : 'radiogroup'}
      aria-label={t('attendance.ratingValue', { label, value })}
      accessible={readOnly}
    >
      <AppText variant="bodyStrong" style={{ minWidth: 110 }}>
        {label}
      </AppText>
      <View style={{ flexDirection: 'row' }}>
        {[1, 2, 3, 4, 5].map((n) => {
          const filled = n <= value;
          const star = (
            <Ionicons
              name={filled ? 'star' : 'star-outline'}
              size={readOnly ? 20 : 30}
              color={filled ? colors.reward : colors.textMuted}
            />
          );
          return readOnly ? (
            <View key={n} accessibilityElementsHidden>
              {star}
            </View>
          ) : (
            <Pressable
              key={n}
              role="radio"
              aria-checked={n === value}
              aria-label={t('attendance.star', { n })}
              onPress={() => onChange(n)}
              hitSlop={4}
              style={{
                minWidth: 48,
                minHeight: 48,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {star}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
