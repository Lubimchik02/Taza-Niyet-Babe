import {
  createAttendanceQueue,
  memoryStorage,
  type AttendanceEvent,
  type EventSender,
} from '../offline-queue';

const event = (
  id: string,
  occurredAt: string,
  kind: AttendanceEvent['kind'] = 'check_in',
): AttendanceEvent => ({
  id,
  kind,
  occurredAt,
  payload: { token: 't', lat: 43.2, lng: 76.9 },
  attempts: 0,
});

const networkError = { message: 'TypeError: Network request failed' };

/** Сервер-заглушка: помнит события по id (как client_event_id в БД) и умеет «падать» сетью. */
function fakeServer() {
  const received = new Map<string, { kind: string; deviceTime: string | null }>();
  let online = true;
  const rejectIds = new Set<string>();
  const send: EventSender = jest.fn(async (e, deviceTime) => {
    if (!online) throw networkError;
    if (rejectIds.has(e.id)) throw { message: 'too_far', code: 'P0001' };
    // Идемпотентность сервера: повтор того же события не создаёт вторую запись.
    if (!received.has(e.id)) received.set(e.id, { kind: e.kind, deviceTime });
    return { id: e.id };
  });
  return {
    send,
    received,
    setOnline: (v: boolean) => {
      online = v;
    },
    reject: (id: string) => rejectIds.add(id),
  };
}

describe('офлайн-очередь отметок', () => {
  it('онлайн — отправляет сразу, без времени устройства (время ставит сервер)', async () => {
    const server = fakeServer();
    const queue = createAttendanceQueue(memoryStorage(), server.send);
    expect(await queue.submit(event('a', '2026-11-05T09:00:00.000Z'))).toEqual({
      status: 'sent',
      result: { id: 'a' },
    });
    expect(server.received.get('a')?.deviceTime).toBeNull();
  });

  it('без сети — сохраняет и отправляет позже с временем устройства', async () => {
    const server = fakeServer();
    const storage = memoryStorage();
    const queue = createAttendanceQueue(storage, server.send);
    server.setOnline(false);
    expect(await queue.submit(event('a', '2026-11-05T09:00:00.000Z'))).toEqual({
      status: 'queued',
    });
    expect(storage.all()).toHaveLength(1);

    server.setOnline(true);
    expect(await queue.flush()).toEqual({ sent: 1, rejected: [] });
    expect(server.received.get('a')?.deviceTime).toBe('2026-11-05T09:00:00.000Z');
    expect(storage.all()).toHaveLength(0);
  });

  it('повторная синхронизация не создаёт дублей (ответ потерялся — событие отправлено снова)', async () => {
    const server = fakeServer();
    const storage = memoryStorage([event('a', '2026-11-05T09:00:00.000Z')]);
    // Сервер принял событие, но ответ не дошёл: для клиента это ошибка сети.
    let first = true;
    const flaky: EventSender = async (e, t) => {
      await server.send(e, t);
      if (first) {
        first = false;
        throw networkError;
      }
      return {};
    };
    const queue = createAttendanceQueue(storage, flaky);
    expect((await queue.flush()).sent).toBe(0);
    expect(storage.all()).toHaveLength(1);
    expect((await queue.flush()).sent).toBe(1);
    expect(server.received.size).toBe(1);
  });

  it('отправляет по порядку: вход раньше выхода', async () => {
    const server = fakeServer();
    const order: string[] = [];
    const send: EventSender = async (e, t) => {
      order.push(e.kind);
      return server.send(e, t);
    };
    const storage = memoryStorage([
      event('out', '2026-11-05T12:00:00.000Z', 'check_out'),
      event('in', '2026-11-05T09:00:00.000Z', 'check_in'),
    ]);
    await createAttendanceQueue(storage, send).flush();
    expect(order).toEqual(['check_in', 'check_out']);
  });

  it('новое событие встаёт за уже ждущими, даже если сеть появилась', async () => {
    const server = fakeServer();
    const storage = memoryStorage([event('in', '2026-11-05T09:00:00.000Z')]);
    const queue = createAttendanceQueue(storage, server.send);
    expect(await queue.submit(event('out', '2026-11-05T12:00:00.000Z', 'check_out'))).toEqual({
      status: 'queued',
    });
    await queue.flush();
    expect([...server.received.keys()]).toEqual(['in', 'out']);
  });

  it('сеть пропала посреди отправки — остаток ждёт, порядок сохранён', async () => {
    const server = fakeServer();
    let calls = 0;
    const send: EventSender = async (e, t) => {
      calls += 1;
      if (calls === 2) throw networkError;
      return server.send(e, t);
    };
    const storage = memoryStorage([
      event('1', '2026-11-05T09:00:00.000Z'),
      event('2', '2026-11-05T10:00:00.000Z', 'check_out'),
      event('3', '2026-11-05T11:00:00.000Z'),
    ]);
    const result = await createAttendanceQueue(storage, send).flush();
    expect(result.sent).toBe(1);
    expect(
      storage
        .all()
        .map((e) => e.id)
        .sort(),
    ).toEqual(['2', '3']);
    expect(storage.all().find((e) => e.id === '2')?.attempts).toBe(1);
  });

  it('отказ сервера убирает событие из очереди и сообщает причину', async () => {
    const server = fakeServer();
    server.reject('bad');
    const storage = memoryStorage([
      event('bad', '2026-11-05T09:00:00.000Z'),
      event('ok', '2026-11-05T10:00:00.000Z'),
    ]);
    const result = await createAttendanceQueue(storage, server.send).flush();
    expect(result.sent).toBe(1);
    expect(result.rejected.map((r) => [r.event.id, r.code])).toEqual([['bad', 'too_far']]);
    expect(storage.all()).toHaveLength(0);
  });

  it('онлайн-отказ не ставит событие в очередь', async () => {
    const server = fakeServer();
    server.reject('bad');
    const storage = memoryStorage();
    const queue = createAttendanceQueue(storage, server.send);
    expect((await queue.submit(event('bad', '2026-11-05T09:00:00.000Z'))).status).toBe('rejected');
    expect(storage.all()).toHaveLength(0);
  });

  it('одновременные вызовы flush не отправляют события дважды', async () => {
    const server = fakeServer();
    const storage = memoryStorage([event('a', '2026-11-05T09:00:00.000Z')]);
    const queue = createAttendanceQueue(storage, server.send);
    await Promise.all([queue.flush(), queue.flush(), queue.flush()]);
    expect(server.send).toHaveBeenCalledTimes(1);
  });
});
