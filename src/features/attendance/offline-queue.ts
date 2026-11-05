/**
 * Офлайн-очередь отметок. Если на месте уборки нет сети, отметка сохраняется на устройстве
 * с моментом события и уходит на сервер при появлении сети.
 *
 *  * Каждое событие несёт client_event_id: повторная отправка не создаёт дубль (это гарантирует
 *    сервер), поэтому событие удаляется из очереди только после ответа сервера.
 *  * События отправляются по порядку возникновения: вход раньше выхода.
 *  * Ошибка сети — событие остаётся в очереди. Отказ сервера (например, «вне радиуса») —
 *    событие уходит из очереди в список отклонённых, чтобы человек увидел причину.
 */
import { DbError, toDbError, type DbErrorCode } from '@/lib/db-errors';

export type AttendanceEventKind = 'check_in' | 'check_out' | 'manual_check_in' | 'manual_check_out';

export interface AttendanceEvent {
  /** client_event_id — ключ идемпотентности на сервере. */
  id: string;
  kind: AttendanceEventKind;
  /** Момент события на устройстве (ISO). Отправляется как device_time, только если событие ждало сети. */
  occurredAt: string;
  payload: {
    token?: string;
    lat?: number | null;
    lng?: number | null;
    questId?: string;
    userId?: string;
  };
  attempts: number;
}

export interface RejectedEvent {
  event: AttendanceEvent;
  code: DbErrorCode;
}

/** Хранилище очереди: SQLite на устройстве, память — в тестах. */
export interface QueueStorage {
  all(): AttendanceEvent[];
  put(event: AttendanceEvent): void;
  remove(id: string): void;
}

/** Отправка события на сервер; deviceTime — null для отправки «прямо сейчас». */
export type EventSender = (event: AttendanceEvent, deviceTime: string | null) => Promise<unknown>;

export type SubmitResult =
  | { status: 'sent'; result: unknown }
  | { status: 'queued' }
  | { status: 'rejected'; code: DbErrorCode };

export function isNetworkError(error: unknown): boolean {
  return toDbError(error).code === 'network';
}

export function createAttendanceQueue(storage: QueueStorage, send: EventSender) {
  let flushing: Promise<{ sent: number; rejected: RejectedEvent[] }> | null = null;

  /** Новое событие: сначала пробуем отправить сразу, без сети — в очередь. */
  async function submit(event: AttendanceEvent): Promise<SubmitResult> {
    // Если в очереди уже есть более ранние события, новое ставим за ними — порядок важен.
    if (storage.all().length > 0) {
      storage.put(event);
      void flush();
      return { status: 'queued' };
    }
    try {
      const result = await send(event, null);
      return { status: 'sent', result };
    } catch (error) {
      if (isNetworkError(error)) {
        storage.put(event);
        return { status: 'queued' };
      }
      return { status: 'rejected', code: toDbError(error).code };
    }
  }

  /** Отправляет накопленное по порядку. Параллельные вызовы ждут одну и ту же отправку. */
  function flush() {
    flushing ??= (async () => {
      let sent = 0;
      const rejected: RejectedEvent[] = [];
      const pending = [...storage.all()].sort((a, b) => a.occurredAt.localeCompare(b.occurredAt));
      for (const event of pending) {
        try {
          await send(event, event.occurredAt);
          storage.remove(event.id);
          sent += 1;
        } catch (error) {
          if (isNetworkError(error)) {
            // Сети всё ещё нет — остальное тоже не уйдёт; пробуем позже, порядок сохраняется.
            storage.put({ ...event, attempts: event.attempts + 1 });
            break;
          }
          storage.remove(event.id);
          rejected.push({ event, code: toDbError(error).code });
        }
      }
      return { sent, rejected };
    })().finally(() => {
      flushing = null;
    });
    return flushing;
  }

  return { submit, flush, pending: () => storage.all() };
}

/** Простое хранилище в памяти (тесты, веб без SQLite). */
export function memoryStorage(initial: AttendanceEvent[] = []): QueueStorage {
  const map = new Map(initial.map((e) => [e.id, e]));
  return {
    all: () => [...map.values()],
    put: (event) => void map.set(event.id, event),
    remove: (id) => void map.delete(id),
  };
}

export { DbError };
