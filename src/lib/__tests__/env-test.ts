import { readPublicEnv } from '../env';

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
