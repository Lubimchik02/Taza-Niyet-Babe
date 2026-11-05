import type { AuthChangeEvent, Session } from '@supabase/supabase-js';

import { queryClient } from '@/lib/query-client';

import { startSessionListener, useSession } from '../session-store';

type Listener = (event: AuthChangeEvent, session: Session | null) => void;
let emit: Listener = () => {};

jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: () => Promise.resolve({ data: { session: null } }),
      onAuthStateChange: (cb: Listener) => {
        emit = cb;
        return { data: { subscription: { unsubscribe: jest.fn() } } };
      },
    },
  },
}));

const sessionFor = (id: string) => ({ user: { id } }) as Session;

describe('startSessionListener', () => {
  let stop: () => void;
  beforeEach(() => {
    stop = startSessionListener();
  });
  afterEach(() => {
    stop();
    queryClient.clear();
  });

  it('очищает кэш данных, когда пользователь меняется', () => {
    emit('SIGNED_IN', sessionFor('user-a'));
    queryClient.setQueryData(['organizations', 'org-1', 'members'], ['секрет организации A']);

    emit('SIGNED_OUT', null);
    expect(queryClient.getQueryData(['organizations', 'org-1', 'members'])).toBeUndefined();
    expect(useSession.getState().session).toBeNull();
  });

  it('не трогает кэш при обновлении токена того же пользователя', () => {
    emit('SIGNED_IN', sessionFor('user-a'));
    queryClient.setQueryData(['organizations', 'mine', 'user-a'], ['Taza Qala']);

    emit('TOKEN_REFRESHED', sessionFor('user-a'));
    expect(queryClient.getQueryData(['organizations', 'mine', 'user-a'])).toEqual(['Taza Qala']);
  });
});
