/** Очередь отметок на устройстве — в SQLite, чтобы пережить закрытие приложения и разряд батареи. */
import { openDatabaseSync, type SQLiteDatabase } from 'expo-sqlite';

import type { AttendanceEvent, QueueStorage } from './offline-queue';

let db: SQLiteDatabase | null = null;

function database(): SQLiteDatabase {
  if (!db) {
    db = openDatabaseSync('attendance-queue.db');
    db.execSync(`
      create table if not exists events (
        id text primary key not null,
        occurred_at text not null,
        body text not null
      );
    `);
  }
  return db;
}

export const sqliteQueueStorage: QueueStorage = {
  all() {
    return database()
      .getAllSync<{ body: string }>('select body from events order by occurred_at', [])
      .map((row) => JSON.parse(row.body) as AttendanceEvent);
  },
  put(event) {
    database().runSync(
      'insert or replace into events (id, occurred_at, body) values (?, ?, ?)',
      event.id,
      event.occurredAt,
      JSON.stringify(event),
    );
  },
  remove(id) {
    database().runSync('delete from events where id = ?', id);
  },
};
