/**
 * Пуши на телефоне: разрешение, канал Android, Expo push-токен, нажатия на уведомления.
 * Веб-версия — device.web.ts (браузерные пуши через Expo не поддерживаются).
 */
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { AndroidImportance, IosAuthorizationStatus } from 'expo-notifications';
import { Platform } from 'react-native';

export type PermissionState = 'granted' | 'denied' | 'undetermined';

export const pushSupported = Platform.OS === 'ios' || Platform.OS === 'android';

/** Пока приложение открыто, пуш тоже показывается баннером — так же, как свёрнутое. */
export function configureForegroundPresentation() {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

function toState(settings: Notifications.NotificationPermissionsStatus): PermissionState {
  if (settings.granted) return 'granted';
  if (settings.ios?.status === IosAuthorizationStatus.PROVISIONAL) return 'granted';
  return settings.status === 'denied' ? 'denied' : 'undetermined';
}

export async function getPermission(): Promise<PermissionState> {
  return toState(await Notifications.getPermissionsAsync());
}

/**
 * Канал создаётся до запроса токена: на Android 13+ без канала системный запрос
 * разрешения не появится. Имя канала видно в настройках телефона.
 */
export async function ensureAndroidChannel(name: string) {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync('default', {
    name,
    importance: AndroidImportance.HIGH,
  });
}

export async function requestPermission(): Promise<PermissionState> {
  return toState(await Notifications.requestPermissionsAsync());
}

function projectId(): string | null {
  const extra = Constants.expoConfig?.extra as { eas?: { projectId?: unknown } } | undefined;
  const fromExtra = extra?.eas?.projectId;
  if (typeof fromExtra === 'string' && fromExtra) return fromExtra;
  const fromEas = Constants.easConfig?.projectId;
  return typeof fromEas === 'string' && fromEas ? fromEas : null;
}

/**
 * Expo push-токен. null — пуши в этой сборке невозможны: нет projectId EAS (Expo Go,
 * локальная сборка без `eas init`) или нет связи с сервисом Expo.
 */
export async function getPushToken(): Promise<string | null> {
  const id = projectId();
  if (!id) return null;
  try {
    return (await Notifications.getExpoPushTokenAsync({ projectId: id })).data;
  } catch {
    return null;
  }
}

export function platform(): 'ios' | 'android' {
  return Platform.OS === 'ios' ? 'ios' : 'android';
}

/** Нажатие на пуш: и пока приложение работает, и когда оно запущено нажатием. */
export function onNotificationTap(handler: (data: unknown) => void): () => void {
  let cancelled = false;
  void Notifications.getLastNotificationResponseAsync().then((response) => {
    if (cancelled || !response) return;
    if (response.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER) return;
    handler(response.notification.request.content.data);
    void Notifications.clearLastNotificationResponseAsync();
  });
  const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
    if (response.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER) return;
    handler(response.notification.request.content.data);
    void Notifications.clearLastNotificationResponseAsync();
  });
  return () => {
    cancelled = true;
    subscription.remove();
  };
}

/** Пришёл пуш, пока приложение открыто. */
export function onNotificationReceived(handler: () => void): () => void {
  const subscription = Notifications.addNotificationReceivedListener(() => handler());
  return () => subscription.remove();
}
