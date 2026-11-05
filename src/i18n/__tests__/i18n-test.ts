import { resolveLanguage } from '../languages';
import en from '../locales/en';
import kk from '../locales/kk';
import ru from '../locales/ru';

function flatten(obj: object, prefix = ''): Record<string, string> {
  return Object.entries(obj).reduce<Record<string, string>>((acc, [key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'string') acc[path] = value;
    else Object.assign(acc, flatten(value as object, path));
    return acc;
  }, {});
}

function placeholders(text: string): string[] {
  return Array.from(text.matchAll(/\{\{(\w+)\}\}/g), (m) => m[1] ?? '').sort();
}

describe('локали', () => {
  const reference = flatten(ru);

  it.each([
    ['kk', kk],
    ['en', en],
  ])('%s содержит те же ключи и плейсхолдеры, что ru', (_name, locale) => {
    const flat = flatten(locale);
    expect(Object.keys(flat).sort()).toEqual(Object.keys(reference).sort());
    for (const [key, text] of Object.entries(flat)) {
      expect(text.trim()).not.toBe('');
      expect(placeholders(text)).toEqual(placeholders(reference[key] ?? ''));
    }
  });
});

describe('resolveLanguage', () => {
  it.each([
    [['kk-KZ'], 'kk'],
    [['ru_RU'], 'ru'],
    [['en-US', 'ru-RU'], 'en'],
    [['de-DE', 'kk'], 'kk'],
    [['de-DE'], 'ru'],
    [[], 'ru'],
    [[null, undefined, 'EN'], 'en'],
  ])('%p → %s', (locales, expected) => {
    expect(resolveLanguage(locales)).toBe(expected);
  });
});
