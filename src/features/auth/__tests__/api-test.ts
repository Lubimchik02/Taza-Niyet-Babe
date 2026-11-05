import { AuthApiError, AuthRetryableFetchError } from '@supabase/supabase-js';

import { AuthFlowError, mapAuthError } from '../api';

describe('mapAuthError', () => {
  it('429 → rateLimited', () => {
    expect(mapAuthError(new AuthApiError('too many', 429, 'over_request_rate_limit')).code).toBe(
      'rateLimited',
    );
  });

  it('просроченный код → wrongCode', () => {
    expect(mapAuthError(new AuthApiError('expired', 403, 'otp_expired')).code).toBe('wrongCode');
  });

  it('сетевая ошибка → network', () => {
    expect(mapAuthError(new AuthRetryableFetchError('Failed to fetch', 0)).code).toBe('network');
    expect(mapAuthError(new TypeError('Network request failed')).code).toBe('network');
  });

  it('неизвестная ошибка → generic', () => {
    expect(mapAuthError(new Error('boom')).code).toBe('generic');
    expect(mapAuthError('строка').code).toBe('generic');
  });

  it('AuthFlowError пробрасывается без изменений', () => {
    const original = new AuthFlowError('notConfigured');
    expect(mapAuthError(original)).toBe(original);
  });
});
