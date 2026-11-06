import { useEffect, useState, type PropsWithChildren } from 'react';
import { Animated } from 'react-native';

import { useReducedMotion } from '@/lib/use-reduced-motion';

interface FadeInProps {
  /** Задержка в мс — для лёгкой «лесенки» у элементов списка. */
  delay?: number;
}

/** Появление снизу с проявлением. При «Уменьшить движение» — сразу, без анимации. */
export function FadeIn({ delay = 0, children }: PropsWithChildren<FadeInProps>) {
  const reduced = useReducedMotion();
  const [progress] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (reduced) {
      progress.setValue(1);
      return;
    }
    const animation = Animated.timing(progress, {
      toValue: 1,
      duration: 260,
      delay: Math.min(delay, 300),
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [delay, progress, reduced]);

  return (
    <Animated.View
      style={{
        opacity: progress,
        transform: [
          { translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) },
        ],
      }}
    >
      {children}
    </Animated.View>
  );
}
