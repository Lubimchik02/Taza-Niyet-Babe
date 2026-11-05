import { readPublicEnv, readWebUrl } from '../env';

describe('readPublicEnv', () => {
  it('принимает корректные значения', () => {
    const result = readPublicEnv({
      EXPO_PUBLIC_SUPABASE_URL: 'http://127.0.0.1:54321',
      EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_xxx',
    });
    expect(result.ok).toBe(true);
  });

  it('перечисляет отсутствующие переменные', () => {
    const result = readPublicEnv({ EXPO_PUBLIC_SUPABASE_URL: 'not a url' });
    expect(result).toEqual({
      ok: false,
      missing: ['EXPO_PUBLIC_SUPABASE_URL', 'EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY'],
    });
  });
});

describe('readWebUrl', () => {
  it('берёт заданный адрес без завершающего слеша', () => {
    expect(readWebUrl('https://taza-niyet.kz/')).toBe('https://taza-niyet.kz');
  });

  it('без значения или с мусором — адрес dev-сервера', () => {
    expect(readWebUrl(undefined)).toBe('http://localhost:8081');
    expect(readWebUrl('not a url')).toBe('http://localhost:8081');
  });
});
