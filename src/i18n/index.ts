import { getLocales } from 'expo-localization';
import { createInstance } from 'i18next';
import { initReactI18next } from 'react-i18next';

import { FALLBACK_LANGUAGE, resolveLanguage, type Language } from './languages';
import en from './locales/en';
import kk from './locales/kk';
import ru from './locales/ru';

export const resources = {
  kk: { translation: kk },
  ru: { translation: ru },
  en: { translation: en },
} as const;

declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'translation';
    resources: { translation: typeof ru };
  }
}

export function systemLanguage(): Language {
  return resolveLanguage(getLocales().map((l) => l.languageTag ?? l.languageCode));
}

// Инициализация синхронная (ресурсы в бандле), поэтому первый рендер уже переведён.
const i18n = createInstance();
void i18n.use(initReactI18next).init({
  resources,
  lng: systemLanguage(),
  fallbackLng: FALLBACK_LANGUAGE,
  interpolation: { escapeValue: false },
  returnNull: false,
});

export default i18n;
