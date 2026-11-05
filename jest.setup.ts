// Общая настройка тестов. Нативные модули, которых нет в Jest-окружении, мокаются здесь.

jest.mock('expo-localization', () => ({
  getLocales: () => [{ languageCode: 'ru', languageTag: 'ru-RU' }],
}));

// expo-sqlite/localStorage требует нативный модуль — в тестах хватает памяти.
jest.mock('expo-sqlite/localStorage/install', () => {
  const data = new Map<string, string>();
  const memoryStorage: Storage = {
    get length() {
      return data.size;
    },
    clear: () => data.clear(),
    getItem: (key) => data.get(key) ?? null,
    key: (index) => Array.from(data.keys())[index] ?? null,
    removeItem: (key) => void data.delete(key),
    setItem: (key, value) => void data.set(key, String(value)),
  };
  Object.defineProperty(globalThis, 'localStorage', { value: memoryStorage, configurable: true });
  return {};
});
