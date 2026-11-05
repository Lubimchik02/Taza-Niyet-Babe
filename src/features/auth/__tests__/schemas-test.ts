import { normalizePhone, otpFormSchema, parseContact, signInFormSchema } from '../schemas';

describe('normalizePhone', () => {
  it.each([
    ['+7 700 123 45 67', '+77001234567'],
    ['+7 (700) 123-45-67', '+77001234567'],
    ['8 700 123 45 67', '+77001234567'],
    ['87001234567', '+77001234567'],
    ['77001234567', '+77001234567'],
    ['7001234567', '+77001234567'],
    ['+44 20 7946 0958', '+442079460958'],
  ])('%s → %s', (input, expected) => {
    expect(normalizePhone(input)).toBe(expected);
  });

  it.each(['', '123', '+0 700 123 45 67', 'abc', '+7 700 abc 45 67', '+1234567890123456'])(
    'отклоняет %p',
    (input) => {
      expect(normalizePhone(input)).toBeNull();
    },
  );
});

describe('parseContact', () => {
  it('распознаёт email и приводит к нижнему регистру', () => {
    expect(parseContact('  Aru@Mail.KZ ')).toEqual({ kind: 'email', value: 'aru@mail.kz' });
  });

  it('распознаёт телефон', () => {
    expect(parseContact('8 (700) 123-45-67')).toEqual({ kind: 'phone', value: '+77001234567' });
  });

  it.each(['aru@', '@mail.kz', 'просто текст', '   '])('возвращает null для %p', (input) => {
    expect(parseContact(input)).toBeNull();
  });
});

describe('формы', () => {
  it('signInFormSchema пропускает только email/телефон', () => {
    expect(signInFormSchema.safeParse({ contact: 'a@b.kz' }).success).toBe(true);
    expect(signInFormSchema.safeParse({ contact: '+77001234567' }).success).toBe(true);
    expect(signInFormSchema.safeParse({ contact: 'nope' }).success).toBe(false);
  });

  it('otpFormSchema требует ровно 6 цифр', () => {
    expect(otpFormSchema.safeParse({ code: '123456' }).success).toBe(true);
    expect(otpFormSchema.safeParse({ code: ' 123456 ' }).success).toBe(true);
    expect(otpFormSchema.safeParse({ code: '12345' }).success).toBe(false);
    expect(otpFormSchema.safeParse({ code: '1234567' }).success).toBe(false);
    expect(otpFormSchema.safeParse({ code: '12a456' }).success).toBe(false);
  });
});
