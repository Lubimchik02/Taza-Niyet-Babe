/**
 * Единая очередь отметок приложения и её синхронизация: при запуске, при возвращении
 * в приложение и раз в 30 секунд, пока есть неотправленное.
 */
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useSyncExternalStore } from 'react';
import { AppState } from 'react-native';
import { create } from 'zustand';

import { sendAttendanceEvent } from './api';
import {
  createAttendanceQueue,
  type AttendanceEvent,
  type AttendanceEventKind,
  type RejectedEvent,
  type SubmitResult,
} from './offline-queue';
import { sqliteQueueStorage } from './queue-storage';

const queue = createAttendanceQueue(sqliteQueueStorage, sendAttendanceEvent);

/** Подписчики на изменение очереди (для счётчика «ждут отправки»). */
const listeners = new Set<() => void>();
let snapshot = queue.pending().length;
function notify() {
  snapshot = queue.pending().length;
  listeners.forEach((l) => l());
}

/** Последние отклонённые сервером офлайн-события — показываем человеку причину. */
export const useRejectedEvents = create<{ items: RejectedEvent[]; clear: () => void }>()((set) => ({
  items: [],
  clear: () => set({ items: [] }),
}));

function newEventId(): string {
  // RFC 4122 v4 из Math.random достаточно: это ключ идемпотентности, а не секрет.
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

export async function submitAttendance(
  kind: AttendanceEventKind,
  payload: AttendanceEvent['payload'],
): Promise<SubmitResult> {
  const result = await queue.submit({
    id: newEventId(),
    kind,
    occurredAt: new Date().toISOString(),
    payload,
    attempts: 0,
  });
  notify();
  return result;
}

export async function flushAttendance() {
  const result = await queue.flush();
  notify();
  if (result.rejected.length > 0) {
    useRejectedEvents.setState((s) => ({ items: [...s.items, ...result.rejected] }));
  }
  return result;
}

export function usePendingAttendanceCount(): number {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => snapshot,
  );
}

/** Подключается один раз в корне приложения после входа. */
export function useAttendanceSync() {
  const client = useQueryClient();
  const pending = usePendingAttendanceCount();

  useEffect(() => {
    const run = () =>
      void flushAttendance().then((r) => {
        if (r.sent > 0) void client.invalidateQueries({ queryKey: ['attendance'] });
      });
    run();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') run();
    });
    const timer = pending > 0 ? setInterval(run, 30_000) : null;
    return () => {
      sub.remove();
      if (timer) clearInterval(timer);
    };
  }, [client, pending]);
}
