/**
 * Постоянное key-value хранилище на базе expo-sqlite (глобальный localStorage).
 * Рекомендуется документацией Expo для сессии Supabase; тот же expo-sqlite
 * позже понадобится для офлайн-очереди check-in/check-out.
 */
import 'expo-sqlite/localStorage/install';

export const kvStorage: Storage = globalThis.localStorage;
