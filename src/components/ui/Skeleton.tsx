import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Animated, View, type DimensionValue } from 'react-native';

import { useReducedMotion } from '@/lib/use-reduced-motion';
import { useTheme } from '@/theme/ThemeProvider';

/** Пульсация общая для всех блоков одного скелетона — так они мерцают синхронно. */
function usePulse() {
  const reduced = useReducedMotion();
  const [value] = useState(() => new Animated.Value(1));
  useEffect(() => {
    if (reduced) {
      value.setValue(1);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(value, { toValue: 0.45, duration: 700, useNativeDriver: true }),
        Animated.timing(value, { toValue: 1, duration: 700, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [reduced, value]);
  return value;
}

function Bone({
  width,
  height,
  opacity,
}: {
  width: DimensionValue;
  height: number;
  opacity: Animated.Value;
}) {
  const { colors, radius } = useTheme();
  return (
    <Animated.View
      style={{
        width,
        height,
        borderRadius: radius.sm,
        backgroundColor: colors.border,
        opacity,
      }}
    />
  );
}

/**
 * Скелетон загрузки: серые карточки в форме будущего контента вместо крутящегося индикатора.
 * Для экранного чтеца — одна область «Загрузка…».
 */
export function SkeletonList({ rows = 3 }: { rows?: number }) {
  const { t } = useTranslation();
  const { colors, radius, spacing } = useTheme();
  const opacity = usePulse();
  return (
    <View
      role="progressbar"
      aria-busy
      aria-label={t('common.loading')}
      style={{ gap: spacing.md }}
      testID="skeleton"
    >
      {Array.from({ length: rows }, (_, index) => (
        <View
          key={index}
          importantForAccessibility="no-hide-descendants"
          accessibilityElementsHidden
          style={{
            gap: spacing.sm,
            padding: spacing.lg,
            borderRadius: radius.lg,
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.surface,
          }}
        >
          <Bone width="60%" height={18} opacity={opacity} />
          <Bone width="90%" height={14} opacity={opacity} />
          <Bone width="40%" height={14} opacity={opacity} />
        </View>
      ))}
    </View>
  );
}
