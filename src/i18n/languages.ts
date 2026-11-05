export const SUPPORTED_LANGUAGES = ['kk', 'ru', 'en'] as const;
export type Language = (typeof SUPPORTED_LANGUAGES)[number];
export const FALLBACK_LANGUAGE: Language = 'ru';

/** Названия языков на самих этих языках — для переключателя. */
export const LANGUAGE_NAMES: Record<Language, string> = {
  kk: 'Қазақша',
  ru: 'Русский',
  en: 'English',
};

export function isLanguage(value: unknown): value is Language {
  return typeof value === 'string' && (SUPPORTED_LANGUAGES as readonly string[]).includes(value);
}

/**
 * Выбирает язык интерфейса по списку системных локалей (в порядке предпочтения).
 * Принимает коды вида "kk", "kk-KZ", "ru_RU".
 */
export function resolveLanguage(systemLocales: readonly (string | null | undefined)[]): Language {
  for (const locale of systemLocales) {
    const code = locale?.toLowerCase().split(/[-_]/)[0];
    if (isLanguage(code)) return code;
  }
  return FALLBACK_LANGUAGE;
}
