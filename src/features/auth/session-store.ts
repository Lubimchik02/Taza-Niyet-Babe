import type { Session } from '@supabase/supabase-js';
import { create } from 'zustand';

import { queryClient } from '@/lib/query-client';
import { supabase } from '@/lib/supabase';

interface SessionState {
  session: Session | null;
  /** true после первой проверки сохранённой сессии. */
  initialized: boolean;
}

export const useSession = create<SessionState>()(() => ({
  session: null,
  initialized: false,
}));

let started = false;

/** Подписывается на изменения авторизации. Вызывается один раз в корневом layout. */
export function startSessionListener(): () => void {
  if (started) return () => {};
  started = true;

  supabase.auth
    .getSession()
    .then(({ data }) => useSession.setState({ session: data.session, initialized: true }))
    .catch(() => useSession.setState({ session: null, initialized: true }));

  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    const previousUserId = useSession.getState().session?.user.id;
    // Сменился пользователь (выход или вход другим аккаунтом) — кэш прошлого не должен
    // показаться новому даже на мгновение.
    if (previousUserId !== session?.user.id) queryClient.clear();
    useSession.setState({ session, initialized: true });
  });

  return () => {
    data.subscription.unsubscribe();
    started = false;
  };
}
