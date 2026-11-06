import { useEffect, useState, type PropsWithChildren } from 'react';
import { Animated } from 'react-native';

import { useReducedMotion } from '@/lib/use-reduced-motion';

/**
 * Короткий «щелчок» масштаба — для итога действия (отметка принята, ошибка).
 * Перезапускается при смене key у компонента. При «Уменьшить движение» — без анимации.
 */
export function PopIn({ children }: PropsWithChildren) {
  const reduced = useReducedMotion();
  const [scale] = useState(() => new Animated.Value(reduced ? 1 : 0.6));

  useEffect(() => {
    if (reduced) {
      scale.setValue(1);
      return;
    }
    const animation = Animated.spring(scale, {
      toValue: 1,
      friction: 5,
      tension: 140,
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [reduced, scale]);

  return <Animated.View style={{ transform: [{ scale }] }}>{children}</Animated.View>;
}
