import { useEffect, useState } from 'react';

/**
 * Текущее время, обновляемое по таймеру. Читать Date.now() прямо в рендере нельзя
 * (нечистая функция для React Compiler) — компонент берёт время отсюда.
 */
export function useNow(intervalMs = 60_000): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}
