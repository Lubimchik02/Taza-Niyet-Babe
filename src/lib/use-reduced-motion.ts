import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

/**
 * Системная настройка «Уменьшить движение». Анимации приложения при ней отключаются:
 * содержимое появляется сразу, без сдвигов и пульсации.
 */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    let active = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((value) => {
        if (active) setReduced(value);
      })
      .catch(() => {});
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);
    return () => {
      active = false;
      subscription.remove();
    };
  }, []);
  return reduced;
}
