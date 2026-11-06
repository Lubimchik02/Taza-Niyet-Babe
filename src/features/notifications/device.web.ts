/**
 * В браузере пушей через Expo нет: уведомления видны только в ленте приложения
 * (она обновляется в реальном времени). Интерфейс тот же, что у device.ts.
 */
export type PermissionState = 'granted' | 'denied' | 'undetermined';

export const pushSupported = false;

export function configureForegroundPresentation() {}

export async function getPermission(): Promise<PermissionState> {
  return 'denied';
}

export async function ensureAndroidChannel(_name: string) {}

export async function requestPermission(): Promise<PermissionState> {
  return 'denied';
}

export async function getPushToken(): Promise<string | null> {
  return null;
}

export function platform(): 'ios' | 'android' {
  return 'android';
}

export function onNotificationTap(_handler: (data: unknown) => void): () => void {
  return () => {};
}

export function onNotificationReceived(_handler: () => void): () => void {
  return () => {};
}
