import { isValidSlug, slugify } from '../slug';

describe('slugify', () => {
  it.each([
    ['Taza Qala', 'taza-qala'],
    ['Чистые Горы', 'chistye-gory'],
    ['Таза Қала', 'taza-qala'],
    ['Әділет Үйі', 'adilet-uyi'],
    ['Жасыл Ел — 2026!', 'zhasyl-el-2026'],
    ['  --Café  Almaty--  ', 'cafe-almaty'],
    ['Щука и Ёж', 'schuka-i-ezh'],
  ])('%p → %p', (input, expected) => {
    expect(slugify(input)).toBe(expected);
  });

  it('результат всегда проходит проверку БД, если не пустой', () => {
    for (const name of ['Taza Qala', 'Чистые Горы', 'Ұлы Дала', 'A1']) {
      expect(isValidSlug(slugify(name))).toBe(true);
    }
  });

  it('обрезает до 63 символов без висящего дефиса', () => {
    const slug = slugify(`${'a'.repeat(62)} b`);
    expect(slug.length).toBeLessThanOrEqual(63);
    expect(slug.endsWith('-')).toBe(false);
  });

  it('из одних символов получается пустая строка — форма покажет ошибку', () => {
    expect(slugify('!!!')).toBe('');
    expect(isValidSlug('')).toBe(false);
  });
});
