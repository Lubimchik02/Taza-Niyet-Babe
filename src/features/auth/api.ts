import { AuthError } from '@supabase/supabase-js';

import { releasePushToken } from '@/features/notifications/registration';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';

import type { Contact } from './schemas';

/** Ключи ошибок совпадают с auth.errors.* в локалях. */
export type AuthErrorCode = 'wrongCode' | 'rateLimited' | 'network' | 'notConfigured' | 'generic';

export class AuthFlowError extends Error {
  constructor(
    public readonly code: AuthErrorCode,
    cause?: unknown,
  ) {
    super(code, { cause });
    this.name = 'AuthFlowError';
  }
}

export function mapAuthError(error: unknown): AuthFlowError {
  if (error instanceof AuthFlowError) return error;
  if (error instanceof AuthError) {
    if (error.status === 429 || error.code === 'over_request_rate_limit') {
      return new AuthFlowError('rateLimited', error);
    }
    if (error.code === 'otp_expired' || error.code === 'invalid_credentials') {
      return new AuthFlowError('wrongCode', error);
    }
    if (error.name === 'AuthRetryableFetchError' || error.status === 0) {
      return new AuthFlowError('network', error);
    }
  }
  if (error instanceof TypeError && /network|fetch/i.test(error.message)) {
    return new AuthFlowError('network', error);
  }
  return new AuthFlowError('generic', error);
}

function ensureConfigured() {
  if (!isSupabaseConfigured) throw new AuthFlowError('notConfigured');
}

/** Отправляет одноразовый код. Новый пользователь создаётся автоматически. */
export async function requestOtp(contact: Contact): Promise<void> {
  ensureConfigured();
  const { error } =
    contact.kind === 'email'
      ? await supabase.auth.signInWithOtp({
          email: contact.value,
          options: { shouldCreateUser: true },
        })
      : await supabase.auth.signInWithOtp({
          phone: contact.value,
          options: { shouldCreateUser: true },
        });
  if (error) throw mapAuthError(error);
}

export async function verifyOtp(contact: Contact, token: string): Promise<void> {
  ensureConfigured();
  const { error } =
    contact.kind === 'email'
      ? await supabase.auth.verifyOtp({ email: contact.value, token, type: 'email' })
      : await supabase.auth.verifyOtp({ phone: contact.value, token, type: 'sms' });
  if (error) throw mapAuthError(error);
}

export async function signOut(): Promise<void> {
  // Пока сессия жива: сервер должен забыть этот телефон до выхода, иначе пуши продолжат приходить.
  await releasePushToken();
  const { error } = await supabase.auth.signOut();
  if (error) throw mapAuthError(error);
}
