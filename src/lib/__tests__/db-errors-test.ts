import ru from '@/i18n/locales/ru';

import { DB_ERROR_CODES, DbError, toDbError, unwrap } from '../db-errors';

describe('toDbError', () => {
  it('распознаёт машинные коды серверных функций', () => {
    expect(toDbError({ message: 'invite_expired', code: 'P0001' }).code).toBe('invite_expired');
    expect(toDbError({ message: 'last_admin', code: 'P0001' }).code).toBe('last_admin');
  });

  it('нарушение уникальности адреса организации → slug_taken', () => {
    expect(
      toDbError({
        code: '23505',
        message: 'duplicate key value violates unique constraint "organizations_slug_key"',
      }).code,
    ).toBe('slug_taken');
  });

  it('сетевая ошибка → network', () => {
    expect(toDbError(new TypeError('Network request failed')).code).toBe('network');
  });

  it('всё остальное → generic', () => {
    expect(toDbError({ message: 'something else' }).code).toBe('generic');
    expect(toDbError(null).code).toBe('generic');
  });

  it('у каждого кода есть перевод', () => {
    for (const code of [...DB_ERROR_CODES, 'network', 'generic'] as const) {
      expect(ru.errors[code]).toBeTruthy();
    }
  });
});

describe('unwrap', () => {
  it('возвращает данные без ошибки', () => {
    expect(unwrap({ data: [1, 2], error: null })).toEqual([1, 2]);
  });

  it('бросает DbError с кодом', () => {
    expect(() => unwrap({ data: null, error: { message: 'not_allowed' } })).toThrow(DbError);
    try {
      unwrap({ data: null, error: { message: 'not_allowed' } });
    } catch (e) {
      expect((e as DbError).code).toBe('not_allowed');
    }
  });
});
