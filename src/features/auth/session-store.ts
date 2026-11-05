import type { Session } from '@supabase/supabase-js';
import { create } from 'zustand';

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
    useSession.setState({ session, initialized: true });
  });

  return () => {
    data.subscription.unsubscribe();
    started = false;
  };
}
