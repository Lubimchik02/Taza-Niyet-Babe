import { create } from 'zustand';

/**
 * Состояние пушей на этом устройстве.
 *  - unknown — ещё не проверяли;
 *  - granted — разрешены, токен зарегистрирован на сервере;
 *  - denied — пользователь запретил (включить можно только в настройках системы);
 *  - undetermined — ещё не спрашивали;
 *  - unavailable — пуши здесь невозможны: браузер, Expo Go, сборка без projectId EAS.
 */
export type PushStatus = 'unknown' | 'granted' | 'denied' | 'undetermined' | 'unavailable';

interface PushState {
  status: PushStatus;
  /** Expo push-токен этого устройства, зарегистрированный на текущего пользователя. */
  token: string | null;
}

export const usePushState = create<PushState>()(() => ({ status: 'unknown', token: null }));
