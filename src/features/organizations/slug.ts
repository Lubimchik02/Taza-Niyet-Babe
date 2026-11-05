/**
 * Адрес организации (slug) из названия: латиница, цифры, дефис — как требует БД
 * (^[a-z0-9][a-z0-9-]{1,62}$). Казахские и русские буквы транслитерируются.
 */

const TRANSLIT: Record<string, string> = {
  а: 'a',
  ә: 'a',
  б: 'b',
  в: 'v',
  г: 'g',
  ғ: 'g',
  д: 'd',
  е: 'e',
  ё: 'e',
  ж: 'zh',
  з: 'z',
  и: 'i',
  й: 'y',
  і: 'i',
  к: 'k',
  қ: 'q',
  л: 'l',
  м: 'm',
  н: 'n',
  ң: 'n',
  о: 'o',
  ө: 'o',
  п: 'p',
  р: 'r',
  с: 's',
  т: 't',
  у: 'u',
  ұ: 'u',
  ү: 'u',
  ф: 'f',
  х: 'h',
  һ: 'h',
  ц: 'ts',
  ч: 'ch',
  ш: 'sh',
  щ: 'sch',
  ъ: '',
  ы: 'y',
  ь: '',
  э: 'e',
  ю: 'yu',
  я: 'ya',
};

export const SLUG_PATTERN = /^[a-z0-9][a-z0-9-]{1,62}$/;

export function slugify(input: string): string {
  const latin = Array.from(input.toLowerCase().normalize('NFC'))
    .map((ch) => TRANSLIT[ch] ?? ch)
    .join('')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, ''); // диакритика латиницы: é → e
  return latin
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 63)
    .replace(/-+$/g, '');
}

export function isValidSlug(slug: string): boolean {
  return SLUG_PATTERN.test(slug);
}
