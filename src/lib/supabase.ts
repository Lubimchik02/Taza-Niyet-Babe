import { createClient } from '@supabase/supabase-js';
import { AppState } from 'react-native';

import { publicEnv } from './env';
import { kvStorage } from './storage';

export const isSupabaseConfigured = publicEnv.ok;

if (!publicEnv.ok && __DEV__) {
  console.warn(
    `[supabase] Не заданы переменные: ${publicEnv.missing.join(', ')}. См. .env.example`,
  );
}

// Без .env клиент создаётся с заглушкой, чтобы приложение запускалось;
// экран входа покажет понятную ошибку (isSupabaseConfigured === false).
const url = publicEnv.ok ? publicEnv.env.EXPO_PUBLIC_SUPABASE_URL : 'http://127.0.0.1:54321';
const key = publicEnv.ok ? publicEnv.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY : 'not-configured';

// TODO(этап 2): типизировать клиент сгенерированными типами БД (createClient<Database>).
export const supabase = createClient(url, key, {
  auth: {
    storage: kvStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Обновлять токен только пока приложение на экране (рекомендация Supabase для мобильных).
AppState.addEventListener('change', (state) => {
  if (state === 'active') {
    void supabase.auth.startAutoRefresh();
  } else {
    void supabase.auth.stopAutoRefresh();
  }
});
