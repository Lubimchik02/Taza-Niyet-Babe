import { z } from 'zod';

const envSchema = z.object({
  EXPO_PUBLIC_SUPABASE_URL: z.url(),
  EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
});

export type PublicEnv = z.infer<typeof envSchema>;

export type EnvResult = { ok: true; env: PublicEnv } | { ok: false; missing: string[] };

/** Проверяет публичные переменные окружения. Секретные ключи в клиент не попадают никогда. */
export function readPublicEnv(source: Record<string, string | undefined>): EnvResult {
  const parsed = envSchema.safeParse(source);
  if (parsed.success) return { ok: true, env: parsed.data };
  return { ok: false, missing: parsed.error.issues.map((i) => i.path.join('.')) };
}

// Expo подставляет EXPO_PUBLIC_* только при прямом обращении к process.env.NAME.
export const publicEnv = readPublicEnv({
  EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
  EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
});
