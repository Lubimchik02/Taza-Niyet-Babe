/**
 * Ошибки серверных функций БД. Функции бросают исключение с кодом P0001 и машинным
 * сообщением (например 'invite_expired'); здесь оно превращается в ключ i18n `errors.*`.
 */

export const DB_ERROR_CODES = [
  'not_authenticated',
  'not_allowed',
  'invalid_role',
  'invalid_expiry',
  'slug_taken',
  'invite_not_found',
  'invite_revoked',
  'invite_expired',
  'invite_exhausted',
  'org_not_found',
  'already_member',
  'request_exists',
  'request_closed',
  'last_admin',
] as const;

export type DbErrorCode = (typeof DB_ERROR_CODES)[number] | 'network' | 'generic';

export class DbError extends Error {
  constructor(
    public readonly code: DbErrorCode,
    cause?: unknown,
  ) {
    super(code, { cause });
    this.name = 'DbError';
  }
}

function isKnown(message: string): message is (typeof DB_ERROR_CODES)[number] {
  return (DB_ERROR_CODES as readonly string[]).includes(message);
}

export function toDbError(error: unknown): DbError {
  if (error instanceof DbError) return error;
  if (error && typeof error === 'object') {
    const { message, code } = error as { message?: unknown; code?: unknown };
    if (typeof message === 'string' && isKnown(message)) return new DbError(message, error);
    // Нарушение уникальности адреса организации, если проверка в функции не успела.
    if (code === '23505' && typeof message === 'string' && message.includes('slug')) {
      return new DbError('slug_taken', error);
    }
    if (typeof message === 'string' && /network|fetch/i.test(message)) {
      return new DbError('network', error);
    }
  }
  return new DbError('generic', error);
}

/** Ответ supabase-js: либо данные без ошибки, либо ошибка без данных. */
type SupabaseResult<T> = { data: T; error: null } | { data: null; error: object };

/** Бросает DbError, если запрос к Supabase вернул ошибку; иначе возвращает данные. */
export function unwrap<T>(result: SupabaseResult<T>): T {
  if (result.error !== null) throw toDbError(result.error);
  return result.data;
}
