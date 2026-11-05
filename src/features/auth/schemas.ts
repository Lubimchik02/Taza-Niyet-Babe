/**
 * Схемы и нормализация для входа по OTP.
 * Модуль без зависимостей от React Native: позже его импортируют и Edge Functions.
 */
import { z } from 'zod';

export const OTP_LENGTH = 6;

export type Contact = { kind: 'email'; value: string } | { kind: 'phone'; value: string };

const emailSchema = z.email();
const e164Schema = z.string().regex(/^\+[1-9]\d{9,14}$/);

/**
 * Приводит телефон к E.164. Понимает казахстанские форматы:
 * "8 700 123 45 67", "+7 (700) 123-45-67", "77001234567".
 */
export function normalizePhone(input: string): string | null {
  const trimmed = input.trim();
  if (!/^[+\d\s()-]+$/.test(trimmed)) return null;
  let digits = trimmed.replace(/\D/g, '');
  if (!trimmed.startsWith('+')) {
    if (digits.length === 11 && digits.startsWith('8')) digits = `7${digits.slice(1)}`;
    else if (digits.length === 10) digits = `7${digits}`;
  }
  const candidate = `+${digits}`;
  return e164Schema.safeParse(candidate).success ? candidate : null;
}

/** Определяет, что ввёл пользователь: email или телефон. null — ни то ни другое. */
export function parseContact(input: string): Contact | null {
  const trimmed = input.trim();
  if (trimmed.includes('@')) {
    const email = trimmed.toLowerCase();
    return emailSchema.safeParse(email).success ? { kind: 'email', value: email } : null;
  }
  const phone = normalizePhone(trimmed);
  return phone ? { kind: 'phone', value: phone } : null;
}

export const signInFormSchema = z.object({
  contact: z.string().refine((v) => parseContact(v) !== null, { message: 'invalidContact' }),
});
export type SignInForm = z.infer<typeof signInFormSchema>;

export const otpFormSchema = z.object({
  code: z
    .string()
    .trim()
    .regex(new RegExp(`^\\d{${OTP_LENGTH}}$`), { message: 'invalidCode' }),
});
export type OtpForm = z.infer<typeof otpFormSchema>;
