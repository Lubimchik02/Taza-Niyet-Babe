import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { kvStorage } from '@/lib/storage';

/**
 * Код приглашения, открытый до входа в аккаунт. Сохраняется на диск, чтобы пережить
 * онбординг и вход по коду из письма; после входа приложение само откроет приглашение.
 */
interface PendingInviteState {
  code: string | null;
  setCode: (code: string | null) => void;
}

export const usePendingInvite = create<PendingInviteState>()(
  persist(
    (set) => ({
      code: null,
      setCode: (code) => set({ code }),
    }),
    {
      name: 'taza-niyet/pending-invite',
      storage: createJSONStorage(() => kvStorage),
      partialize: ({ code }) => ({ code }),
    },
  ),
);
