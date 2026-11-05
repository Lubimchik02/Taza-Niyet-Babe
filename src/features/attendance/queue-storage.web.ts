/** Веб-версия очереди отметок: localStorage (expo-sqlite в браузере требует особых заголовков). */
import { kvStorage } from '@/lib/storage';

import type { AttendanceEvent, QueueStorage } from './offline-queue';

const KEY = 'taza-niyet/attendance-queue';

function read(): AttendanceEvent[] {
  try {
    return JSON.parse(kvStorage.getItem(KEY) ?? '[]') as AttendanceEvent[];
  } catch {
    return [];
  }
}

function write(events: AttendanceEvent[]) {
  kvStorage.setItem(KEY, JSON.stringify(events));
}

export const sqliteQueueStorage: QueueStorage = {
  all: () => read().sort((a, b) => a.occurredAt.localeCompare(b.occurredAt)),
  put: (event) => write([...read().filter((e) => e.id !== event.id), event]),
  remove: (id) => write(read().filter((e) => e.id !== id)),
};
